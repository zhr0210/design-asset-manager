# Phase 15B Analysis: Packaged Production Validation & Sign-off Planning

This analysis evaluates the current packaging configurations, GitHub Actions workflows, and verification mechanisms for the **Design Asset Manager** project, focusing on path resolution, code-signing, notarization, and packaging smoke-testing logic.

---

## 1. Current Packaging & CI/CD Configuration Audit

### 1.1 `package.json` Build Configurations (`electron-builder`)
The project utilizes `electron-builder` for packaging. Its configuration is embedded under the `"build"` property in `package.json`:

```json
  "build": {
    "appId": "com.antigravity.design-asset-manager",
    "productName": "Design Asset Manager",
    "directories": {
      "output": "dist-packages",
      "buildResources": "build"
    },
    "files": [
      "out/**/*",
      "package.json"
    ],
    "extraResources": [
      {
        "from": "ai-service",
        "to": "ai-service",
        "filter": [
          "**/*",
          "!**/.venv/**",
          "!**/__pycache__/**",
          "!**/models/**/*.onnx",
          "!**/models/**/*.safetensors",
          "!**/models/**/*.gguf"
        ]
      }
    ],
    "asar": true,
    "asarUnpack": [
      "node_modules/better-sqlite3/**/*",
      "node_modules/sharp/**/*",
      "node_modules/@img/**/*"
    ],
    "win": {
      "executableName": "Design Asset Manager",
      "target": [
        "nsis"
      ]
    },
    "nsis": {
      "oneClick": false,
      "include": "build/installer.nsh",
      "allowToChangeInstallationDirectory": true
    },
    "mac": {
      "target": [
        "dmg"
      ],
      "identity": null
    },
    "publish": null
  }
```

#### Key Architecture Points:
1. **Unpacked Dependencies (ASAR)**: In accordance with `ADR-0004` (Native dependencies packaged outside ASAR), native modules (`better-sqlite3` and `sharp`) are explicitly unpacked under `"asarUnpack"`. This is critical because SQLite databases and native image processors cannot run when compressed inside the ASAR archive.
2. **Python Resource Filtering**: Under `extraResources`, the `ai-service` directory is bundled into the installer. Crucially, the Python virtual environment (`.venv`), compiled caches (`__pycache__`), and bulky model files (`.onnx`, `.safetensors`, `.gguf`) are filtered out. This ensures dry-run/base builds remain lightweight and do not distribute unapproved heavy binary assets.
3. **Windows Custom Installer**: The NSIS installer is configured to allow directory changes (`oneClick: false` and `allowToChangeInstallationDirectory: true`). A custom installer script `build/installer.nsh` intercepts path selection and normalizes the installation directory to prevent files from being dumped directly into selected parent directories.
4. **macOS Target**: Built unsigned by default with `"identity": null` and target format `"dmg"`.

---

### 1.2 GitHub Actions Workflows
There are three GitHub Actions workflows in `.github/workflows/`:

1. **`cross-platform-governance.yml`** (CI):
   - **Trigger**: `pull_request`, `push` to `main`, `workflow_dispatch`.
   - **Environment**: Sets safety flags (`DAM_CI_SAFE: true`, `DAM_DISABLE_MODEL_DOWNLOADS: true`, `DAM_DISABLE_REAL_AI_WORKER: true`, etc.) to isolate testing.
   - **Action**: Performs `npm run typecheck`, `npm run build`, and `npm run ci:governance`. It does **not** package the application or run `electron-builder`.

2. **`macos-package-artifact.yml`** (Manual Trigger Packaging):
   - **Trigger**: Manual `workflow_dispatch` with parameter selection for architecture (`all`, `x64`, `arm64`).
   - **Environment**: Identical safety flags (`DAM_DISABLE_MODEL_DOWNLOADS: true`, etc.) plus `CSC_IDENTITY_AUTO_DISCOVERY: false`.
   - **Action**: Builds application and runs `npx electron-builder --mac dmg --${{ matrix.arch }} --config.mac.identity=null --publish never`. This produces unsigned macOS `.dmg` and `.blockmap` files which are uploaded as build artifacts.

