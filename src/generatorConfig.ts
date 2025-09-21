import fs from 'fs-extra';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import type {
    GeneratorConfig,
    LoadedGeneratorConfig,
    ResolvedGeneratorConfig,
    ResolvedPostInstallConfig,
    PostInstallConfig,
    GitConfig,
    ResolvedGitConfig,
    ReleaseType
} from './types.js';
import type { ProjectContext } from './context.js';

const execFileAsync = promisify(execFile);
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

export const DEFAULT_CONFIG_FILENAME = 'cw-package-gen.config.json';

const builtinRunCommands = [
    'npm install',
    'npm run format',
    'npm run lint -- --fix',
    'npm run prepare'
];

const builtinConfig: ResolvedGeneratorConfig = {
    modules: ['base', 'hooks', 'release'],
    postInstall: {
        dependencies: ['cw.helper.colored.console'],
        devDependencies: ['cw.helper.dev.runner'],
        run: builtinRunCommands
    },
    git: {
        initialRelease: {
            enabled: true,
            type: 'patch'
        }
    }
};

function cloneResolvedConfig(config: ResolvedGeneratorConfig): ResolvedGeneratorConfig {
    return {
        modules: config.modules.slice(),
        postInstall: {
            dependencies: config.postInstall.dependencies.slice(),
            devDependencies: config.postInstall.devDependencies.slice(),
            run: config.postInstall.run.slice()
        },
        git: {
            initialRelease: { ...config.git.initialRelease }
        }
    };
}

function ensureStringArray(value: unknown, field: string): string[] {
    if (value === undefined) {
        return [];
    }
    if (!Array.isArray(value)) {
        throw new Error(`${field} must be an array of strings.`);
    }
    const trimmed = value.map((entry) => {
        if (typeof entry !== 'string') {
            throw new Error(`${field} must contain only strings.`);
        }
        const normalized = entry.trim();
        if (!normalized) {
            throw new Error(`${field} cannot contain empty strings.`);
        }
        return normalized;
    });
    return Array.from(new Set(trimmed));
}

function normalizeRun(value: unknown): string[] {
    if (value === undefined) {
        return [];
    }
    if (typeof value === 'string') {
        return value.trim() ? [value.trim()] : [];
    }
    return ensureStringArray(value, 'postInstall.run');
}

function normalizeConfig(custom?: GeneratorConfig): ResolvedGeneratorConfig {
    const resolved = cloneResolvedConfig(builtinConfig);

    if (!custom) {
        return resolved;
    }

    if (custom.modules !== undefined) {
        resolved.modules = ensureStringArray(custom.modules, 'modules');
    }

    if (custom.postInstall) {
        resolved.postInstall = mergePostInstall(resolved.postInstall, custom.postInstall);
    }

    if (custom.git) {
        resolved.git = mergeGitConfig(resolved.git, custom.git);
    }

    return resolved;
}

function mergePostInstall(
    base: ResolvedPostInstallConfig,
    override: PostInstallConfig
): ResolvedPostInstallConfig {
    const merged: ResolvedPostInstallConfig = {
        dependencies: base.dependencies.slice(),
        devDependencies: base.devDependencies.slice(),
        run: base.run.slice()
    };

    if (Object.prototype.hasOwnProperty.call(override, 'dependencies')) {
        merged.dependencies = ensureStringArray(override.dependencies, 'postInstall.dependencies');
    }

    if (Object.prototype.hasOwnProperty.call(override, 'devDependencies')) {
        merged.devDependencies = ensureStringArray(
            override.devDependencies,
            'postInstall.devDependencies'
        );
    }

    if (Object.prototype.hasOwnProperty.call(override, 'run')) {
        merged.run = normalizeRun(override.run);
    }

    return merged;
}

const releaseTypes: ReleaseType[] = [
    'major',
    'minor',
    'patch',
    'premajor',
    'preminor',
    'prepatch',
    'prerelease'
];

const releaseTypeSet = new Set(releaseTypes);

function assertReleaseType(value: string | undefined): ReleaseType | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (!releaseTypeSet.has(value as ReleaseType)) {
        throw new Error(
            `Invalid release type: ${value}. Allowed values: ${releaseTypes.join(', ')}`
        );
    }
    return value as ReleaseType;
}

