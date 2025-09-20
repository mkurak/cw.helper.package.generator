import fs from 'fs-extra';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import type {
    GeneratorConfig,
    LoadedGeneratorConfig,
    ResolvedGeneratorConfig,
    ResolvedPostInstallConfig,
    PostInstallConfig
} from './types.js';
import type { ProjectContext } from './context.js';

const execFileAsync = promisify(execFile);
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

export const DEFAULT_CONFIG_FILENAME = 'cw-package-gen.config.json';

const builtinConfig: ResolvedGeneratorConfig = {
    modules: ['base', 'hooks', 'release'],
    postInstall: {
        dependencies: ['cw.helper.colored.console'],
        devDependencies: ['cw.helper.dev.runner'],
        run: []
    }
};

function cloneResolvedConfig(config: ResolvedGeneratorConfig): ResolvedGeneratorConfig {
    return {
        modules: config.modules.slice(),
        postInstall: {
            dependencies: config.postInstall.dependencies.slice(),
            devDependencies: config.postInstall.devDependencies.slice(),
            run: config.postInstall.run.slice()
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

    const additions: { dependencies: Record<string, string>; devDependencies: Record<string, string> } = {
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
