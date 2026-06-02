# Native Dependency Packaging Verification

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
- `asarUnpack` for `node_modules/@img/sharp-*darwin-arm64/**/*`
- `asarUnpack` for `node_modules/@img/sharp-*darwin-x64/**/*`

`sharp` 0.34+ uses platform-specific optional packages for its native binding and libvips runtime. macOS packages must unpack both the `sharp` package and the matching `@img/sharp-*darwin-*` packages so the dylibs remain loadable outside `app.asar`.

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
