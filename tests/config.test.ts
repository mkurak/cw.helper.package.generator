import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { ProjectContext } from '../src/context.js';
import {
    loadGeneratorConfig,
    applyPostInstallConfig,
    DEFAULT_CONFIG_FILENAME,
    applyConfigOverrides
} from '../src/generatorConfig.js';

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'cw-gen-config-'));

describe('generator config loading', () => {
    it('uses builtin defaults when no config is present', async () => {
        const dir = tempDir();
        const loaded = await loadGeneratorConfig({ searchDir: dir });
        expect(loaded.source).toBe('builtin');
        expect(loaded.config.modules).toEqual(['base', 'hooks', 'release']);
        expect(loaded.config.postInstall.dependencies).toContain('cw.helper.colored.console');
        expect(loaded.config.postInstall.run).toEqual([
            'npm install',
            'npm run format',
            'npm run lint -- --fix',
            'npm run prepare'
        ]);
        expect(loaded.config.git.initialRelease).toEqual({ enabled: true, type: 'patch' });
        fs.removeSync(dir);
    });

    it('reads local config file if present', async () => {
        const dir = tempDir();
        const configPath = path.join(dir, DEFAULT_CONFIG_FILENAME);
        await fs.writeJson(configPath, {
            modules: ['base'],
            postInstall: {
                dependencies: ['lodash'],
                devDependencies: [],
                run: 'npm run lint'
            },
            git: {
                initialRelease: {
                    enabled: false,
                    type: 'minor'
                }
            }
        });

        const loaded = await loadGeneratorConfig({ searchDir: dir });
        expect(loaded.source).toBe('local');
        expect(loaded.config.modules).toEqual(['base']);
        expect(loaded.config.postInstall.dependencies).toEqual(['lodash']);
        expect(loaded.config.postInstall.run).toEqual(['npm run lint']);
        expect(loaded.config.git.initialRelease).toEqual({ enabled: false, type: 'minor' });
        fs.removeSync(dir);
    });
});

describe('post install application', () => {
    it('injects dependencies using resolved versions', async () => {
        const dir = tempDir();
        const context = new ProjectContext({
            targetDir: dir,
            packageName: 'test-package',
            description: 'Test package',
            isInit: true
        });

        const config = {
            modules: ['base'],
            postInstall: {
                dependencies: ['dep-one'],
                devDependencies: ['dep-two'],
                run: []
            }
        };

        const versions: Record<string, string> = {
            'dep-one': '1.2.3',
            'dep-two': '4.5.6'
        };

        await applyPostInstallConfig(context, config, {
            resolveVersion: async (name: string) => versions[name]
        });

        expect(context.packageJson.dependencies).toEqual({ 'dep-one': '^1.2.3' });
        expect(context.packageJson.devDependencies).toEqual({ 'dep-two': '^4.5.6' });

        fs.removeSync(dir);
    });
});

describe('applyConfigOverrides', () => {
    it('overrides dependency lists, commands, and git automation flags', async () => {
        const dir = tempDir();
        const loaded = await loadGeneratorConfig({ searchDir: dir });

        applyConfigOverrides(loaded.config, {
            dependencies: ['foo'],
            devDependencies: [],
            runCommands: ['npm run custom'],
            gitReleaseEnabled: false,
            gitReleaseType: 'minor'
        });

        expect(loaded.config.postInstall.dependencies).toEqual(['foo']);
        expect(loaded.config.postInstall.devDependencies).toEqual([]);
        expect(loaded.config.postInstall.run).toEqual(['npm run custom']);
        expect(loaded.config.git.initialRelease).toEqual({ enabled: false, type: 'minor' });

        fs.removeSync(dir);
    });
});
