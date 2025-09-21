import fs from 'fs-extra';
import path from 'node:path';
import type { TemplateModule } from '../types.js';
import type { ProjectContext } from '../context.js';

export const releaseModule: TemplateModule = {
    id: 'release',
    description: 'Adds smoke test script and GitHub publishing workflow.',
    async apply(context) {
        const ctx = context as ProjectContext;
        ctx.addScripts({
            prepublishOnly: 'npm run build && node scripts/smoke.mjs'
        });

        const smokePath = path.join(ctx.targetDir, 'scripts', 'smoke.mjs');
        await ctx.copyTemplate('release', 'scripts/smoke.mjs.hbs', 'scripts/smoke.mjs', {
            packageSlug: ctx.variables.packageSlug
        });
        await fs.chmod(smokePath, 0o755);
        await ctx.copyTemplate(
            'release',
            '.github/workflows/publish.yml.hbs',
            '.github/workflows/publish.yml'
        );
    }
};
