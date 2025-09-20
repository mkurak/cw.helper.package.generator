import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { ProjectContext } from '../src/context.js';
import { baseModule } from '../src/modules/base.js';

describe('base module', () => {
    it('applies base package configuration', async () => {
        const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-gen-'));
        const context = new ProjectContext({
            targetDir: temp,
            packageName: 'test-package',
            description: 'Test package',
            isInit: true
        });

        await baseModule.apply(context);
        await context.save();

        const pkg = fs.readJsonSync(path.join(temp, 'package.json'));
        expect(pkg.type).toBe('module');
        expect(pkg.scripts.build).toContain('tsc');
        expect(fs.existsSync(path.join(temp, 'tsconfig.json'))).toBe(true);

        await fs.remove(temp);
    });
});