function mergeGitConfig(base: ResolvedGitConfig, override: GitConfig): ResolvedGitConfig {
    const result: ResolvedGitConfig = {
        initialRelease: { ...base.initialRelease }
    };

    if (Object.prototype.hasOwnProperty.call(override, 'initialRelease')) {
        const value = override.initialRelease;
        if (typeof value === 'boolean') {
            result.initialRelease.enabled = value;
        } else if (value && typeof value === 'object') {
            if (Object.prototype.hasOwnProperty.call(value, 'enabled')) {
                result.initialRelease.enabled = Boolean(value.enabled);
            }
            const type = assertReleaseType(value.type);
            if (type) {
                result.initialRelease.type = type;
            }
        }
    }

    return result;
}

async function readConfigFile(filePath: string): Promise<GeneratorConfig> {
    try {
        return await fs.readJson(filePath);
    } catch (error) {
        throw new Error(`Failed to read config file at ${filePath}: ${(error as Error).message}`);
    }
}

export async function loadGeneratorConfig(options: {
    configPath?: string;
    searchDir: string;
}): Promise<LoadedGeneratorConfig> {
    if (options.configPath) {
        const absolute = path.resolve(options.configPath);
        const config = normalizeConfig(await readConfigFile(absolute));
        return { config, source: 'explicit', path: absolute };
    }

    const localPath = path.join(options.searchDir, DEFAULT_CONFIG_FILENAME);
    if (await fs.pathExists(localPath)) {
        const config = normalizeConfig(await readConfigFile(localPath));
        return { config, source: 'local', path: localPath };
    }

    return { config: cloneResolvedConfig(builtinConfig), source: 'builtin' };
}

export interface ConfigOverrides {
    dependencies?: string[];
    devDependencies?: string[];
    runCommands?: string[];
    gitReleaseEnabled?: boolean;
    gitReleaseType?: ReleaseType;
}

function uniqueList(values: string[]): string[] {
    return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function applyConfigOverrides(
    config: ResolvedGeneratorConfig,
    overrides: ConfigOverrides
): void {
    if (overrides.dependencies !== undefined) {
        config.postInstall.dependencies = uniqueList(overrides.dependencies);
    }

    if (overrides.devDependencies !== undefined) {
        config.postInstall.devDependencies = uniqueList(overrides.devDependencies);
    }

    if (overrides.runCommands !== undefined) {
        config.postInstall.run = uniqueList(overrides.runCommands);
    }

    if (overrides.gitReleaseEnabled !== undefined) {
        config.git.initialRelease.enabled = overrides.gitReleaseEnabled;
    }

    if (overrides.gitReleaseType) {
        const type = assertReleaseType(overrides.gitReleaseType);
        if (type) {
            config.git.initialRelease.type = type;
        }
    }
}

export async function ensureConfigFile(
    targetDir: string,
    loaded: LoadedGeneratorConfig
): Promise<void> {
    if (loaded.source !== 'builtin') {
        return;
    }
    const destination = path.join(targetDir, DEFAULT_CONFIG_FILENAME);
    if (await fs.pathExists(destination)) {
        return;
    }
    await fs.writeJson(destination, loaded.config, { spaces: 2 });
}

function createVersionResolver(cwd: string) {
    return async (pkg: string): Promise<string> => {
        const { stdout } = await execFileAsync(npmCommand, ['view', pkg, 'version', '--json'], {
            cwd
        });
        const trimmed = stdout.trim();
        if (!trimmed) {
            throw new Error(`npm view returned empty output for ${pkg}`);
        }
        let parsed: unknown;
        try {
            parsed = JSON.parse(trimmed);
        } catch (error) {
            throw new Error(`Failed to parse npm version for ${pkg}: ${(error as Error).message}`);
        }
        if (typeof parsed === 'string') {
            return parsed;
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
            const last = parsed[parsed.length - 1];
            if (typeof last === 'string') {
                return last;
            }
        }
        throw new Error(`Unexpected npm version format for ${pkg}`);
    };
}

export async function applyPostInstallConfig(
    context: ProjectContext,
    config: ResolvedGeneratorConfig,
    options: { resolveVersion?: (pkg: string) => Promise<string> } = {}
): Promise<void> {
    const resolver = options.resolveVersion ?? createVersionResolver(context.targetDir);
    const packagesToAdd: Array<{
        type: 'dependencies' | 'devDependencies';
        name: string;
    }> = [];

    for (const name of config.postInstall.dependencies) {
        if (!context.packageJson.dependencies || !context.packageJson.dependencies[name]) {
            packagesToAdd.push({ type: 'dependencies', name });
        }
    }

    for (const name of config.postInstall.devDependencies) {
        if (!context.packageJson.devDependencies || !context.packageJson.devDependencies[name]) {
            packagesToAdd.push({ type: 'devDependencies', name });
        }
    }

    const additions: {
        dependencies: Record<string, string>;
        devDependencies: Record<string, string>;
    } = {
        dependencies: {},
        devDependencies: {}
    };

    for (const item of packagesToAdd) {
        const version = await resolver(item.name);
        const spec = `^${version}`;
        additions[item.type][item.name] = spec;
        console.log(`Adding ${item.name}@${spec} to ${item.type}`);
    }

    if (Object.keys(additions.dependencies).length > 0) {
        context.addDependencies(additions.dependencies);
    }
    if (Object.keys(additions.devDependencies).length > 0) {
        context.addDevDependencies(additions.devDependencies);
    }
}

export async function runPostInstallCommands(commands: string[], cwd: string): Promise<void> {
    for (const command of commands) {
        if (!command.trim()) {
            continue;
        }
        console.log(`\nRunning post command: ${command}`);
        await new Promise<void>((resolve, reject) => {
            const child = spawn(command, {
                cwd,
                shell: true,
                stdio: 'inherit'
            });
            child.on('error', (error) => reject(error));
            child.on('exit', (code) => {
                if (code && code !== 0) {
                    reject(new Error(`Command "${command}" exited with code ${code}`));
                } else {
                    resolve();
                }
            });
        });
    }
}

async function runCommand(command: string, args: string[], cwd: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        const child = spawn(command, args, {
            cwd,
            shell: false,
            stdio: 'inherit'
        });
        child.on('error', (error) => reject(error));
        child.on('exit', (code) => {
            if (code && code !== 0) {
                reject(new Error(`${command} exited with code ${code}`));
            } else {
                resolve();
            }
        });
    });
}

