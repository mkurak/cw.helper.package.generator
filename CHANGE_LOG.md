# Changelog

## [1.4.0] - 2025-09-20
### Added
- CLI bayrakları (`--deps`, `--dev-deps`, `--post-command`, `--clear-post-commands`, `--git-release`, `--no-git-release`, `--git-release-type`) ile JSON düzenlemeye gerek kalmadan anlık yapılandırma yapılabiliyor.
- `applyConfigOverrides` yardımcı fonksiyonu programatik kullanımlar için dışa açıldı.

### Changed
- README ve geliştirici notları CLI/JSON override önceliklerini ve kullanım örneklerini içerecek şekilde güncellendi.

## [1.2.0] - 2025-09-20
### Added
- Default post-install command chain (install → format → lint -- --fix → prepare) runs automatically after scaffolding.
- Optional git automation triggers `npm run release` when the repository is clean and remotes exist.

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

### Fixed
- Base module now installs `typescript-eslint`, ensuring generated projects lint successfully out of the box.

### Changed
- CLI version output is sourced from `package.json`, preventing drift between code and metadata.

## [0.1.0] - 2025-09-20
### Added
- Initial release of `cw.helper.package.generator` providing `cw-package-gen` CLI.
- `init` command scaffolding base, hooks, and release modules with shared templates.
- `sync` command to reapply template updates to existing packages.
- Handlebars-based template system and project context utilities.
- Jest/ESLint/Prettier configuration, git hooks, release workflows as reusable modules.
