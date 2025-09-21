# Changelog

## [2.0.7] - 2025-09-21
### Changed
- Pre-commit hook now runs format, lint, coverage, build, and smoke (`node scripts/smoke.mjs`) to block invalid deployments.

## [2.0.6] - 2025-09-21
### Changed
- Pre-commit hook now fails unless format, lint, coverage, build, and smoke (node scripts/smoke.mjs) all succeed.

### Changed
- Removed the post-commit tag hook from the generator itself and from generated packages.

## [2.0.5] - 2025-09-21
### Changed
- Added a standardized post-commit hook to mirror automatic tagging across all packages.

## [2.0.4] - 2025-09-21
### Changed
- Updated generated pre-commit hooks to run only format, lint, and coverage checks.

## [2.0.3] - 2025-09-21
### Added
- Added a smoke test that scaffolds a temporary package with the base module to ensure templates stay functional.
### Changed
- Release automation now calls `npm version <type>` followed by `git push --follow-tags` instead of relying on bundled scripts.
- Generated packages now include an actual smoke test template that loads `dist/index.js`.

## [2.0.2] - 2025-09-21
### Changed
- Removed the `release` npm script from generated packages, updated templates/docs, and updated git automation to run `npm version <type>` followed by `git push --follow-tags`.

## [2.0.1] - 2025-09-20
### Fixed
- Post-commit hook now pushes version tags (`git push --follow-tags`) automatically after
  bump commits on the default branch, falling back to a warning if the push fails.

## [2.0.0] - 2025-09-20
### Removed
- Dropped the `sync` command; the CLI now focuses solely on first-time scaffolding.

### Changed
- Updated documentation, developer notes, and metadata to reflect the streamlined workflow.

## [1.5.0] - 2025-09-20
### Added
- Git hooks now validate `repository`, `bugs`, and `homepage` metadata and auto-tag commits on `main`/`master` when `package.json` version changes.
- Generated packages include `scripts/validate-package-metadata.cjs` for metadata checks outside the hook pipeline.

### Changed
- Base module seeds `repository`, `bugs`, and `homepage` entries with empty placeholders, forcing projects to provide real URLs before commits succeed.

## [1.4.7] - 2025-09-20
### Fixed
- Escaped the publish workflow template so `NODE_AUTH_TOKEN` keeps the full `${{ secrets.NPM_TOKEN }}` expression instead of collapsing to `$` in generated packages.

## [1.4.1] - 2025-09-20
### Fixed
- Varsayılan `tsconfig.json` dosyasında `rootDir` kaldırıldı; test dosyaları artık derleme kapsamına dahil olurken hata üretmiyor.

## [1.4.0] - 2025-09-20
### Added
- CLI bayrakları (`--deps`, `--dev-deps`, `--post-command`, `--clear-post-commands`, `--git-release`, `--no-git-release`, `--git-release-type`) ile JSON düzenlemeye gerek kalmadan anlık yapılandırma yapılabiliyor.
- `applyConfigOverrides` yardımcı fonksiyonu programatik kullanımlar için dışa açıldı.

### Changed
- README ve geliştirici notları CLI/JSON override önceliklerini ve kullanım örneklerini içerecek şekilde güncellendi.

## [1.2.0] - 2025-09-20
### Added
- Default post-install command chain (install → format → lint -- --fix → prepare) runs automatically after scaffolding.
- Optional git automation triggers `npm version <type>` when the repository is clean and remotes exist.

### Changed
- README/DEV_NOTES updated with automation details and configuration guidance.

## [1.1.0] - 2025-09-20
### Added
- Config-driven workflow via `cw-package-gen.config.json`, allowing module selection, dependency injection, and post-run commands.
- Automatic injection of `cw.helper.colored.console` and `cw.helper.dev.runner` through the default config.
- CLI option `--config` plus helpers to persist default config files in generated packages.

### Changed
- Post-install handling fetches latest npm versions and appends them to `package.json` without hardcoding ranges.
- Documentation and dev notes updated to describe the configurable pipeline.

## [1.0.3] - 2025-09-20
### Fixed
- Added repository metadata so npm provenance verification succeeds during the publish workflow.

## [1.0.2] - 2025-09-20
### Changed
- Hazırlık sürecini takip etmek için patch release akışını release script'i üzerinden denedik; sürümleme adımları artık belgelenmiş durumda.

## [1.0.1] - 2025-09-20
### Fixed
- Clarified the release flow and revalidated CLI version reporting to keep metadata in sync after the 1.0.0 cut.

## [1.0.0] - 2025-09-20
### Added
- Comprehensive README and developer notes covering CLI usage, modules, and maintenance.
- `sync` command to reapply template updates to existing packages.
- Handlebars-based template system and project context utilities.
- Jest/ESLint/Prettier configuration, git hooks, release workflows as reusable modules.
