# Developer Notes — cw.helper.package.generator

> Quick refresher for future sessions when conversation history is missing.

## Overview
- Package delivers the `cw-package-gen` CLI that scaffolds and syncs helper packages using shared templates.
- Templates live under `templates/modules/*`; each module exports an `apply` method that mutates `ProjectContext`.
- `ProjectContext` owns template variables, package.json merging, and file writes; run `context.save()` once modules finish.

## CLI & Flow
- Entry point: `src/cli.ts` (compiled to `dist/cli.js` with shebang) using `commander` for command/option parsing.
- Two commands: `init` (creates new package) and `sync` (updates existing). Both resolve module IDs → `TemplateModule` instances via `getModule`.
- Interactive module selection uses `inquirer` unless `--yes` or explicit `--modules` is provided.
- `ensureTargetDir` prevents scaffolding into non-empty directories unless `--force` is passed.

## Generator Config
- Config loader lives in `src/generatorConfig.ts`; exported helpers handle locating, normalising, and persisting `cw-package-gen.config.json`.
- Search order: CLI `--config <path>` → target dir (`DEFAULT_CONFIG_FILENAME`) → builtin defaults. When builtin kullanılırsa `ensureConfigFile` hedefe varsayılan dosyayı yazar.
- Defaults include applying `base/hooks/release`, ek `cw.helper.colored.console` dependencies, `cw.helper.dev.runner` dev dependencies, ve post komutları (`npm install`, `npm run format`, `npm run lint -- --fix`, `npm run prepare`).
- `applyPostInstallConfig` sorgulanan paketler için `npm view <pkg> version --json` çağırarak son sürümü bulur, `^` prefiksiyle `ProjectContext` içine ekler (varsa olduğu gibi bırakır). Testler mock resolver ile çalışır.
- `runPostInstallCommands` `postInstall.run` listesini shell üzerinden sırasıyla çalıştırır (komut fail ederse süreç durur).
- `runGitAutomation` git repo + remote varsa ve temizse `npm run release -- <type>` tetikler; config dosyası dışındaki uncommitted değişiklikler bulunursa kullanıcıyı uyarıp adımı atlar.
- CLI katmanında `--deps`, `--dev-deps`, `--post-command`, `--git-release`, `--git-release-type` gibi seçenekler konfig üzerindeki alanları doğrudan override eder.

## ProjectContext
- Constructed with `{ targetDir, packageName, description, isInit }`. It loads or bootstraps `package.json`.
- Template variables exposed to Handlebars: `packageName`, `description`, `packageSlug`, `year`, `date`.
- `mergePackageJson` performs a deep merge with deduplicated arrays; order of fields is normalised by `sortPackageJson` before saving.
- Helpers: `addDependencies`, `addDevDependencies`, `addScripts`, `addKeywords` for declarative module mutations.
- `copyTemplate` resolves template files relative to `templates/modules/<moduleId>` and writes them to the target (rendering `.hbs`).

## Module Details
- `base` (`src/modules/base.ts`) injects TypeScript/Jest/ESLint/Prettier scripts, exports map, and copies core boilerplate (README, DEV_NOTES, CHANGE_LOG, tsconfig pair, sample src/tests, license, ignores).
- `hooks` sets up `.githooks/pre-commit`/`.githooks/post-commit` plus `scripts/setup-hooks.cjs`; chmod is applied to keep scripts executable.
- Pre-commit runs format → metadata validation (`scripts/validate-package-metadata.cjs`) → lint → coverage. Missing repository/bugs/homepage URLs abort the commit.
- Post-commit auto-tags the commit when `package.json` introduces a version bump on `master`/`main`, hinting the user to push with `--follow-tags`.
- `release` installs release/smoke scripts, registers `npm run release` & `npm run prepublishOnly`, and drops `.github/workflows/publish.yml`.
- Module order inside `modules` array (`base`, `release`, `hooks`) controls default prompt ordering.

## Templates
- Handlebars templates can access `{{packageSlug}}` for slugified names and `{{date}}` for current ISO date.
- When adding placeholders update `ProjectContext.variables` and provide sensible fallbacks to avoid breaking sync.
- Non-template files (no `.hbs`) are copied exactly—useful for static config like `eslint.config.mjs`.
- Escape literal moustaches with {{"{{"}} / {{"}}"}} when GitHub Actions syntax must be emitted verbatim (e.g. `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`).

## Tooling & Scripts
- Builds target Node.js 18+, pure ESM output. `tsconfig.build.json` emits declarations and `.js` files into `dist/`.
- `npm run dev` uses `ts-node-esm` to run the CLI with live TypeScript.
- ESLint 9 flat config + Prettier; coverage enforced via `npm run test:coverage` (Jest ESM mode with `ts-jest`).
- Prepare hook runs `build` then `hooks:install`, ensuring generator itself has git hooks active.

## Testing
- Current Jest coverage: `tests/base.test.ts` validates base module scaffolding end-to-end in a temp directory.
- Add more module-level tests when behaviour grows (e.g. release workflow sync smoke test, hooks permissions).
- Prefer using `fs-extra` helpers with tmp dirs to keep tests isolated and avoid polluting repo.

## Release & Publishing
- `npm run release -- <type>` wraps `npm version`, pushes commits/tags automatically, and logs output with package slug.
- Publishing expects GitHub Actions workflow generated by the release module; local `npm publish` should run `npm run build && node scripts/smoke.mjs` first.
- `publishConfig.provenance: true`; set `NPM_CONFIG_PROVENANCE=false` when doing manual local publishes without provenance support.

## Maintenance Tips
- Keep dependency ranges aligned with downstream templates to avoid mismatched tooling versions after `sync`.
- Whenever templates change, run `cw-package-gen sync` against active helper packages to propagate updates.
- Document any non-obvious behaviour in this file so future chats can pick up quickly.

## Future Ideas
- Add a `docs` module that drops default README/Dev Notes variants for docs-heavy packages.
- Offer a dry-run flag to print planned changes without touching disk (useful for audits).
- Expand test suite to cover `sync` behaviour and template conflict resolution.
