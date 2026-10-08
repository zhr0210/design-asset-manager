# macOS Remaining Phases Implementation Analysis

This report analyzes the requirements, designs, and verification strategies for the remaining macOS phases of the Design Asset Manager application, focusing on:
1. **Path Migration Execution**
2. **OCR & Llama Dependency Auto-Installers**
3. **macOS Code Signing & Notarization**
4. **Verification Tests**

---

## 1. Path Migration Execution (macOS)

### 1.1 Examination of `PathMigrationExecutor`
Located in `src/main/path-migration/path-migration-executor.ts`, the `PathMigrationExecutor` class coordinates the database path translation and physical file migration.

*   **`executeMigration(options?: { deleteLegacyFiles?: boolean })`**:
    1.  **Atomic DB Backup**: Executes `db.backup(backupPath)` using `better-sqlite3`'s native backup capability. This creates a transaction-consistent, offline copy of `assets.db` to act as a fallback.
    2.  **Asset Scanning**: Queries the `assets` table for files with absolute physical paths in the fields `thumbnail_path` and `normalized_path`.
    3.  **Dry-run Validation**: Validates existence of the source files. If files are missing (and check is not deferred), it logs them. It checks target locations in `cacheDir` for filename collisions.
    4.  **Physical Migration**: Copies legacy files into the standardized paths in `cacheDir` under namespaces (e.g., `cacheDir/thumbnail/${assetId}/${filename}`). Each copied file is recorded in an in-memory journal with source and target paths.
    5.  **Schema Normalization**: Runs a database transaction to update the `thumbnail_path` and `normalized_path` columns to refer to relative protocols (`cache://thumbnail/...` and `cache://normalized-image/...`).
    6.  **Cleanup**: If `deleteLegacyFiles` is true, it deletes the source legacy files. If the migration succeeds, it deletes the backup DB file and marks the journal as `completed`.
*   **`rollbackMigration()`**:
    *   Triggered automatically inside a `catch` block if `executeMigration` throws an error.
    *   Closes the active database connection.
    *   Overwrites the current database file with the backup DB copy.
    *   Invokes `setDatabase(newDb)` to update the globally managed database connection.
    *   Iterates over the journal's `copiedFiles` array and physically deletes all destination files that were copied during the failed execution, preventing cache pollution.

### 1.2 IPC Channel Design (`src/main/ipc/path-governance.ipc.ts`)
To expose path migration status, dry-run reports, and execution controls to the React renderer process, the following IPC channels are designed:

1.  **`path-governance:dry-run`**
    *   **Handler**: Invokes the dry-run scanners (`createAssetLibraryPathGovernanceReport`, `createDownloadPathDryRunPlan`, `createMediaPathGovernancePlan`).
    *   **Return Shape**:
        ```typescript
        interface DryRunResponse {
          success: boolean;
          report?: {
            affectedRows: number;
            missingFiles: Array<{ assetId: string; filePath: string }>;
            proposedMappings: Array<{ original: string; proposed: string; isCollision: boolean }>;
            collisions: Array<{ filePath: string; conflictingAssetId: string }>;
          };
          error?: string;
        }
        ```
2.  **`path-governance:execute-migration`**
    *   **Handler**: Instantiates `PathMigrationExecutor` and runs `executeMigration({ deleteLegacyFiles: options.deleteLegacyFiles })`.
    *   **Return Shape**:
        ```typescript
        interface ExecuteMigrationResponse {
          success: boolean;
          migratedCount: number;
          error?: string;
        }
        ```
3.  **`path-governance:get-migration-status`**
    *   **Handler**: Retrieves the state of the executor's active journal (e.g., `'idle' | 'executing' | 'rolling_back' | 'completed' | 'failed'`).

#### Preload Bridge Mappings (`src/preload/index.ts`)
Exposed inside `contextBridge.exposeInMainWorld('electronAPI', { ... })`:
```typescript
pathGovernance: {
  runDryRun: () => ipcRenderer.invoke('path-governance:dry-run'),
  executeMigration: (options: { deleteLegacyFiles: boolean }) => ipcRenderer.invoke('path-governance:execute-migration', options),
  getMigrationStatus: () => ipcRenderer.invoke('path-governance:get-migration-status')
}
```

### 1.3 React UI Component Design (`PathMigrationPanel`)
This component is added as a section in the settings page (`src/renderer/routes/Settings.tsx`):

