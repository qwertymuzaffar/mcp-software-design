# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Extracted an escape-aware `scanToUnescaped` scanner in the smell
  tokenizer, collapsing three near-identical scan loops into one linear,
  no-backtracking helper — internal refactor, no behavior change. (#13)

## [0.1.3] - 2026-07-31

### Added

- `clean-code` umbrella concept in the catalog, tying the individual
  cleanliness practices together. (#11)

### Changed

- README: added badges and moved the install guide to the top, then
  de-duplicated the install instructions so they live in one place.
  (#9, #10)

## [0.1.2] - 2026-07-31

### Added

- `solid` and `oop` filters for the `list_catalog` tool. (#5)
- `meaningful-names` concept to the catalog, with refreshed docs. (#6)

### Changed

- Expanded the npm keywords for discoverability. (#7)

### Fixed

- Derive the server version from `package.json` so the reported version
  always matches the published one. (#4)

## [0.1.1] - 2026-07-31

### Fixed

- Corrected the publish metadata so the package resolves cleanly on both
  the npm and MCP registries. (#1)

## [0.1.0] - 2026-07-31

### Added

- Initial release: the software-design MCP server — a language-agnostic
  catalog of SOLID / OOP / DRY principles and the 23 GoF design patterns,
  the `list_catalog`, `explain_concept`, `scaffold_pattern`, and
  `check_smells` tools, and the `design://` resources.

[Unreleased]: https://github.com/qwertymuzaffar/mcp-software-design/compare/v0.1.3...HEAD
[0.1.3]: https://github.com/qwertymuzaffar/mcp-software-design/releases/tag/v0.1.3
