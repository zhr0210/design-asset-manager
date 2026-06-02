# Windows / macOS CI Matrix

Phase 8A adds a GitHub Actions workflow for cross-platform governance checks.

## Workflow

- Workflow: `.github/workflows/cross-platform-governance.yml`
- Platforms: `windows-latest`, `macos-latest`
- Node: `20`
- Entry points:
  - `npm run typecheck`
  - `npm run build`
  - `npm run ci:governance`

## CI-Safe Policy

The workflow is validation-only. It must not download models, install CUDA, install runtime packages, start a real AI Worker, call a real external inference endpoint, publish releases, sign packages, notarize packages, migrate paths, or modify user data.

The workflow sets these guardrail environment variables:

- `DAM_CI_SAFE=true`
- `DAM_DISABLE_MODEL_DOWNLOADS=true`
- `DAM_DISABLE_RUNTIME_DOWNLOADS=true`
- `DAM_DISABLE_REAL_AI_WORKER=true`
- `DAM_DISABLE_EXTERNAL_INFERENCE=true`

These variables document CI intent and give future runtime/downloader code stable names to honor.

## Test Groups

`npm run ci:test-governance` runs platform, doctor, settings compatibility, migration preview, and path governance checks.

`npm run ci:test-runtime-safety` runs bootstrap, runtime profile/package, and mock/safe AI runtime checks.

`npm run doctor:ci` runs the doctor in JSON mode and fails only when at least one check reports `error`. A warning-only doctor report is acceptable in CI because Python, the default AI Worker health endpoint, or permission probes may be unavailable in a hosted runner.

`npm run ci:hygiene` checks that CI did not leave denied artifacts in the project root and that workflow commands stay validation-only.

`npm run verify:platform` runs the local common verifier: `ci:governance`, `typecheck`, and `build`.

`npm run verify:platform:win` and `npm run verify:platform:mac` wrap the same common verifier for platform-specific local use. `npm run verify:platform:clean` first removes only known `dist-temp` scratch subdirectories.

`pack:win`, `pack:mac`, `dist:win`, and `dist:mac` are packaging entry points for manual use. The governance workflow does not run them.

`.github/workflows/macos-package-artifact.yml` is a manual workflow for packaging unsigned macOS DMG artifacts on a GitHub-hosted macOS runner. It uploads the `.dmg` and `.blockmap` files as GitHub Actions artifact downloads and keeps release publishing, signing, and notarization disabled.

`npm run test-ci-governance` verifies that the workflow and npm scripts keep these boundaries intact.