```tsx
import React, { useState } from 'react'
import { ClipboardCopy, Loader2, Play, RotateCcw, AlertTriangle, CheckCircle, Info } from 'lucide-react'

export default function PathMigrationPanel() {
  const [dryRunReport, setDryRunReport] = useState<any | null>(null)
  const [status, setStatus] = useState<'idle' | 'scanning' | 'ready' | 'migrating' | 'completed' | 'failed'>('idle')
  const [deleteLegacyFiles, setDeleteLegacyFiles] = useState(false)
  const [progressLog, setProgressLog] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleDryRun = async () => {
    setStatus('scanning')
    setError(null)
    try {
      const api = (window as any).electronAPI?.pathGovernance
      const res = await api.runDryRun()
      if (res.success) {
        setDryRunReport(res.report)
        setStatus('ready')
      } else {
        throw new Error(res.error)
      }
    } catch (err: any) {
      setError(err.message || '扫描失败')
      setStatus('idle')
    }
  }

  const handleMigrate = async () => {
    setStatus('migrating')
    setError(null)
    setProgressLog(['[INFO] 正在初始化路径迁移...', '[INFO] 正在创建数据库原子备份...'])
    try {
      const api = (window as any).electronAPI?.pathGovernance
      const res = await api.executeMigration({ deleteLegacyFiles })
      if (res.success) {
        setProgressLog(prev => [...prev, `[SUCCESS] 迁移成功完成，共修改 ${res.migratedCount} 条记录。`])
        setStatus('completed')
      } else {
        throw new Error(res.error)
      }
    } catch (err: any) {
      setProgressLog(prev => [...prev, `[ERROR] 迁移失败: ${err.message}`, '[INFO] 已启动自动回滚，正在恢复原始状态...'])
      setError(err.message || '迁移失败，已自动安全回滚。')
      setStatus('failed')
    }
  }

  return (
    <section className="rounded-[24px] border border-white bg-white p-6 shadow-premium dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <ClipboardCopy className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-[14px] font-black text-slate-900 dark:text-slate-50">本地路径规范化工具</h4>
          <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-400">
            迁移历史导入的绝对路径为统一的 `cache://` 相对路由，规避跨设备或跨系统路径丢失。
          </p>
        </div>
      </div>

      {status === 'idle' && (
        <button onClick={handleDryRun} className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-[11px] transition-all">
          检测路径受影响情况
        </button>
      )}

      {status === 'scanning' && (
        <div className="mt-4 flex items-center justify-center gap-2 py-4 text-slate-500 font-bold text-[11px]">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>正在分析本地素材库路径...</span>
        </div>
      )}

      {dryRunReport && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-center">
              <span className="block text-[10px] text-slate-400">待迁移数量</span>
              <span className="text-[16px] font-black text-slate-800">{dryRunReport.affectedRows}</span>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-center">
              <span className="block text-[10px] text-slate-400">缺失物理文件</span>
              <span className={`text-[16px] font-black ${dryRunReport.missingFiles.length ? 'text-rose-500' : 'text-slate-500'}`}>
                {dryRunReport.missingFiles.length}
              </span>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-center">
              <span className="block text-[10px] text-slate-400">缓存命名冲突</span>
              <span className={`text-[16px] font-black ${dryRunReport.collisions.length ? 'text-amber-500' : 'text-slate-500'}`}>
                {dryRunReport.collisions.length}
              </span>
            </div>
          </div>

          {dryRunReport.missingFiles.length > 0 && (
            <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 text-[10.5px] text-rose-700 leading-relaxed">
              <div className="font-black flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> 检测到部分记录的本地文件已不存在。
              </div>
              <ul className="mt-1 list-disc pl-4 font-semibold max-h-24 overflow-y-auto">
                {dryRunReport.missingFiles.map((f: any, i: number) => (
                  <li key={i}>{f.filePath} (ID: {f.assetId})</li>
                ))}
              </ul>
            </div>
          )}

          {dryRunReport.proposedMappings.length > 0 && (
            <details className="rounded-xl border border-slate-100 p-3 bg-white">
              <summary className="cursor-pointer text-[11px] font-bold text-slate-700">查看详细映射计划 ({dryRunReport.proposedMappings.length})</summary>
              <div className="mt-2 max-h-36 overflow-y-auto text-[9.5px] font-mono leading-5 text-slate-500 space-y-1">
                {dryRunReport.proposedMappings.map((m: any, i: number) => (
                  <div key={i} className="flex justify-between border-b border-slate-50 pb-1">
                    <span className="truncate max-w-[180px]">{m.original}</span>
                    <span className="text-indigo-500 truncate max-w-[180px]">{m.proposed}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-[11px] font-bold text-slate-700">
            迁移完成后删除本地原始绝对路径文件
            <input type="checkbox" checked={deleteLegacyFiles} onChange={(e) => setDeleteLegacyFiles(e.target.checked)} className="h-4 w-4 accent-brand-500" />
          </label>

          {status === 'ready' && (
            <button onClick={handleMigrate} className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-bold text-[11.5px] transition-all flex items-center justify-center gap-1.5 shadow-sm">
              <Play className="h-3.5 w-3.5" />
              <span>开始迁移</span>
            </button>
          )}
        </div>
      )}

      {(status === 'migrating' || progressLog.length > 0) && (
        <div className="mt-4 space-y-2">
          <div className="rounded-xl bg-slate-900 p-3 max-h-40 overflow-y-auto text-[10px] font-mono text-emerald-400 space-y-1 select-text">
            {progressLog.map((log, index) => <div key={index}>{log}</div>)}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-[10.5px] font-bold leading-5 text-rose-700 flex items-start gap-1.5">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </section>
  )
}
```

### 1.4 Backup & Rollback of Settings & DB
To ensure database paths and system configurations do not get out of sync on migration failures:
1.  **Database Connection Management**:
    Before updating any schema columns, `PathMigrationExecutor` locks writing and runs `db.backup()`. If physical copying or the schema update fails, the active database is shut down (`db.close()`), the original `assets.db` is restored from the backup file, and `setDatabase` updates the global connection.
2.  **Settings Syncing**:
    The library path fields (`libraryPath`, `modelRootDir`) reside in `settings.json`. Before writing changes to `settings.json`, a file-level backup of `settings.json` is generated under `settings-backups/` by invoking `SettingsMigrationService.createPlan()`. If DB path migration fails and rolls back, the settings service restores the previous `settings.json` file, restoring settings configurations back to their consistent legacy paths.

---

## 2. OCR & Llama Dependency Auto-Installers

### 2.1 OCR/MPS Dependency Installers & Progress Relay
The OCR engine supports three engines: `easyocr` (PyTorch-dependent), `rapidocr`, and `paddleocr` (ONNX Runtime-dependent). On macOS, installing native Python ML dependencies (such as `torch` with MPS acceleration, `transformers`, `onnxruntime`) is orchestrated by `src/main/services/ocr-dependency.service.ts` and the Python utility `ai-service/tools/install_macos_ai_deps.py`.

*   **Installation Spawning**:
    *   `OcrDependencyService.installMacOSAiDeps()` spawns the python installer child process asynchronously.
    *   It captures the standard output stream of the child process.
*   **Progress Streaming**:
    *   The Python utility prints structured JSON logs to stdout:
        `{"type": "progress", "progress": 45, "message": "Installing onnxruntime..."}`
    *   The Main process listens for data on `stdout` and redirects each line to the frontend using the `CHANNEL_OCR_INSTALL_LOG_UPDATE` (`'ocr:install-log-update'`) event.
    *   **Preload Bridge**: Exposes `onOcrInstallLog(callback)` which hooks `ipcRenderer.on('ocr:install-log-update', callback)`.
    *   **Renderer Console Integration**:
        Inside `AiConsolePage.tsx`, the `useEffect` registers the listener. When a JSON chunk is received, it is parsed and rendered inside the developer log console as structured progress states.

### 2.2 Llama GGUF & mmproj Downloader Flow
Local visual prompt reverse queries rely on the local `llama.cpp` runtime server. The installer and downloader are governed by `src/main/services/llama-runtime/llama-runtime-install.service.ts`.

*   **Download Triggers**:
    *   Triggered from `AiConsolePage.tsx` under the "推理服务" (Services) tab.
    *   `llamaRuntimeCreateInstallPlan` computes system hardware specs and determines whether the system is Apple Silicon or Intel, recommending a suitable GGUF model (e.g. `Qwen2.5-VL` or `Qwen3-VL-2B`) and the corresponding visual encoder `mmproj` model file.
*   **Downloader Integrity Checks**:
    *   Downloads are performed using the Node `fetch` API.
    *   It writes data chunks to a temporary `.part` file while hashing the stream with `crypto.createHash('sha256')`.
    *   If a file already exists on disk, the service performs an integrity check: it compares the SHA256 file hash against `pkg.checksumSha256` or calls a `HEAD` request to compare the remote `content-length` with the local size. If verified, downloading is skipped.
*   **Llama Downloader UI Flow**:
    *   Under the "推理服务" tab, the user chooses a GGUF model and clicks "Install".
    *   The UI invokes the preload bridge `llamaRuntimeStartInstall({ plan })`.
    *   Live progress is streamed via the dynamically computed channel `llamaRuntimeInstallProgressChannel(installId)` and bound in the UI using `onLlamaRuntimeInstallProgress(installId, (event, data) => { ... })` to show percent numbers, remaining time, and downloading speed.

---

## 3. macOS Code Signing & Notarization

Apple requires applications running on macOS Catalina or newer to be signed and notarized by Apple's services to bypass Gatekeeper blockages.

### 3.1 Hardened Runtime & Entitlements
*   **Hardened Runtime**: Enabled via `hardenedRuntime: true` in the `electron-builder` configuration inside `package.json`. It isolates the application memory space and restricts runtime operations.
*   **Entitlements Configuration (`build/entitlements.mac.plist`)**:
    *   `com.apple.security.cs.allow-jit` and `com.apple.security.cs.allow-unsigned-executable-memory`: Essential for Chromium's V8 engine and Electron renderer performance (JIT code generation).
    *   `com.apple.security.cs.disable-library-validation`: Permits loading native nodes, `.dylib` files, and ML libraries (ONNX Runtime, PaddleOCR plugins, custom C++ bindings) that are self-signed or not signed by the application developer.

### 3.2 Notarization Script (`scripts/notarize.js`)
Runs during the `afterSign` packaging event configured in `package.json`:
*   Reads Apple Developer credentials from environment variables:
    *   `APPLE_ID`: Developer account email.
    *   `APPLE_APP_SPECIFIC_PASSWORD`: App-specific password generated via Apple ID portal.
    *   `APPLE_TEAM_ID`: Apple Team identifier.
*   If credentials are present, it invokes `@electron/notarize` to submit the signed `.app` bundle, polling Apple's server until notarization succeeds.
*   If credentials are not found, it gracefully skips notarization with a console notice, allowing developers to test local builds.

### 3.3 Production vs. Local Credentials Configuration
*   **Local Build**:
    *   The scripts `pack:mac` and `dist:mac` are defined with the argument `--config.mac.identity=null`. This disables Developer certificate verification, enabling local packaging of unsigned DMG bundles for debugging.
*   **Production Release / CI Builds**:
    *   Certificates are imported via environment variables:
        *   `CSC_LINK`: Base64 encoded `.p12` developer certificate.
        *   `CSC_KEY_PASSWORD`: Password for the `.p12` certificate.
    *   Apple notarization variables (`APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`) are populated.
    *   `electron-builder` signs the binary, runs `afterSign` to notarize it, and packages it into a verified DMG.

### 3.4 Verification Commands
To verify the signature and Gatekeeper acceptance on a local macOS environment:
```bash
# 1. Verify code signature structure and native dependencies deep verification
codesign --verify --verbose --deep --strict "dist-packages/mac-arm64/Design Asset Manager.app"

# 2. Display certificate authority details and entitlements
codesign -dvvv "dist-packages/mac-arm64/Design Asset Manager.app"

# 3. Verify Gatekeeper compliance and notarization ticket attachment
spctl --assess --type execute --verbose --context context:primary-signature "dist-packages/mac-arm64/Design Asset Manager.app"
```
*Expected spctl output*: `accepted` with source `Notarized Developer ID` or `Developer ID`.

---

## 4. Verification Tests

To verify these integrations, the following automated test suites are required:

### 4.1 Path Migration Executor Integration Test (`scripts/path-governance-ipc-integration.test.ts`)
*   **Objective**: Verify the IPC handlers and rollback mechanics are fully wired and functional.
*   **Assertions**:
    *   `path-governance:dry-run` returns accurate count of legacy items and collision flags.
    *   `path-governance:execute-migration` moves physical files to `cacheDir/` and updates paths in the DB.
    *   On a forced copy failure (e.g. simulated read-only target cache), the executor rolls back, restores the DB backup, triggers `setDatabase` to rebind the connection, cleans up any partially copied files, and returns a structured error payload.

### 4.2 OCR Installer & Logs Streaming Test (`scripts/ocr-installer-mock.test.ts`)
*   **Objective**: Test process execution and log streaming from Python utilities.
*   **Assertions**:
    *   Triggering `macos-ai:install-deps` spawns `install_macos_ai_deps.py` with correct environment settings.
    *   Simulated JSON streams on `stdout` are correctly captured, parsed, and routed to renderer processes via the `ocr:install-log-update` channel.
    *   Invoking cancel terminates the spawned pip child process.

### 4.3 Llama Downloader Resiliency Test (`scripts/llama-downloader-resilience.test.ts`)
*   **Objective**: Verify checksum validation and partial file handling during model downloads.
*   **Assertions**:
    *   `verifyFileChecksum()` reports `false` and triggers redownload when file hashes mismatch.
    *   Valid files match remote size and trigger a download-skip, returning immediate `downloaded` state.
    *   `llama-runtime:list-local-models` evaluates model readiness strictly, reporting `isDownloaded: false` if either the GGUF LLM model or its matching `mmproj` file is missing.
