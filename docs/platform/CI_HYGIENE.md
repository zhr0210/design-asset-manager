# CI Path / Artifact Hygiene

Phase 8B keeps the cross-platform governance workflow validation-only and checks that CI does not leave high-risk artifacts in the project root.

## Denylist

The machine-readable policy lives at `.codeindex/ci-artifact-denylist.json`.

The denylist covers:

- project-root npm caches;
- runtime registry files written outside managed paths;
- settings backup directories written outside managed paths;
- model or runtime caches;
- generated asset-library or download test files;
- workflow commands that download models, install CUDA, publish releases, sign/notarize packages, or run packaging scripts.

## `dist-temp`

`dist-temp` is allowed only as a bounded test/build scratch area. The hygiene check accepts these subdirectories:

- `doctor`
- `platform-tests`
- `settings-migration-tests`
- `tests`

Root files or unknown subdirectories under `dist-temp` fail the hygiene check. Phase 8C will add local verification scripts that can clean temporary artifacts explicitly.

## CI Entry

`npm run ci:hygiene` runs the focused hygiene test. `npm run ci:governance` includes it after the governance/runtime safety checks and CI-safe doctor.
