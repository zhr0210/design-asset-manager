param(
  [string]$RepoRoot = (Resolve-Path ".").Path,
  [string]$LogRoot = (Join-Path $env:USERPROFILE "Desktop")
)

$ErrorActionPreference = "Continue"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$log = Join-Path $LogRoot "dam-windows-ai-validation-$stamp.log"

Start-Transcript -Path $log -Force

try {
  Write-Host "== Validation start =="
  Write-Host ("Time: " + (Get-Date))
  Write-Host ("Computer: " + $env:COMPUTERNAME)
  Write-Host ("User: " + $env:USERNAME)
  Write-Host ("RepoRoot: " + $RepoRoot)

  Set-Location $RepoRoot

  Write-Host "== Git state =="
  git status --short
  git log -1 --oneline

  Write-Host "== Tool versions =="
  git --version
  node --version
  npm --version
  python --version
  where git
  where node
  where npm
  where python

  Write-Host "== GPU =="
  nvidia-smi
  python - <<'PY'
import sys
print("python", sys.version)
try:
    import torch
    print("torch", torch.__version__)
    print("torch.version.cuda", getattr(torch.version, "cuda", None))
    print("cuda_available", torch.cuda.is_available())
    if torch.cuda.is_available():
        print("device_name", torch.cuda.get_device_name(0))
except Exception as exc:
    print("torch_probe_error", type(exc).__name__, str(exc))
PY

  Write-Host "== Install Node deps =="
  npm ci

  Write-Host "== Typecheck/build =="
  npm run typecheck
  npm run build

  Write-Host "== Runtime safety tests =="
  npm run ci:test-runtime-safety

  Write-Host "== Python unit tests =="
  npm run test-python-unittest

  Write-Host "== Windows AI direct probes =="
  $env:PYTHONPATH = Join-Path $RepoRoot "ai-service"
  python - <<'PY'
import json
from core.windows_ai_capabilities import probe_windows_ai_capabilities
from core.python_cuda_compat import probe_python_cuda_environment
from core.cuda_execution_probe import probe_python_cuda_execution
from core.onnx_model_load_probe import probe_registered_onnx_model_load

checks = {
    "windows_capabilities": probe_windows_ai_capabilities(),
    "python_cuda_status": probe_python_cuda_environment(),
    "python_cuda_execution": probe_python_cuda_execution(),
    "onnx_wd_tagger_load": probe_registered_onnx_model_load("wd_tagger"),
    "onnx_clip_embedding": probe_registered_onnx_model_load("clip"),
}
print("WINDOWS_AI_DIRECT_PROBES_START")
print(json.dumps(checks, ensure_ascii=False, indent=2))
print("WINDOWS_AI_DIRECT_PROBES_END")
PY

  Write-Host "== Electron/Playwright smoke =="
  $e2e = Join-Path $env:TEMP "dam-windows-ai-runtime-e2e.mjs"
  @'
import { _electron as electron } from "playwright";
import path from "node:path";
import fs from "node:fs/promises";

const repo = process.cwd();
const userData = path.join(process.env.TEMP || ".", "dam-win-ai-e2e-" + Date.now());
await fs.mkdir(userData, { recursive: true });

const app = await electron.launch({
  args: [repo, "--user-data-dir=" + userData],
  cwd: repo,
  timeout: 60000,
});

try {
  const page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
  await page.evaluate(() => { location.hash = "#/ai-console"; });
  await page.waitForTimeout(3000);

  const body = await page.locator("body").innerText();
  console.log("AI_CONSOLE_HAS_WINDOWS_BRANCH", body.includes("Windows") || body.includes("CUDA"));
  console.log("AI_CONSOLE_HAS_RUNTIME_PANEL", body.includes("AI 运行时管理"));
  console.log("AI_CONSOLE_TEXT_SAMPLE_START");
  console.log(body.slice(0, 4000));
  console.log("AI_CONSOLE_TEXT_SAMPLE_END");

  const branch = await page.evaluate(async () => {
    return window.electronAPI?.aiRuntime?.getWindowsAiBranchStatus?.();
  });
  console.log("WINDOWS_BRANCH_STATUS_START");
  console.log(JSON.stringify(branch, null, 2));
  console.log("WINDOWS_BRANCH_STATUS_END");

  const screenshot = path.join(process.env.USERPROFILE || userData, "Desktop", "dam-windows-ai-console.png");
  await page.screenshot({ path: screenshot, fullPage: false });
  console.log("SCREENSHOT", screenshot);

  const overflow = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    body: document.body.scrollWidth > document.body.clientWidth,
    viewport: { width: innerWidth, height: innerHeight },
  }));
  console.log("OVERFLOW", JSON.stringify(overflow));
} finally {
  await app.close();
}
'@ | Set-Content -Path $e2e -Encoding utf8

  node $e2e

  Write-Host "== Validation done =="
  Write-Host ("LOG_FILE=" + $log)
} finally {
  Stop-Transcript
}
