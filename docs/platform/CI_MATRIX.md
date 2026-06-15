# Windows / macOS CI Matrix

Phase 8A adds a GitHub Actions workflow for cross-platform governance checks.

## Workflow

- Workflow: `.github/workflows/cross-platform-governance.yml`
- Platforms: `windows-2022`, `macos-latest`
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

`npm run ci:prepare-native-deps` restores the current Node ABI for
`better-sqlite3` before Node-driven governance tests. `npm ci` runs
electron-builder's postinstall and may leave the module rebuilt for Electron;
packaging commands rebuild Electron native dependencies again before creating
an app artifact.

Windows jobs are pinned to `windows-2022` while `node-gyp` 10 is unable to
recognize the Visual Studio 2026 installation on the current
`windows-latest` image. This is a CI toolchain constraint, not an application
support boundary. Workflows use `checkout@v6` and `setup-node@v6` so the action
runtime is Node 24 while the tested application runtime remains Node 20.

`npm run verify:platform` runs the local common verifier: `ci:governance`, `typecheck`, and `build`.

`npm run verify:platform:win` and `npm run verify:platform:mac` wrap the same common verifier for platform-specific local use. `npm run verify:platform:clean` first removes only known `dist-temp` scratch subdirectories.

`pack:win`, `pack:mac`, `dist:win`, and `dist:mac` are packaging entry points for manual use. The governance workflow does not run them.
They share `scripts/run-electron-builder.mjs`, which uses the Electron
distribution installed by `npm ci` and derives its version at runtime.

`.github/workflows/macos-package-artifact.yml` is a manual workflow for packaging unsigned macOS DMG artifacts on a GitHub-hosted macOS runner. It uploads the `.dmg` and `.blockmap` files as GitHub Actions artifact downloads and keeps release publishing, signing, and notarization disabled.

`.github/workflows/release-packaging-dry-run.yml` builds unsigned NSIS/DMG
candidates for x64 and arm64, writes architecture-scoped SHA-256 manifests,
runs static Package Smoke, and retains candidate artifacts for 14 days. It
does not sign, notarize, publish, or read release secrets.

`.github/workflows/release-signed-candidate.yml` is manual and requires both
an explicit `signing_approved` input and approval for the selected platform
signing environment. It can build a signed candidate, produce Release Update
Metadata and structured trust evidence, and retain the result for review. It
has read-only repository permissions and does not publish.

`npm run test-ci-governance` verifies that the workflow and npm scripts keep these boundaries intact.
