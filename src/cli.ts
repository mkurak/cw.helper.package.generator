#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import { ProjectContext } from './context.js';
import { modules, getModule } from './modules/index.js';
import type { TemplateModule } from './types.js';

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

program
    .name('cw-package-gen')
    .description('Scaffold and synchronize cw helper packages')
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
    .option('-m, --modules <modules>', 'comma separated module list (default: base,hooks,release)')
    .option('-y, --yes', 'accept defaults without prompting')
    .option('-f, --force', 'overwrite non-empty directories')
    .action(async (options) => {
        const targetDir = path.resolve(options.target ?? options.name ?? '.');
        const packageName = options.name ?? path.basename(targetDir);
        const description: string = options.description ?? '';

        const force = Boolean(options.force);
        await ensureTargetDir(targetDir, force);

        const moduleIds = options.modules
            ? String(options.modules)
                  .split(',')
                  .map((id: string) => id.trim())
                  .filter(Boolean)
            : defaultModules.slice();

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
                    default: defaultModules
                }
            ]);
            selectedIds = answers.modules.length > 0 ? answers.modules : defaultModules;
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

        await context.save();

        console.log(
            `\nCreated package at ${targetDir}. Run \`cd ${path.relative(process.cwd(), targetDir)}\` and install dependencies.`
        );
    });

program
    .command('sync')
    .description('Synchronize an existing package with cw templates')
    .option('-t, --target <dir>', 'target directory (default: current directory)')
    .option('-m, --modules <modules>', 'comma separated module list (default: base,hooks,release)')
    .option('-y, --yes', 'accept defaults without prompting')
    .action(async (options) => {
        const targetDir = path.resolve(options.target ?? '.');
        const pkgPath = path.join(targetDir, 'package.json');
        if (!fs.existsSync(pkgPath)) {
            throw new Error(`No package.json found at ${pkgPath}`);
        }

        const moduleIds = options.modules
            ? String(options.modules)
                  .split(',')
                  .map((id: string) => id.trim())
                  .filter(Boolean)
            : defaultModules.slice();

        let selectedIds = moduleIds;
        if (!options.yes && !options.modules) {
            const answers = await inquirer.prompt([
                {
                    type: 'checkbox',
                    name: 'modules',
                    message: 'Select modules to synchronize:',
                    choices: modules.map((mod) => ({
                        name: `${mod.id} – ${mod.description}`,
                        value: mod.id
                    })),
                    default: moduleIds
                }
            ]);
            selectedIds = answers.modules.length > 0 ? answers.modules : moduleIds;
        }

        const selectedModules = resolveModuleIds(selectedIds);
        const existing = await fs.readJson(pkgPath);
        const context = new ProjectContext({
            targetDir,
            packageName: existing.name ?? path.basename(targetDir),
            description: existing.description ?? '',
            isInit: false
        });

        for (const mod of selectedModules) {
            await mod.apply(context);
        }

        await context.save();
        console.log(`\nSynchronized ${targetDir}. Review changes before committing.`);
    });

program.parseAsync(process.argv);
