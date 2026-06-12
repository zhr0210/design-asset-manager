# Windows AI Real Evidence Result

Status: validated on Windows host; CUDA execution, WD Tagger ONNX, CLIP ONNX,
and Llama CUDA GGUF/mmproj real evidence are closed.

This file is the GitHub handoff mailbox for Windows-host validation on branch
`codex/windows-ai-real-evidence`.

## Latest Reported Result

- Validation time: 2026-06-12 14:54, Windows host local time.
- Commit tested: worktree based on `5d3ec39`, with the AI Console shared Worker
  probe overview slice applied.
- Windows host: DESKTOP-3573AOS.
- GPU/CUDA: NVIDIA RTX 5060 Ti detected; PyTorch CUDA available.
- Validation command: `scripts/windows-ai-real-evidence-validation.ps1`.
- Checks passed: `npm ci`, `npm run typecheck`, `npm run build`,
  `npm run ci:test-runtime-safety`, Python unittest discovery, direct Windows AI
  probes, focused Electron/Playwright AI Console validation, and the required
  preflight TypeScript/shared-contract validation gate.
- `npm ci`: passed with npm audit/deprecation warnings.
- `npm run typecheck`: passed.
- `npm run build`: passed with existing Vite mixed dynamic/static import
  warnings.
- `npm run ci:test-runtime-safety`: passed.
- Python unittest discovery: passed.
- Llama IPC refresh: selected `qwen3-vl-2b-instruct-q4-k-m`, started
  `llama-server`, and ran text plus generated-image multimodal probe.
- Llama multimodal probe: `chatOk=true`, `visionOk=true`, `success=true`,
  `visionInput=generated_fixture`.
- Windows Platform AI Branch Status: returned `success=true`,
  `platformBranch=windows`; `ai_tag_task`, `ai_prompt_task`, and
  `search_embedding` reported `real_model_path`.
- Llama CUDA lane: reported `real_model_path` with `artifact_ready` and
  `real_backend_loaded` evidence from text plus generated-image inference.
- Electron/Playwright AI Console: screenshot captured on the Windows desktop.
- Overflow check: `doc=false`, `body=false`, viewport `1264x793`.
- Focused validation gate before the full script also passed:
  `scripts/ai-runtime-status-workflow.test.ts`,
  `scripts/ai-runtime-panel-contract.test.ts`,
  `scripts/ai-console-macos-branch.test.ts`,
  `scripts/macos-ai-runtime.test.ts`, `npm run typecheck`, `npm run build`,
  `python scripts/check-docs-sync.py`, and `git diff --check`.
- Shared-surface slice: AI Console now keeps the raw Worker probe passed to
  overview as `PlatformAiWorkerProbeWithRuntimeVersions` and passes a
  renderer-ready `MacOSAiWorkerProbeDisplay` for macOS-only diagnostic tiles,
  keeping the concrete macOS Worker probe result at the IPC projection boundary.
- Failures/blockers: none for the Windows real-evidence routes covered by this
  slice.
- Next recommended action: continue auditing AI Console and Settings component
  props for shared renderer-ready types while keeping concrete macOS/Windows
  probe result types at IPC and platform-specific projector boundaries.

The latest full Windows-host validation log filename is
`dam-windows-ai-validation-20260612-145446.log`, and the screenshot filename is
`dam-windows-ai-console.png`.

## Previous Reported Result

- Validation time: 2026-06-07 02:17, Windows host local time.
- Windows host: DESKTOP-3573AOS.
- GPU/CUDA: NVIDIA RTX 5060 Ti detected; PyTorch CUDA available.
- Torch CUDA execution: `python_cuda_execution` reported `success=true`,
  `status=executed_real`, `runtime=torch.cuda`, operation
  `tensor_square_sum`, and finite output.
- ONNX Runtime: importable; reported providers were `AzureExecutionProvider`
  and `CPUExecutionProvider`.
- `onnx_wd_tagger_load`: initially reported `artifact_missing`. After the
  app-owned cooperative WD Tagger artifact download, the direct Python probe
  reported `success=true`, `status=loaded_real`, provider
  `CPUExecutionProvider`, operation `session_load`, finite result, and 1 input /
  1 output.
- `onnx_clip_embedding`: initially reported `artifact_missing`. After the CLIP
  family download was extended with the app-owned ONNX embedding artifact, the
  probe reported `success=true`, `status=loaded_real`, provider
  `CPUExecutionProvider`, operation `image_text_embedding`, finite output, and a
  512-dimensional image embedding.
- Windows Platform AI Branch Status IPC: returned `success=true`,
  `platformBranch=windows`.
