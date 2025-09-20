# Changelog

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
