import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import type { ModuleContext, PackageJson, TemplateVariables } from './types.js';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const templatesRoot = path.join(moduleDir, '..', 'templates');

function toSlug(name: string): string {
    return name.replace(/^@/, '').replace(/\//g, '-');
}

function deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>
): Record<string, unknown> {
    for (const [key, value] of Object.entries(source)) {
        const existing = target[key];
        if (Array.isArray(value)) {
            const combined = Array.isArray(existing) ? existing.slice() : [];
            for (const item of value) {
                if (!combined.includes(item)) {
                    combined.push(item);
                }
            }
            target[key] = combined;
        } else if (
            value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            !(value instanceof Date)
        ) {
            const base =
                existing && typeof existing === 'object' && !Array.isArray(existing)
                    ? (existing as Record<string, unknown>)
                    : {};
            target[key] = deepMerge(base, value as Record<string, unknown>);
        } else {
            target[key] = value as unknown;
        }
    }
    return target;
}

function sortPackageJson(pkg: PackageJson): PackageJson {
    const order = [
        'name',
        'version',
        'description',
        'type',
        'main',
        'module',
        'types',
        'exports',
        'bin',
        'files',
        'sideEffects',
        'keywords',
        'scripts',
        'dependencies',
        'devDependencies',
        'peerDependencies',
        'publishConfig',
        'engines'
    ];
    const result: PackageJson = {};
    for (const key of order) {
        if (key in pkg) {
            (result as Record<string, unknown>)[key] = pkg[key];
        }
    }
    for (const key of Object.keys(pkg)) {
        if (!order.includes(key)) {
            (result as Record<string, unknown>)[key] = pkg[key];
        }
    }
    return result;
}

export interface ProjectContextOptions {
    targetDir: string;
    packageName: string;
    description: string;
    isInit: boolean;
}

export class ProjectContext implements ModuleContext {
    readonly targetDir: string;
    readonly variables: TemplateVariables;
    readonly isInit: boolean;
    packageJson: PackageJson;

    constructor(options: ProjectContextOptions) {
        this.targetDir = options.targetDir;
        this.isInit = options.isInit;
        const pkgPath = path.join(this.targetDir, 'package.json');
        if (fs.existsSync(pkgPath)) {
            this.packageJson = fs.readJsonSync(pkgPath) as PackageJson;
        } else {
            this.packageJson = {
                name: options.packageName,
                version: '0.1.0',
                description: options.description
            };
        }
        if (!this.packageJson.name) {
            this.packageJson.name = options.packageName;
        }
        if (!this.packageJson.description) {
            this.packageJson.description = options.description;
        }

        const now = new Date();
        this.variables = {
            packageName: this.packageJson.name ?? options.packageName,
            description: this.packageJson.description ?? options.description,
            packageSlug: toSlug(this.packageJson.name ?? options.packageName),
            year: String(now.getFullYear()),
            date: now.toISOString().slice(0, 10)
        };
    }

    mergePackageJson(partial: PackageJson): void {
        this.packageJson = deepMerge(
            this.packageJson as Record<string, unknown>,
            partial as Record<string, unknown>
        ) as PackageJson;
    }

    addDependencies(deps: Record<string, string>): void {
        this.packageJson.dependencies = {
            ...(this.packageJson.dependencies ?? {}),
            ...deps
        };
    }

    addDevDependencies(deps: Record<string, string>): void {
        this.packageJson.devDependencies = {
            ...(this.packageJson.devDependencies ?? {}),
            ...deps
        };
    }

    addScripts(scripts: Record<string, string>): void {
        this.packageJson.scripts = {
            ...(this.packageJson.scripts ?? {}),
            ...scripts
        };
    }

    addKeywords(keywords: string[]): void {
        const existing = new Set(this.packageJson.keywords ?? []);
        for (const keyword of keywords) {
            existing.add(keyword);
        }
        this.packageJson.keywords = Array.from(existing);
    }

    async copyTemplate(
        moduleId: string,
        templatePath: string,
        destination?: string,
        data: Record<string, unknown> = {}
    ): Promise<void> {
        const source = path.join(templatesRoot, 'modules', moduleId, templatePath);
        let content = await fs.readFile(source, 'utf8');
        const isTemplate = templatePath.endsWith('.hbs');
        if (isTemplate) {
            const template = Handlebars.compile(content);
            content = template({ ...this.variables, ...data });
        }
        const relativeDestination =
            destination ?? (isTemplate ? templatePath.replace(/\.hbs$/, '') : templatePath);
        const target = path.join(this.targetDir, relativeDestination);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, content, 'utf8');
    }

    async save(): Promise<void> {
        this.packageJson = sortPackageJson(this.packageJson);
        const pkgPath = path.join(this.targetDir, 'package.json');
        await fs.mkdir(path.dirname(pkgPath), { recursive: true });
        await fs.writeFile(pkgPath, JSON.stringify(this.packageJson, null, 2) + '\n', 'utf8');
    }
}
