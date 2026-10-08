# Phase 15B Handoff Report: Packaged Production Validation & Sign-off Planning

## 1. Observation

Direct observations from auditing the codebase and workflows:

### A. Packaging Configuration (`package.json`)
*   **Mac Build Identity**: Under `"build.mac"` (lines 57-64), packaging defaults to unsigned:
    ```json
        "mac": {
          "target": [
            "dmg"
          ],
          "identity": null
        }
    ```
*   **Packaging Scripts**: `package.json` defines these pack/dist scripts (lines 70-73):
    ```json
        "pack:win": "npm run build && electron-builder --win --dir",
        "pack:mac": "npm run build && electron-builder --mac --dir --config.mac.identity=null",
        "dist:win": "npm run build && electron-builder --win",
        "dist:mac": "npm run build && electron-builder --mac --config.mac.identity=null",
    ```

### B. CI/CD Workflows (`.github/workflows/`)
*   **Mac Build Job**: `.github/workflows/macos-package-artifact.yml` (line 70) builds an unsigned DMG artifact:
    ```yaml
          - name: Package unsigned DMG
            if: ${{ github.event.inputs.arch == 'all' || github.event.inputs.arch == matrix.arch }}
            run: npx electron-builder --mac dmg --${{ matrix.arch }} --config.mac.identity=null --publish never
    ```
*   **Dry-run Release Flow**: `.github/workflows/release-packaging-dry-run.yml` (lines 46-50) contains a skeletal step that does not execute packaging:
    ```yaml
          - name: Dry-run packaging
            run: |
              echo "Dry-running packaging for ${{ matrix.target }} on ${{ matrix.arch }} architecture..."
              # Safe dry-run. No signing, notarization, or publishing.
    ```

### C. Smoke Test Logic (`scripts/package-smoke.mjs`)
*   **Platform Restriction**: `scripts/package-smoke.mjs` exits early on non-Windows platforms (lines 106-109):
    ```javascript
      if (process.platform !== 'win32') {
        report.checks.push({ id: 'launch-unpacked', status: 'skipped', detail: 'Windows-only smoke launch.' })
        return
      }
    ```
*   **Lack of Environment Isolation**: The host launch command (line 117) spawns the app directly on the host using `spawn(unpackedExe, ...)` without modifying process environments such as `HOME` or `USERPROFILE`.
*   **SQLite User Library Reference**: `src/main/db/index.ts` (lines 84-85) references `homedir()`:
    ```typescript
      // Resolve base workspace library directory: ~/DesignAssetManager
      const baseDir = join(homedir(), 'DesignAssetManager')
    ```

---

## 2. Logic Chain

1. **Current Configuration (A & B)** shows that the current builds are strictly unsigned and dry-run only. Both the local script (`dist:mac`) and the manual packaging workflow (`macos-package-artifact.yml`) append `--config.mac.identity=null` to ensure electron-builder does not attempt to sign packages.
2. **Transitioning to Production Signing** requires configuring environment variables. By removing the identity override (or introducing a dedicated production build command like `dist:mac:release` that omits `identity=null`), `electron-builder` will sign builds if the standard `CSC_LINK` and `CSC_KEY_PASSWORD` credentials are found in the environment.
3. **macOS Notarization** mandates additional steps: (a) setting Apple Developer Credentials (`APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`); (b) registering a notarization script under the `afterSign` hook of `electron-builder`; and (c) providing an entitlements file `build/entitlements.mac.plist` allowing JIT and unsigned executable memory, which are required by native modules like `better-sqlite3` and `sharp`.
4. **Current Smoke Test (C)** is Windows-only, does not run in an isolated environment, and lacks checks on whether the app resolved the virtualenv or database successfully.
5. **Environment Isolation** during smoke testing is required because `src/main/db/index.ts` directly initializes a database inside the user home folder. Running the unpacked app on a developer machine or CI host without environment mapping would write to and possibly corrupt the developer's live local `~/DesignAssetManager/design_asset_manager.db`.
6. **Cross-Platform Smoke Testing** is possible by locating the macOS app binary (`.app/Contents/MacOS/Design Asset Manager`), spawning it with custom `HOME` / `USERPROFILE` / `APPDATA` paths mapped to a clean temp folder, capturing its stdout/stderr streams, and asserting that the app initializes the database (`[SQLite] Database successfully loaded.`) and resolves python scripts successfully.

---

## 3. Caveats

*   **Real Cert Validation**: Actual code signing and notarization cannot be run or verified in this environment because (a) this is a read-only investigation, (b) we operate in CODE_ONLY network mode, and (c) Apple developer credentials and certificates are withheld/absent.
*   **Platform Differences**: Smoke testing on macOS cannot verify Windows NSIS installer behavior, and vice versa. Full Windows Sandbox testing still requires a Windows host or VM.

---

## 4. Conclusion

*   **Code Signing / Notarization Integration**: To perform production signing, `release-packaging-dry-run.yml` (and subsequent release pipelines) should inject secret-backed environment variables (`CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`) and call dedicated release scripts (e.g. `dist:mac` without `identity=null`) with `build/entitlements.mac.plist` and `scripts/notarize.js` hooks registered.
*   **Isolated Cross-Platform Smoke Testing**: The packaging smoke verification process should be upgraded to support both Windows and macOS, and run the unpacked binary using isolated environment variables (`HOME`, `USERPROFILE`, etc. pointing to a temp sandbox dir). Verification must parse process outputs to assert that the SQLite database initialized and python venv scripts resolved without throwing module/native load errors.

---

## 5. Verification Method

To verify these findings and plans:

1.  **Run current validation tests** to ensure the codebase remains clean and package rules are obeyed:
    ```bash
    node scripts/run-ts-test.mjs scripts/release-flow-governance.test.ts
    node scripts/run-ts-test.mjs scripts/electron-packaging-scripts.test.ts
    node scripts/run-ts-test.mjs scripts/native-dependency-packaging.test.ts
    node scripts/run-ts-test.mjs scripts/macos-package-artifact-workflow.test.ts
    ```
2.  **Inspect the proposed scripts and YAML integration templates** inside `<DAM_WORKSPACE>/.agents/teamwork_preview_explorer_phase16_2/analysis.md` to ensure they comply with `ADR-0004` and do not expose secrets.
3.  **Invalidation Conditions**: If `better-sqlite3` or `sharp` is moved to devDependencies, or if `identity: null` is removed from the dry-run packaging commands before secrets are fully wired, the builds will fail.