async function execGit(args: string[], cwd: string): Promise<{ stdout: string }> {
    const { stdout } = await execFileAsync('git', args, { cwd });
    return { stdout };
}

async function isGitRepository(cwd: string): Promise<boolean> {
    try {
        await execGit(['rev-parse', '--is-inside-work-tree'], cwd);
        return true;
    } catch {
        return false;
    }
}

async function hasGitRemote(cwd: string): Promise<boolean> {
    try {
        const { stdout } = await execGit(['remote'], cwd);
        const remotes = stdout
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
        return remotes.length > 0;
    } catch {
        return false;
    }
}

interface GitStatusEntry {
    code: string;
    path: string;
}

async function getGitStatus(cwd: string): Promise<GitStatusEntry[]> {
    const { stdout } = await execGit(['status', '--porcelain'], cwd);
    return stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({
            code: line.slice(0, 2),
            path: line.slice(3).trim()
        }));
}

async function runInitialRelease(cwd: string, type: ReleaseType): Promise<void> {
    const defaultMessage = 'chore: release v%s';
    await runCommand(npmCommand, ['version', type, '-m', defaultMessage], cwd);
    await runCommand('git', ['push'], cwd);
    await runCommand('git', ['push', '--tags'], cwd);
}

export async function runGitAutomation(
    cwd: string,
    config: ResolvedGeneratorConfig
): Promise<void> {
    const initial = config.git.initialRelease;
    if (!initial.enabled) {
        return;
    }

    if (!(await isGitRepository(cwd))) {
        console.log('Skipping initial release: not a git repository.');
        return;
    }

    if (!(await hasGitRemote(cwd))) {
        console.log('Skipping initial release: no git remotes configured.');
        return;
    }

    let statusEntries: GitStatusEntry[] = [];
    try {
        statusEntries = await getGitStatus(cwd);
    } catch (error) {
        console.warn(
            'Skipping initial release: failed to read git status.',
            (error as Error).message
        );
        return;
    }

    if (statusEntries.length > 0) {
        const disallowed = statusEntries.filter((entry) => entry.path !== DEFAULT_CONFIG_FILENAME);
        if (disallowed.length > 0) {
            console.warn(
                'Skipping initial release: working tree has uncommitted changes (excluding config). Commit or stash them first.'
            );
            disallowed
                .slice(0, 5)
                .forEach((entry) => console.warn(`  ${entry.code} ${entry.path}`));
            if (disallowed.length > 5) {
                console.warn(`  ... ${disallowed.length - 5} more entries`);
            }
            return;
        }

        const configEntry = statusEntries.find((entry) => entry.path === DEFAULT_CONFIG_FILENAME);
        if (configEntry) {
            console.warn(
                `Skipping initial release: config file (${DEFAULT_CONFIG_FILENAME}) has uncommitted changes. Commit it before releasing.`
            );
            return;
        }
    }

    try {
        await runInitialRelease(cwd, initial.type);
    } catch (error) {
        console.error('Initial release failed:', (error as Error).message);
    }
}
