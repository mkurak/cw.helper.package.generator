#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ProjectContext, modules, loadGeneratorConfig } from '../dist/index.js';

function fail(message, error) {
  console.error('[cw.helper.package.generator] Smoke test failed:', message);
  if (error) {
    console.error(error);
  }
  process.exit(1);
}

try {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-helper-package-generator-smoke-'));
  try {
    const context = new ProjectContext({
      targetDir: tmpDir,
      packageName: 'cw-smoke-package',
      description: 'Smoke test package',
      isInit: true
    });

    const baseModule = modules.find((module) => module.id === 'base');
    if (!baseModule) {
      fail('base module not found');
    }

    await baseModule.apply(context);
    await context.save();

    const pkg = JSON.parse(await fs.readFile(path.join(tmpDir, 'package.json'), 'utf8'));
    if (pkg.name !== 'cw-smoke-package') {
      fail('package.json not generated correctly');
    }

    const loaded = await loadGeneratorConfig({ searchDir: tmpDir });
    if (!loaded || !Array.isArray(loaded.config.modules)) {
      fail('loadGeneratorConfig did not return a resolved configuration');
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }

  console.log('[cw.helper.package.generator] OK: smoke test passed');
} catch (error) {
  fail('unexpected error', error);
}
