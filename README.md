# cw.helper.package.generator

`cw.helper.package.generator` is the CLI we use to scaffold and synchronize **cw** packages with a shared toolchain. It keeps new projects aligned with our TypeScript, Jest, ESLint, Prettier, git hook, and release conventions so manual boilerplate stays out of the way.

## Table of Contents
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
  - [init](#init)
  - [sync](#sync)
- [Module Catalog](#module-catalog)
- [Template Layout](#template-layout)
- [Programmatic Usage](#programmatic-usage)
- [Development](#development)
- [Release Workflow](#release-workflow)
- [License](#license)

## Installation
Install locally when you only need the generator inside a repository:

```bash
npm install --save-dev cw.helper.package.generator
```

Or install globally to re-use it across projects:

```bash
npm install --global cw.helper.package.generator
```

The CLI entry point is `cw-package-gen` (also accessible via `npx cw-package-gen`).

## Quick Start
Create a fresh helper package in an empty directory:

```bash
mkdir cw.helper.example
cd cw.helper.example
cw-package-gen init --name cw.helper.example --description "Example helper"
npm install
```

By default `init` applies the `base`, `hooks`, and `release` modules, giving you ready-to-use tooling, git hooks, and CI workflows.

Once templates evolve you can bring an existing package back in sync:

```bash
cd cw.helper.example
cw-package-gen sync
```

Diff the changes, commit, and publish as usual.

## Commands

### init
Scaffolds a brand-new package directory.

```
cw-package-gen init [options]
```

Key options:
- `-n, --name <name>` – package name (fallback: target directory name)
- `-d, --description <text>` – npm description stored in `package.json`
- `-t, --target <dir>` – explicit destination directory (default: `.`)
- `-m, --modules <list>` – comma-separated module ids to apply (default: `base,hooks,release`)
- `-y, --yes` – skip interactive prompts and accept defaults
- `-f, --force` – allow scaffolding into a non-empty directory

Interactive mode displays each available module with a short description so you can opt in/out quickly.

### sync
Re-applies templates to an existing package. `package.json` must already be present.

```
cw-package-gen sync [options]
```

Options mirror `init` (minus `--force`). When run without `--modules` the CLI prompts for the modules to sync. `sync` never deletes custom files—review the git diff after running to decide what to keep.

## Module Catalog
Each module is self-contained and can be applied independently.

- **base** – Standard TypeScript library setup (ESM build, Jest config, Prettier/ESLint rules) plus README/DEV_NOTES/CHANGE_LOG templates, tsconfig pair, sample source/test, `.gitignore`, and MIT license. Also injects package scripts (`build`, `test`, `lint`, `format`, etc.), exports map, `publishConfig`, and the `node >= 18` engine requirement.
- **hooks** – Installs `.githooks/pre-commit` with formatting → lint → coverage checks and a `scripts/setup-hooks.cjs` helper. Adds `npm run hooks:install` and wires it into `npm run prepare` so hooks stay configured automatically.
- **release** – Provides release automation (`scripts/release.mjs`, `scripts/smoke.mjs`) and a GitHub Actions workflow (`.github/workflows/publish.yml`) that publishes to npm with provenance. Adds `npm run release` and `npm run prepublishOnly` scripts.

All modules rely on Handlebars templates under `templates/modules/<moduleId>`. You can extend the catalog by adding a new directory, exporting a module from `src/modules`, and shipping the templates alongside it.

## Template Layout
```
templates/
  modules/
    base/
      CHANGE_LOG.md.hbs
      DEV_NOTES.md.hbs
      README.md.hbs
      LICENSE.hbs
      eslint.config.mjs
      jest.config.cjs
      tsconfig*.json
      src/index.ts.hbs
      tests/index.test.ts.hbs
    hooks/
      .githooks/pre-commit.hbs
      scripts/setup-hooks.cjs.hbs
    release/
      .github/workflows/publish.yml.hbs
      scripts/release.mjs.hbs
      scripts/smoke.mjs.hbs
```

Files ending with `.hbs` are rendered through Handlebars and receive the variables exposed by `ProjectContext` (`packageName`, `description`, `packageSlug`, `year`, `date`). Non-template files are copied verbatim.

### Customising Templates
- Adjust defaults by editing the files above and re-building the package.
- Add new placeholders by updating `ProjectContext.variables` in `src/context.ts` and using them inside templates.
- To ship project-specific defaults (e.g. extra scripts) create a dedicated module and register it in `src/modules/index.ts`.

## Programmatic Usage
The package also exports the underlying primitives for custom tooling:

```ts
import { ProjectContext, modules, getModule } from 'cw.helper.package.generator';

const context = new ProjectContext({
  targetDir: '/tmp/example',
  packageName: 'cw.helper.example',
  description: 'Example helper',
  isInit: true
});

await modules[0].apply(context); // run the base module
await context.save();
```

`ProjectContext` handles `package.json` merging, dependency/scripting helpers, and template rendering. `getModule(id)` lets you resolve modules dynamically (useful when building higher-level orchestrations).

## Development
Run these commands when contributing to the generator itself:

- `npm run build` – compile TypeScript into `dist/`
- `npm run dev` – print CLI help using `ts-node` (handy while iterating)
- `npm run test` – execute Jest (uses Node’s ESM support)
- `npm run lint` / `npm run format` – ensure code quality
- `npm run test:coverage` – enforce coverage thresholds in CI
- `npm run prepare` – build and install git hooks

The project targets Node.js 18+, relies on `fs-extra` for filesystem work, `commander` for CLI parsing, `inquirer` for prompts, and Handlebars for template rendering.

## Release Workflow
`npm run release -- <type>` wraps `npm version`, commits the bump, and pushes tags. Publish automation lives in `.github/workflows/publish.yml` and expects an `NPM_TOKEN` secret with publish rights (provenance enabled). A smoke test runs prior to `npm publish` to ensure generated artifacts are installable.

## License
MIT © 2025 Mert Kurak