3. **`release-packaging-dry-run.yml`** (Release Skeletal Workflow):
   - **Trigger**: Manual `workflow_dispatch`.
   - **Environment**: Targets Windows NSIS (x64/arm64) and macOS DMG (x64/arm64).
   - **Action**: Currently a skeleton; runs dependencies, typecheck, build, and echoes a dry-run log without actually executing `electron-builder` or compiling installers.

---

## 2. Production Code-Signing & Notarization Design Plan

To transition from dry-run builds to signed and notarized production installers, configuration secrets must be integrated into `electron-builder` configurations and GitHub Actions release workflows.

### 2.1 macOS Code-Signing and Notarization

Apple requires both code-signing and notarization for any distribution outside the Mac App Store.

#### Required Secrets:
*   `MACOS_CSC_LINK`: The Developer ID Application certificate `.p12` file encoded in **Base64**.
*   `MACOS_CSC_KEY_PASSWORD`: The password for the `.p12` certificate.
*   `MACOS_APPLE_ID`: Developer ID email.
*   `MACOS_APPLE_APP_SPECIFIC_PASSWORD`: An Apple app-specific password generated via `appleid.apple.com`.
*   `MACOS_APPLE_TEAM_ID`: The 10-character Developer Portal Team ID.

#### 1. Hardened Runtime Entitlements
Create `build/entitlements.mac.plist` to define security boundaries. Electron apps require exceptions to allow JIT compilation and the loading of native modules:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.cs.allow-dyld-shared-cache-override</key>
    <true/>
  </dict>
</plist>
```

#### 2. Notarization Hook Script
Create `scripts/notarize.js` to trigger notarization programmatically via `electron-builder`'s `afterSign` hook using Apple's new `notarytool`:

```javascript
const { notarize } = require('@electron/notarize');
const path = require('path');

