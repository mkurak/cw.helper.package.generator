import { baseModule } from './base.js';
import { releaseModule } from './release.js';
import { hooksModule } from './hooks.js';
import type { TemplateModule } from '../types.js';

export const modules: TemplateModule[] = [baseModule, releaseModule, hooksModule];

export function getModule(id: string): TemplateModule | undefined {
    return modules.find((mod) => mod.id === id);
}
