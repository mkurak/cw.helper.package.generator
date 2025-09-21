import fs from 'fs-extra';
import path from 'node:path';
import type { TemplateModule } from '../types.js';
import type { ProjectContext } from '../context.js';

export const hooksModule: TemplateModule = {
    id: 'hooks',
    description: 'Configures git hooks and hook installation scripts.',
    async apply(context) {
        const ctx = context as ProjectContext;
        ctx.addScripts({
            'hooks:install': 'node scripts/setup-hooks.cjs',
            prepare: 'npm run build && npm run hooks:install'
        });

        const scriptsDir = path.join(ctx.targetDir, 'scripts');
        const setupPath = path.join(scriptsDir, 'setup-hooks.cjs');
        await ctx.copyTemplate('hooks', 'scripts/setup-hooks.cjs.hbs', 'scripts/setup-hooks.cjs', {
            packageSlug: ctx.variables.packageSlug
        });
        await fs.chmod(setupPath, 0o755);

        await ctx.copyTemplate(
            'hooks',
            'scripts/validate-package-metadata.cjs.hbs',
            'scripts/validate-package-metadata.cjs',
            {
                packageSlug: ctx.variables.packageSlug
            }
        );

        const hookPath = path.join(ctx.targetDir, '.githooks', 'pre-commit');
        await ctx.copyTemplate('hooks', '.githooks/pre-commit.hbs', '.githooks/pre-commit', {
            packageSlug: ctx.variables.packageSlug
        });
        await fs.chmod(hookPath, 0o755);
    }
};
