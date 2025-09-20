import path from 'node:path';
import type { TemplateModule } from '../types.js';
import type { ProjectContext } from '../context.js';

function applyBasePackageJson(ctx: ProjectContext): void {
    const baseScripts = {
        build: 'tsc -p tsconfig.build.json',
        test: 'node --experimental-vm-modules ./node_modules/jest/bin/jest.js',
        'test:watch': 'node --experimental-vm-modules ./node_modules/jest/bin/jest.js --watch',
        'test:coverage':
            'node --experimental-vm-modules ./node_modules/jest/bin/jest.js --coverage',
        lint: 'eslint "src/**/*.ts" "tests/**/*.ts"',
        'lint:fix': 'npm run lint -- --fix',
        format: 'prettier "src/**/*.ts" "tests/**/*.ts" --write',
        'format:check': 'prettier "src/**/*.ts" "tests/**/*.ts" --check'
    };

    ctx.mergePackageJson({
        type: 'module',
        main: './dist/index.js',
        types: './dist/index.d.ts',
        exports: {
            '.': {
                types: './dist/index.d.ts',
                import: './dist/index.js'
            },
            './package.json': './package.json'
        },
        publishConfig: {
            access: 'public',
            provenance: true
        },
        files: ['dist', 'README.md', 'LICENSE'],
        sideEffects: false,
        engines: {
            node: '>=18'
        }
    });

    ctx.addScripts(baseScripts);
    ctx.addDevDependencies({
        '@eslint/js': '^9.35.0',
        '@types/jest': '^30.0.0',
        '@types/node': '^24.5.2',
        '@typescript-eslint/eslint-plugin': '^8.44.0',
        '@typescript-eslint/parser': '^8.44.0',
        eslint: '^9.35.0',
        'eslint-config-prettier': '^10.1.8',
        'eslint-plugin-prettier': '^5.5.4',
        'typescript-eslint': '^8.44.0',
        jest: '^30.1.3',
        prettier: '^3.6.2',
        'ts-jest': '^29.4.3',
        'ts-node': '^10.9.2',
        typescript: '^5.9.2'
    });

    ctx.addKeywords(['cw', 'typescript', 'library']);
}

async function copyBaseTemplates(ctx: ProjectContext): Promise<void> {
    const files = [
        '.gitignore.hbs',
        '.prettierrc.json',
        '.prettierignore',
        'eslint.config.mjs',
        'jest.config.cjs',
        'tsconfig.json',
        'tsconfig.build.json',
        'README.md.hbs',
        'DEV_NOTES.md.hbs',
        'CHANGE_LOG.md.hbs',
        path.join('src', 'index.ts.hbs'),
        path.join('tests', 'index.test.ts.hbs')
    ];

    for (const file of files) {
        await ctx.copyTemplate('base', file);
    }

    await ctx.copyTemplate('base', 'LICENSE.hbs', 'LICENSE', {
        author: ctx.packageJson.author ?? ctx.variables.packageName
    });
}

export const baseModule: TemplateModule = {
    id: 'base',
    description: 'Base TypeScript package configuration (ESM, Jest, ESLint, Prettier).',
    async apply(context) {
        applyBasePackageJson(context as ProjectContext);
        await copyBaseTemplates(context as ProjectContext);
    }
};