- Workflow statuses before the WD artifact download: `ai_tag_task`,
  `ai_prompt_task`, `ocr_text_box`, and `search_embedding` all reported
  `runtime_probe_ready`.
- Workflow statuses after the WD artifact download and IPC probe:
  `ai_tag_task` reported `real_model_path`; ONNX Runtime lane reported
  `real_model_path` with real-backend-loaded evidence.
- Workflow statuses after the CLIP ONNX artifact download and IPC probe:
  `search_embedding` reported `real_model_path`; the CLIP/SigLIP ONNX lane
  reported `real_model_path` with `CPUExecutionProvider` and 512-dimensional
  embedding evidence.
- Electron/Playwright AI Console: Windows AI branch status panel was visible;
  screenshot was captured on the Windows desktop.
- Overflow check: `doc=false`, `body=false`, viewport `1008x725`.
- Failures/blockers at that time: Windows Llama CUDA GGUF/mmproj evidence was
  still insufficient for `real_model_path`.
- Next recommended action at that time: validate the Windows Llama CUDA
  GGUF/mmproj route with real prompt/image evidence.

The previous full Windows-host validation log filename was
`dam-windows-ai-validation-20260607-024905.log`, and the screenshot filename is
`dam-windows-ai-console.png`. A later focused Electron smoke verified that the
UI refresh path shows Windows real-model evidence after calling the WD Tagger
and CLIP ONNX preload probes.

## Re-run Command

The Windows-host Codex can rerun:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\windows-ai-real-evidence-validation.ps1
```

Then update this file with a sanitized result summary and push it to the same
branch. Do not include secrets, full private paths, model cache paths, or image
payloads.

## Required Result Summary

- Validation time:
- Windows host:
- Commit tested:
- `npm ci`:
- `npm run typecheck`:
- `npm run build`:
- `npm run ci:test-runtime-safety`:
- `npm run test-python-unittest`:
- `nvidia-smi` summary:
- Torch CUDA summary:
- `windows_capabilities`:
- `python_cuda_status`:
- `python_cuda_execution`:
- `onnx_wd_tagger_load`:
- `onnx_clip_embedding`:
- Windows Platform AI Branch Status workflows:
- Electron/Playwright AI Console:
- Screenshot:
- Overflow check:
- Failures/blockers:
- Next recommended action:

## Privacy Rules

Do not include secrets, tokens, cookies, full private asset paths, full model
cache paths, private image data, or base64/binary payloads.


## Additional validation run

The 2026-06-07 runs completed `npm ci`, `npm run typecheck`, `npm run build`,
`npm run ci:test-runtime-safety`, Python unittest discovery with 111 tests,
direct Windows AI probes, and Electron/Playwright checks. The final focused
Electron smoke reported WD Tagger and CLIP as `loaded_real`, CLIP embedding
dimension 512, `ai_tag_task` and `search_embedding` as `real_model_path`, and no
horizontal overflow at a 1008x725 viewport. CLIP ONNX is now a closed Windows
real-evidence route.

## Additional Llama GGUF/mmproj validation run

On 2026-06-11, a focused Electron/Playwright run on DESKTOP-3573AOS synced the
branch to `e350a97`, invoked the existing Llama IPC path, selected Qwen3-VL 2B
Q4_K_M for the smallest useful Windows evidence slice, installed the llama.cpp
CUDA 13 runtime plus cudart package, downloaded the matching GGUF and mmproj
artifacts, started `llama-server`, and ran the shared text plus generated-image
`probeLlamaServer()` validation.

Sanitized result:

- Hardware: NVIDIA RTX 5060 Ti, CUDA 13.2 reported by the Llama hardware probe.
- Selected model: `qwen3-vl-2b-instruct-q4-k-m`.
- Llama server: started through `llamaRuntimeStartServer`, model list returned
  `Qwen3VL-2B-Instruct-Q4_K_M.gguf`.
- Multimodal probe: `chatOk=true`, `visionOk=true`, `success=true`,
  `visionInput=generated_fixture`.
- Windows Platform AI Branch Status: `ai_prompt_task` promoted to
  `real_model_path`; `llama_cuda` lane included `real_backend_loaded` evidence
  from text plus generated-image inference.
- Electron/Playwright screenshot: `dam-windows-llama-ai-console.png` captured
  on the Windows desktop.

`scripts/windows-ai-real-evidence-validation.ps1` now also calls the Llama
start/test IPC path before reading Windows Platform AI Branch Status, so future
full validation runs refresh the in-process Llama multimodal evidence before
asserting branch status.

The later full run at commit `e947443` confirmed the same route through the full
Windows validation script: `ai_prompt_task` and the `llama_cuda` lane both
reported `real_model_path`, and the screenshot overflow check remained clean.
