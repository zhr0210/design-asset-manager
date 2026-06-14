param(
  [string]$RepoRoot = (Resolve-Path ".").Path,
  [string]$LogRoot = (Join-Path $env:USERPROFILE "Desktop")
)

$ErrorActionPreference = "Stop"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$log = Join-Path $LogRoot "dam-windows-ai-validation-$stamp.log"

function ConvertTo-RedactedText {
  param([string]$Message)
  $redacted = $Message
  if ($env:USERPROFILE) {
    $redacted = $redacted.Replace($env:USERPROFILE, "<USERPROFILE>")
  }
  if ($env:TEMP) {
    $redacted = $redacted.Replace($env:TEMP, "<TEMP>")
  }
  if ($RepoRoot) {
    $redacted = $redacted.Replace($RepoRoot, "<REPO_ROOT>")
    $redacted = $redacted.Replace($RepoRoot.Replace("\", "/"), "<REPO_ROOT>")
  }
  $redacted = [regex]::Replace($redacted, '(?i)\b[A-Z]:[\\/][^"\r\n]*', '<LOCAL_PATH>')
  return $redacted
}

function Write-Log {
  param([string]$Message)
  $line = ConvertTo-RedactedText $Message
  Write-Host $line
  Add-Content -LiteralPath $log -Value $line -Encoding utf8
}

function Invoke-LoggedNative {
  param(
    [string]$Command,
    [string[]]$Arguments = @()
  )
  Write-Log ("> " + $Command + " " + ($Arguments -join " "))
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = @(& $Command @Arguments 2>&1)
    $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  foreach ($item in $output) {
    Write-Log ([string]$item)
  }
  if ($exitCode -ne 0) {
    throw "$Command exited with code $exitCode"
  }
}

function Invoke-PythonSnippet {
  param(
    [string]$Name,
    [string]$Source
  )
  $scriptPath = Join-Path $env:TEMP "$Name.py"
  Set-Content -Path $scriptPath -Value $Source -Encoding utf8
  try {
    Invoke-LoggedNative "python" @($scriptPath)
  } finally {
    Remove-Item -LiteralPath $scriptPath -Force -ErrorAction SilentlyContinue
  }
}

New-Item -ItemType Directory -Force -Path $LogRoot | Out-Null
Set-Content -LiteralPath $log -Value "" -Encoding utf8

try {
  Write-Log "== Validation start =="
  Write-Log ("Time: " + (Get-Date))
  Write-Log ("Computer: " + $env:COMPUTERNAME)
  Write-Log ("User: " + $env:USERNAME)
  Write-Log ("RepoRoot: " + $RepoRoot)

  Set-Location $RepoRoot

  Write-Log "== Git state =="
  Invoke-LoggedNative "git" @("status", "--short")
  Invoke-LoggedNative "git" @("log", "-1", "--oneline")

  Write-Log "== Tool versions =="
  Invoke-LoggedNative "git" @("--version")
  Invoke-LoggedNative "node" @("--version")
  Invoke-LoggedNative "npm.cmd" @("--version")
  Invoke-LoggedNative "python" @("--version")
  Write-Log ("git: " + (Get-Command git -ErrorAction SilentlyContinue).Source)
  Write-Log ("node: " + (Get-Command node -ErrorAction SilentlyContinue).Source)
  Write-Log ("npm: " + (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source)
  Write-Log ("python: " + (Get-Command python -ErrorAction SilentlyContinue).Source)

  Write-Log "== GPU =="
  Invoke-LoggedNative "nvidia-smi" @("--query-gpu=name,driver_version,memory.total", "--format=csv,noheader")
  Invoke-PythonSnippet -Name "dam-windows-ai-gpu-probe" -Source @'
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
'@

  Write-Log "== Install Node deps =="
  Invoke-LoggedNative "npm.cmd" @("ci")

  Write-Log "== Typecheck/build =="
  Invoke-LoggedNative "npm.cmd" @("run", "typecheck")
  Invoke-LoggedNative "npm.cmd" @("run", "build")

  Write-Log "== Runtime safety tests =="
  Invoke-LoggedNative "npm.cmd" @("run", "ci:test-runtime-safety")

  Write-Log "== Python unit tests =="
  $env:HF_HUB_OFFLINE = "1"
  $env:DESIGN_ASSET_MANAGER_DISABLE_USER_DATA_ACCESS = "1"
  $testRoot = Join-Path $env:TEMP ("design-asset-manager-tests-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $testRoot | Out-Null
  $env:DESIGN_ASSET_MANAGER_TASK_CACHE_DB = Join-Path $testRoot "tasks-cache.db"
  $env:PYTHONPYCACHEPREFIX = Join-Path $testRoot "pycache"
  try {
    Invoke-LoggedNative "python" @("-u", "-m", "unittest", "discover", "-s", "ai-service/tests", "-v")
  } finally {
    Remove-Item -LiteralPath $testRoot -Recurse -Force -ErrorAction SilentlyContinue
  }

  Write-Log "== Windows AI direct probes =="
  $env:PYTHONPATH = Join-Path $RepoRoot "ai-service"
  Invoke-PythonSnippet -Name "dam-windows-ai-direct-probes" -Source @'
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
'@
  Write-Log "== OCR generated-image real evidence probe =="
  Invoke-LoggedNative "python" @("ai-service/tools/probe_ocr_real_evidence.py", "--provider", "auto")

  Write-Log "== Electron/Playwright smoke =="
  $e2eRoot = Join-Path $RepoRoot "dist-temp"
  New-Item -ItemType Directory -Force -Path $e2eRoot | Out-Null
  $e2e = Join-Path $e2eRoot "dam-windows-ai-runtime-e2e.mjs"
  @'
import { _electron as electron } from "playwright";
import path from "node:path";
import fs from "node:fs/promises";

const repo = process.cwd();
const userData = path.join(process.env.TEMP || ".", "dam-win-ai-e2e-" + Date.now());
await fs.mkdir(userData, { recursive: true });

const redact = (value) => {
  let text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  for (const [label, raw] of [
    ["<REPO_ROOT>", repo],
    ["<USERPROFILE>", process.env.USERPROFILE],
    ["<TEMP>", process.env.TEMP],
  ]) {
    if (raw) text = text.split(raw).join(label);
  }
  return text.replace(/\b[A-Z]:[\\/][^"\r\n]*/gi, "<LOCAL_PATH>");
};

const electronExe = path.join(repo, "node_modules", "electron", "dist", "electron.exe");
const launchOptions = {
  args: [repo, "--user-data-dir=" + userData],
  cwd: repo,
  timeout: 60000,
};

try {
  await fs.access(electronExe);
  launchOptions.executablePath = electronExe;
} catch {}

const app = await electron.launch(launchOptions);

try {
  const page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded", { timeout: 30000 });
  await page.evaluate(() => { location.hash = "#/ai-console"; });
  await page.waitForTimeout(3000);

  const ipcProbe = await page.evaluate(async () => {
    const aiRuntime = window.electronAPI?.aiRuntime;
    return {
      cuda: await aiRuntime?.probePythonCudaRuntime?.(),
      wdTagger: await aiRuntime?.probeOnnxModelLoad?.({ modelFamily: "wd_tagger" }),
      clip: await aiRuntime?.probeOnnxModelLoad?.({ modelFamily: "clip" }),
      ocr: await aiRuntime?.probeOcrRealEvidence?.(),
    };
  });
  console.log("RUNTIME_EVIDENCE_IPC_START");
  console.log(redact(ipcProbe));
  console.log("RUNTIME_EVIDENCE_IPC_END");

  if (ipcProbe.cuda?.data?.status !== "executed_real" || ipcProbe.cuda?.data?.resultFinite !== true) {
    throw new Error("CUDA execution IPC did not produce finite executed_real evidence");
  }
  if (ipcProbe.wdTagger?.data?.status !== "loaded_real") {
    throw new Error("WD Tagger ONNX IPC did not produce loaded_real evidence");
  }
  if (
    ipcProbe.clip?.data?.status !== "loaded_real"
    || ipcProbe.clip?.data?.resultFinite !== true
    || ipcProbe.clip?.data?.embeddingDimension !== 512
  ) {
    throw new Error("CLIP ONNX IPC did not produce finite 512d loaded_real evidence");
  }
  if (
    ipcProbe.ocr?.data?.generatedFixture !== true
    || ipcProbe.ocr?.data?.downloadsAllowed !== false
  ) {
    throw new Error("OCR IPC did not preserve generated-fixture and no-download safety");
  }

  const llamaProbe = await page.evaluate(async () => {
    const api = window.electronAPI;
    try {
      let plan = await api?.llamaRuntimeCreateInstallPlan?.({ downloadSource: "huggingface" });
      const selected = plan?.modelCandidates?.find((model) => model.id === "qwen3-vl-2b-instruct-q4-k-m") ?? plan?.recommendedModel;
      if (plan && selected) {
        plan = {
          ...plan,
          recommendedModel: selected,
          modelDir: `${plan.installRoot}\\models\\gguf\\${selected.id}`,
        };
      }
      const modelPath = plan && selected ? `${plan.modelDir}\\${selected.filename}` : undefined;
      const start = await api?.llamaRuntimeStartServer?.({ plan, modelPath });
      const probe = await api?.llamaRuntimeTestServer?.({ baseUrl: start?.baseUrl });
      return { selectedModel: selected?.id, start, probe };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
  console.log("LLAMA_MULTIMODAL_IPC_START");
  console.log(redact(llamaProbe));
  console.log("LLAMA_MULTIMODAL_IPC_END");

  const refreshLabel = "\u5237\u65b0\u72b6\u6001";
  await page.locator("button").filter({ hasText: refreshLabel }).first().click({ timeout: 10000 });
  await page.waitForTimeout(3000);

  const body = await page.locator("body").innerText();
  console.log("AI_CONSOLE_HAS_WINDOWS_BRANCH", body.includes("Windows") || body.includes("CUDA"));
  console.log("AI_CONSOLE_HAS_RUNTIME_PANEL", body.includes("AI") && body.includes("Runtime"));
  console.log("AI_CONSOLE_TEXT_SAMPLE_START");
  console.log(redact(body.slice(0, 4000)));
  console.log("AI_CONSOLE_TEXT_SAMPLE_END");

  const branch = await page.evaluate(async () => {
    return window.electronAPI?.aiRuntime?.getWindowsAiBranchStatus?.();
  });
  console.log("WINDOWS_BRANCH_STATUS_START");
  console.log(redact(branch));
  console.log("WINDOWS_BRANCH_STATUS_END");

  const workflows = branch?.data?.workflows ?? [];
  const tagging = workflows.find((item) => item.workflow === "ai_tag_task");
  const prompt = workflows.find((item) => item.workflow === "ai_prompt_task");
  const ocr = workflows.find((item) => item.workflow === "ocr_text_box");
  const embedding = workflows.find((item) => item.workflow === "search_embedding");
  const cudaEvidence = workflows
    .flatMap((item) => item.runtimeLanes ?? [])
    .filter((lane) => lane.lane === "python_cuda")
    .flatMap((lane) => lane.evidence ?? []);

  if (!cudaEvidence.some((item) => item.source === "worker_probe" && item.code === "runtime_probe_ready")) {
    throw new Error("Windows branch status did not project cached CUDA worker_probe evidence");
  }
  if (tagging?.status !== "real_model_path" || embedding?.status !== "real_model_path") {
    throw new Error("Windows ONNX workflows did not retain real_model_path status");
  }
  if (llamaProbe?.probe?.success === true && prompt?.status !== "real_model_path") {
    throw new Error("Successful Llama multimodal evidence did not promote the prompt workflow");
  }
  if (ocr?.status === "real_model_path") {
    throw new Error("Insufficient OCR evidence was incorrectly promoted to real_model_path");
  }
  const ocrEvidence = ocr?.runtimeLanes
    ?.flatMap((lane) => lane.evidence ?? [])
    ?.find((item) => item.code === "artifact_missing" || item.code === "dependency_missing");
  if (!ocrEvidence) {
    throw new Error("Windows branch status did not project structured OCR missing evidence");
  }

  const branchStatusPanel = page.getByTestId("platform-ai-branch-status");
  if (await branchStatusPanel.count() === 0) {
    throw new Error("Platform AI branch status panel was not found");
  }
  await branchStatusPanel.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  const screenshot = path.join(process.env.USERPROFILE || userData, "Desktop", "dam-windows-ai-console.png");
  await page.screenshot({ path: screenshot, fullPage: false });
  console.log("SCREENSHOT", path.join("<DESKTOP>", path.basename(screenshot)));

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

  Invoke-LoggedNative "node" @($e2e)

  Write-Log "== Validation done =="
  Write-Log ("LOG_FILE=" + $log)
} catch {
  Write-Log ("VALIDATION_FAILED " + $_.Exception.Message)
  throw
}
