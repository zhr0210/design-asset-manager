# Native Dependency Packaging Verification

## Current F candidate (2026-10-08)

Current production Main uses `createAppStorage` under the selected Electron
`userData/app-state`; the legacy database path below is a historical Phase 9C
observation. Current preloads are `index`, `asset-card`, and `work-window`.
Browser uses the authenticated local Host HTTP transport and has no browser
preload. The static tests check those actual consumers.

Before disabling rebuild for packaging, `native-package-inputs.mjs` executes
SQLite and Sharp in the installed target Electron and hashes loaded bindings.
Foreign platforms/architectures are refused. This avoids mutating the live
workspace's native DLLs; it is not native window or installation acceptance.
Model weights, environment/secret files, databases, logs and caches are excluded
from `ai-service`. Actual candidate bytes are checked by
`verify-local-candidate.mjs`. Per-platform user acceptance remains separate;
see [F state](../handoff/CURRENT-STATE.md).

## Historical Phase 9C snapshot

Phase 9C adds packaging preflight checks for native dependencies and Electron resource paths. It does not run `electron-builder`, package the app, download native dependencies, download models, or start the AI Worker.

## Native Dependencies

The app depends on these native modules:

- `better-sqlite3`
- `sharp`

Both must remain declared in `dependencies`, not only `devDependencies`, and both must be unpacked from asar in packaged output.

The current electron-builder config declares:

- `asar: true`
- `asarUnpack` for `node_modules/better-sqlite3/**/*`
- `asarUnpack` for `node_modules/sharp/**/*`

## Resource Paths

SQLite data is verified as a known packaging-path gap: `src/main/db/index.ts` still resolves the runtime database from `homedir()/DesignAssetManager`. This must not be changed in Phase 9C because database path behavior and migration are reserved for Phase 13.

Preload entries must remain declared in `electron.vite.config.ts`:

- `src/preload/index.ts`
- `src/preload/browser.ts`

The Python worker resource policy is declared as an `extraResources` entry for `ai-service`, with `__pycache__`, `.venv`, and `models` excluded. This records packaging intent without installing Python dependencies or bundling model weights.

## Safety Constraints

Phase 9C verification is static/preflight only:

- no pack/dist script is run;
- no release is published;
- no signing or notarization is performed;
- no model or runtime package is downloaded;
- no real AI Worker is started.
