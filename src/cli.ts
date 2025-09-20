#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import { ProjectContext } from './context.js';
import { modules, getModule } from './modules/index.js';
import {
    loadGeneratorConfig,
    ensureConfigFile,
    applyPostInstallConfig,
    applyConfigOverrides,
    runPostInstallCommands,
    runGitAutomation
} from './generatorConfig.js';
import type { TemplateModule, ReleaseType } from './types.js';
import type { ConfigOverrides } from './generatorConfig.js';

const program = new Command();
const defaultModules = ['base', 'hooks', 'release'];

const packageJsonPath = fileURLToPath(new URL('../package.json', import.meta.url));
const { version: packageVersion } = fs.readJsonSync(packageJsonPath) as { version?: string };

function resolveModuleIds(ids: string[]): TemplateModule[] {
    const resolved: TemplateModule[] = [];
    for (const id of ids) {
        const mod = getModule(id.trim());
        if (!mod) {
            throw new Error(`Unknown module: ${id}`);
        }
        resolved.push(mod);
    }
    return resolved;
}

async function ensureTargetDir(dir: string, force: boolean): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
    const entries = await fs.readdir(dir);
    if (entries.length > 0 && !force) {
        throw new Error(`Target directory ${dir} is not empty. Use --force to overwrite.`);
    }
}

function parseCsvOption(value: unknown): string[] | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }
    const text = String(value).trim();
    if (text.length === 0) {
        return [];
    }
    return text
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
}

function collectRunCommands(value: string, previous: string[]): string[] {
    previous.push(value);
    return previous;
}

function buildOverrides(options: Record<string, unknown>): ConfigOverrides {
    const overrides: ConfigOverrides = {};
    const deps = parseCsvOption(options.deps);
    if (deps !== undefined) {
        overrides.dependencies = deps;
    }

    const devDeps = parseCsvOption(options.devDeps);
    if (devDeps !== undefined) {
        overrides.devDependencies = devDeps;
    }

    if (options.clearPostCommands) {
        overrides.runCommands = [];
    } else if (Array.isArray(options.postCommand) && options.postCommand.length > 0) {
        overrides.runCommands = options.postCommand as string[];
    }

    if (typeof options.gitRelease === 'boolean') {
        overrides.gitReleaseEnabled = options.gitRelease;
    }

    if (typeof options.gitReleaseType === 'string') {
        overrides.gitReleaseType = options.gitReleaseType as ReleaseType;
    }

    return overrides;
}

program
    .name('cw-package-gen')
    .description('Scaffold cw helper packages')
    .version(packageVersion ?? '0.0.0');

program
    .command('init')
    .description('Create a new package using cw templates')
    .option('-n, --name <name>', 'package name (defaults to directory name)')
    .option(
        '-d, --description <description>',
        'package description',
        'Generated with cw.helper.package.generator'
    )
    .option('-t, --target <dir>', 'target directory')
    .option('-m, --modules <modules>', 'comma separated module list (default: from config)')
    .option('--config <file>', 'path to generator config JSON')
    .option('--deps <deps>', 'comma separated dependencies to add (overrides config)')
    .option('--dev-deps <deps>', 'comma separated dev dependencies to add (overrides config)')
    .option(
        '--post-command <command>',
        'post-install command executed after scaffolding (repeatable)',
        collectRunCommands,
        []
    )
    .option('--clear-post-commands', 'skip post-install commands')
    .option('--git-release', 'enable git automation (overrides config)')
    .option('--no-git-release', 'disable git automation')
    .option('--git-release-type <type>', 'release type for git automation (default from config)')
    .option('-y, --yes', 'accept defaults without prompting')
    .option('-f, --force', 'overwrite non-empty directories')
    .action(async (options) => {
        const targetDir = path.resolve(options.target ?? options.name ?? '.');
        const packageName = options.name ?? path.basename(targetDir);
        const description: string = options.description ?? '';

        const force = Boolean(options.force);
        await ensureTargetDir(targetDir, force);

        const loadedConfig = await loadGeneratorConfig({
            configPath: options.config,
            searchDir: targetDir
        });
        const overrides = buildOverrides(options);
        applyConfigOverrides(loadedConfig.config, overrides);
        const moduleDefaults = loadedConfig.config.modules.length
            ? loadedConfig.config.modules
            : defaultModules;

        const moduleIds = options.modules
            ? String(options.modules)
                  .split(',')
                  .map((id: string) => id.trim())
                  .filter(Boolean)
            : moduleDefaults.slice();

        let selectedIds = moduleIds;
        if (!options.yes && !options.modules) {
            const answers = await inquirer.prompt([
                {
                    type: 'checkbox',
                    name: 'modules',
                    message: 'Select modules to include:',
                    choices: modules.map((mod) => ({
                        name: `${mod.id} – ${mod.description}`,
                        value: mod.id
                    })),
                    default: moduleDefaults
                }
            ]);
            selectedIds = answers.modules.length > 0 ? answers.modules : moduleDefaults;
        }

        const selectedModules = resolveModuleIds(selectedIds);
        const context = new ProjectContext({
            targetDir,
            packageName,
            description,
            isInit: true
        });

        for (const mod of selectedModules) {
            await mod.apply(context);
        }

        await applyPostInstallConfig(context, loadedConfig.config);
        await context.save();
        await ensureConfigFile(targetDir, loadedConfig);
        await runPostInstallCommands(loadedConfig.config.postInstall.run, targetDir);
        await runGitAutomation(targetDir, loadedConfig.config);

        console.log(
            `\nCreated package at ${targetDir}. Run \`cd ${path.relative(process.cwd(), targetDir)}\` and install dependencies.`
        );
    });

program.parseAsync(process.argv);
