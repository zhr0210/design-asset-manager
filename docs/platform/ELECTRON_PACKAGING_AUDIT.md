# Electron Packaging Configuration Audit

Phase 9A is a read-only audit. It records the current packaging state and future risks without changing real packaging behavior.

## Current Configuration

`electron.vite.config.ts` is present and configures:

- main process build with externalized dependencies;
- preload build with `src/preload/index.ts` and `src/preload/browser.ts`;
- CommonJS preload output;
- renderer React build with the `@renderer` alias.

`electron-builder` is installed and `postinstall` runs `electron-builder install-app-deps`.

An explicit electron-builder config is declared in `package.json` `build`.

Packaging scripts are declared for `pack:win`, `pack:mac`, `dist:win`, and `dist:mac`.

Windows uses the NSIS target. The Windows executable name is explicitly `Design Asset Manager`, so electron-builder's NSIS assisted installer uses `Design Asset Manager` as the installation subfolder name. The NSIS installer is configured as an assisted installer, not one-click, and allows the user to choose the installation directory.

The NSIS include file `build/installer.nsh` adds a confirmation page after directory selection. It normalizes the final `$INSTDIR` to a `Design Asset Manager` subfolder when the user chooses a parent directory, and displays that final path before installation starts.

## Risk Register

| Area | Status | Risk | Notes |
| --- | --- | --- | --- |
| electron-vite | Present | Medium | Build config exists, but packaging behavior is separate from build output. |
| electron-builder | Explicit config present | Medium | Windows/macOS targets, directories, resources, and app metadata are governed; signing and publishing remain disabled. |
| asar / unpack | Missing explicit config | High | Native modules and worker resources may require unpack rules. |
| native dependencies | Requires validation | High | `better-sqlite3` and `sharp` must be validated in packaged output. |
| preload | Present | Medium | Two preload entry points must remain bundled and reachable after packaging. |
| Python worker resources | Missing explicit config | High | `ai-service` and future runtime assets need a declared resource policy before real packaging. |
| Windows / macOS targets | Explicit config present | Medium | NSIS and DMG targets are declared; signing, notarization, and release publishing remain disabled. |

## Phase 9A Boundaries

This phase does not add packaging scripts, run electron-builder, alter asar behavior, move native dependencies, move `ai-service`, sign, notarize, publish, or release artifacts.

## Next Step

Phase 9B added minimal Windows/macOS pack and dist scripts:

- `pack:win`
- `pack:mac`
- `dist:win`
- `dist:mac`

These scripts are not run by the governance workflow. They keep these constraints:

- no release publishing;
- no signing;
- no notarization;
- no model or runtime package downloads;
- no real AI Worker startup.

Later packaging smoke validation found that the default NSIS installer did not expose an installation-directory selection step. The Windows NSIS config now sets:

- `oneClick: false`
- `include: "build/installer.nsh"`
- `allowToChangeInstallationDirectory: true`
- `win.executableName: "Design Asset Manager"`

With these settings, when a user chooses a parent folder during assisted install, the custom NSIS page normalizes and displays the final install directory as a `Design Asset Manager` subfolder instead of installing files directly into the selected parent folder.
