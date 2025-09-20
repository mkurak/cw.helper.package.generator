export { ProjectContext } from './context.js';
export type {
    TemplateModule,
    ModuleContext,
    PackageJson,
    GeneratorConfig,
    PostInstallConfig,
    ResolvedGeneratorConfig,
    ResolvedPostInstallConfig,
    LoadedGeneratorConfig,
    GitConfig,
    ResolvedGitConfig,
    ReleaseType,
    InitialReleaseConfigInput,
    InitialReleaseConfig
} from './types.js';
export { modules, getModule } from './modules/index.js';
export {
    loadGeneratorConfig,
    ensureConfigFile,
    applyPostInstallConfig,
    runPostInstallCommands,
    runGitAutomation,
    DEFAULT_CONFIG_FILENAME
} from './generatorConfig.js';
