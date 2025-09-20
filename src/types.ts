export interface PackageJson {
    name?: string;
    version?: string;
    description?: string;
    type?: string;
    main?: string;
    module?: string;
    types?: string;
    exports?: Record<string, unknown>;
    bin?: Record<string, string> | string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    publishConfig?: Record<string, unknown>;
    files?: string[];
    keywords?: string[];
    sideEffects?: boolean;
    engines?: Record<string, string>;
    [key: string]: unknown;
}

export interface TemplateVariables {
    packageName: string;
    description: string;
    packageSlug: string;
    year: string;
    date: string;
}

export interface ModuleContext {
    readonly targetDir: string;
    readonly variables: TemplateVariables;
    readonly isInit: boolean;
    packageJson: PackageJson;
    mergePackageJson(partial: PackageJson): void;
    addDependencies(deps: Record<string, string>): void;
    addDevDependencies(deps: Record<string, string>): void;
    addScripts(scripts: Record<string, string>): void;
    addKeywords(keywords: string[]): void;
    copyTemplate(
        moduleId: string,
        templatePath: string,
        destination?: string,
        data?: Record<string, unknown>
    ): Promise<void>;
}

export interface TemplateModule {
    id: string;
    description: string;
    apply(context: ModuleContext): Promise<void>;
}

export interface PostInstallConfig {
    dependencies?: string[];
    devDependencies?: string[];
    run?: string | string[];
}

export interface GeneratorConfig {
    modules?: string[];
    postInstall?: PostInstallConfig;
}

export interface ResolvedPostInstallConfig {
    dependencies: string[];
    devDependencies: string[];
    run: string[];
}

export interface ResolvedGeneratorConfig {
    modules: string[];
    postInstall: ResolvedPostInstallConfig;
}

export interface LoadedGeneratorConfig {
    config: ResolvedGeneratorConfig;
    source: 'explicit' | 'local' | 'builtin';
    path?: string;
}