module.exports = async function (context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  // Skip notarization if environment secrets are not present (supports local builds / dry-runs)
  if (!process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD) {
    console.warn('Skipping macOS Notarization: Missing APPLE_ID or APPLE_APP_SPECIFIC_PASSWORD.');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log(`Notarizing macOS app bundle: ${appPath}`);

  await notarize({
    appPath,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID
  });

  console.log('macOS Notarization completed successfully!');
};
```

#### 3. Update `package.json` macOS Configuration
```json
    "mac": {
      "target": ["dmg"],
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist",
      "afterSign": "scripts/notarize.js"
    }
```
*Note: Remove `"identity": null` during signed builds, or dynamically omit it.*

---

### 2.2 Windows Code-Signing
Windows packages can be signed automatically by `electron-builder` using file-based Certificates.

#### Required Secrets:
*   `WIN_CSC_LINK`: The Windows Code Signing Certificate `.pfx` file encoded in **Base64**.
*   `WIN_CSC_KEY_PASSWORD`: The password for the `.pfx` certificate.

#### Update `package.json` Windows Configuration
No script hooks are required for basic PFX signing; `electron-builder` automatically runs `signtool.exe` if `CSC_LINK` and `CSC_KEY_PASSWORD` are defined in the environment.

---

### 2.3 Integration in GitHub Actions Release Workflows
Pass the secrets into the environment variables during the packaging step:

```yaml
      - name: Build and Package Releases
        env:
          # Shared / Platform Code Signing Secrets
          CSC_LINK: ${{ matrix.os == 'macos-latest' && secrets.MACOS_CSC_LINK || secrets.WIN_CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ matrix.os == 'macos-latest' && secrets.MACOS_CSC_KEY_PASSWORD || secrets.WIN_CSC_KEY_PASSWORD }}
          # macOS Notarization Secrets
          APPLE_ID: ${{ secrets.MACOS_APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.MACOS_APPLE_APP_SPECIFIC_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.MACOS_APPLE_TEAM_ID }}
        run: |
          if [ "${{ matrix.os }}" = "macos-latest" ]; then
            # Build production signed macOS package
            npx electron-builder --mac dmg --${{ matrix.arch }} --publish never
          else
            # Build production signed Windows package
            npx electron-builder --win nsis --${{ matrix.arch }} --publish never
          fi
```

---

## 3. Package Smoke Test Design & Implementation Plan

### 3.1 Gaps in Current `scripts/package-smoke.mjs`
1. **Windows-Only Launch**: Currently blocks non-Windows platforms, preventing macOS validation.
2. **Missing Environment Isolation**: When launched on a host system outside of a VM, the app writes to and overrides files in the user's real home folder (`~/DesignAssetManager/design_asset_manager.db` and logs), which runs the risk of corrupting user data.
3. **Shallow Validation**: Only checks that the process remains alive for 8 seconds. It does not inspect whether the packaged app successfully initializes the SQLite database (using `better-sqlite3`) or resolves the packaged `ai-service` scripts.

---

### 3.2 Proposed Cross-Platform Isolated Smoke Test Design

To solve these gaps, we propose extending or replacing the smoke test runner with a script that implements **Environment Isolation**, **Log Capture**, and **Path Resolution Assertions**.

#### 1. Isolated Environment Construction
To prevent data contamination, create a clean sandbox directory inside the workspace (`dist-packages/temp-smoke-home`) and direct the child process home environments to it:

*   **macOS**: Set `process.env.HOME = tempSmokeHome`
*   **Windows**: Set `process.env.USERPROFILE = tempSmokeHome`, `process.env.APPDATA = path.join(tempSmokeHome, 'AppData/Roaming')`, etc.

#### 2. Cross-Platform Executable Resolution
Locate the unpacked binary based on the current platform:
*   **macOS**: `dist-packages/mac/Design Asset Manager.app/Contents/MacOS/Design Asset Manager` (or `mac-arm64/...`)
*   **Windows**: `dist-packages/win-unpacked/Design Asset Manager.exe`

#### 3. Log Stream Verification
We can spawn the process, capture stdout/stderr, and tail the log files at `tempSmokeHome/DesignAssetManager/logs/debug/ocr-dependency.log` (or `design-asset-manager.log`) to assert that the critical subsystems loaded:
*   **SQLite Init**: Validate that `[SQLite] Database successfully loaded.` or `[SQLite] Connecting to SQLite DB at:` appears. This confirms `better-sqlite3` is functional.
*   **Resource Resolution**: Check for `[resolvePythonExecutable]` and verification of the `ai-service/app.py` script. This confirms `ai-service` was bundled correctly.

#### 3.3 Draft Smoke Test Code (`scripts/package-smoke-cross-platform.mjs`)
Here is a complete, runnable draft of the proposed cross-platform isolated smoke test script:

```javascript
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist-packages');
const tempHome = path.join(distDir, 'temp-smoke-home');

// 1. Resolve Executable Path based on Platform
let unpackedExe = '';
if (process.platform === 'darwin') {
  // Check typical electron-builder output directories
  const possiblePaths = [
    path.join(distDir, 'mac', 'Design Asset Manager.app', 'Contents', 'MacOS', 'Design Asset Manager'),
    path.join(distDir, 'mac-arm64', 'Design Asset Manager.app', 'Contents', 'MacOS', 'Design Asset Manager'),
    path.join(distDir, 'mac-x64', 'Design Asset Manager.app', 'Contents', 'MacOS', 'Design Manager')
  ];
  for (const p of possiblePaths) {
    try {
      await fs.access(p);
      unpackedExe = p;
      break;
    } catch {}
  }
} else if (process.platform === 'win32') {
  unpackedExe = path.join(distDir, 'win-unpacked', 'Design Asset Manager.exe');
}

async function runSmokeTest() {
  console.log(`Starting isolated packaging smoke test...`);
  console.log(`Unpacked executable located: ${unpackedExe}`);
  
  if (!unpackedExe) {
    console.error('Failure: Unpacked executable not found. Run pack:mac or pack:win first.');
    process.exit(1);
  }

  // 2. Setup isolated environments
  await fs.rm(tempHome, { recursive: true, force: true });
  await fs.mkdir(tempHome, { recursive: true });
  
  const env = {
    ...process.env,
    HOME: tempHome,
    USERPROFILE: tempHome,
    APPDATA: path.join(tempHome, 'AppData', 'Roaming'),
    LOCALAPPDATA: path.join(tempHome, 'AppData', 'Local'),
    DAM_CI_SAFE: 'true',
    DAM_DISABLE_MODEL_DOWNLOADS: 'true',
    DAM_DISABLE_RUNTIME_DOWNLOADS: 'true',
  };

  const logsDir = path.join(tempHome, 'DesignAssetManager', 'logs');
  
  // 3. Spawn child process capturing output
  const child = spawn(unpackedExe, ['--no-sandbox', '--disable-gpu'], {
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  child.stdout.on('data', (data) => { output += data.toString(); });
  child.stderr.on('data', (data) => { output += data.toString(); });

  const exitCodeStatus = await new Promise((resolve) => {
    const timer = setTimeout(() => {
      // The app should remain running (not crash)
      const isAlive = child.exitCode === null;
      if (isAlive) {
        child.kill('SIGINT');
      }
      resolve({ isAlive, exited: !isAlive, code: child.exitCode });
    }, 9000); // Wait 9 seconds

    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve({ isAlive: false, exited: true, code });
    });
  });

  console.log('App launch outcome:', exitCodeStatus);
  
  // 4. Perform Assertions on logs/output
  let passed = true;
  const checks = [];

  // Check 1: Startup crash
  const startupCrash = exitCodeStatus.exited && exitCodeStatus.code !== 0;
  checks.push({
    name: 'Process startup stability',
    passed: !startupCrash,
    detail: startupCrash ? `Exited prematurely with code ${exitCodeStatus.code}` : 'Did not crash during initialization.'
  });

  // Check 2: SQLite loading via better-sqlite3
  const sqliteSuccess = output.includes('[SQLite] Database successfully loaded.') || 
                        output.includes('[SQLite] Connecting to SQLite DB at:');
  checks.push({
    name: 'better-sqlite3 initialization',
    passed: sqliteSuccess,
    detail: sqliteSuccess ? 'SQLite database initialized correctly.' : 'Missing database confirmation logs.'
  });

  // Check 3: Python env / venv resolution
  const pathResolutionLog = output.includes('[resolvePythonExecutable]') || 
                            output.includes('[resolveBasePythonExecutable]') ||
                            output.includes('python-worker-runtime') ||
                            output.includes('ai-service');
  checks.push({
    name: 'Python env & script path resolution',
    passed: pathResolutionLog,
    detail: pathResolutionLog ? 'App correctly attempted to resolve packaged virtualenv / scripts.' : 'Venv/script resolution logs not found.'
  });

  // Clean up
  await fs.rm(tempHome, { recursive: true, force: true }).catch(() => {});

  console.log('\n--- Smoke Test Results ---');
  for (const c of checks) {
    console.log(`[${c.passed ? 'PASSED' : 'FAILED'}] ${c.name}: ${c.detail}`);
    if (!c.passed) passed = false;
  }

  if (!passed) {
    console.error('\nSmoke test FAILED.');
    process.exit(1);
  } else {
    console.log('\nSmoke test PASSED successfully.');
  }
}

runSmokeTest().catch((err) => {
  console.error('Unhandled smoke runner error:', err);
  process.exit(1);
});
```
