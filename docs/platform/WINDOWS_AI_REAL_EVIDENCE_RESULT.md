# Windows AI Real Evidence Result

Status: validated on Windows host; CUDA execution, WD Tagger ONNX, CLIP ONNX,
and Llama CUDA GGUF/mmproj real evidence are closed.

This file is the GitHub handoff mailbox for Windows-host validation on branch
`codex/windows-ai-real-evidence`.

## Latest Reported Result

- Validation time: 2026-06-13 00:17, Windows host local time.
- Commit tested: worktree based on `2f07e8d`, with branch-keyed Platform AI
  runtime request and branch-to-OS metadata applied.
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
  `llama-server`, and ran text plus generated-image multimodal inference.
- Llama multimodal probe: `chatOk=true`, `visionOk=true`, `success=true`,
  `visionInput=generated_fixture`.
- Windows Platform AI Branch Status: returned `success=true`,
  `platformBranch=windows`; `ai_tag_task`, `ai_prompt_task`, and
  `search_embedding` reported `real_model_path`, while `ocr_text_box` reported
  `runtime_probe_ready`.
- Llama CUDA lane: reported `real_model_path` with `artifact_ready` and
  `real_backend_loaded` evidence from text plus generated-image inference.
- Electron/Playwright AI Console: screenshot captured on the Windows desktop.
- Overflow check: `doc=false`, `body=false`, viewport `1266x795`.
- Focused validation gate before the full script also passed:
  `scripts/ai-runtime-status-workflow.test.ts`,
  `scripts/ai-runtime-panel-contract.test.ts`,
  `scripts/ai-console-macos-branch.test.ts`,
  `scripts/macos-ai-runtime.test.ts`, `npm run typecheck`, `npm run build`,
  `python scripts/check-docs-sync.py`, and `git diff --check`.
- Shared-surface slice: `PLATFORM_AI_RUNTIME_REQUEST_METHODS` now maps
  `PlatformAiBranch` to the existing concrete preload methods, and
  `PLATFORM_BRANCH_PLATFORMS` maps branch status projection to real OS platform
  names. Concrete IPC methods, channel names, response shapes, and
  unsupported-platform semantics are unchanged.
- Privacy check: zero absolute Windows paths were found in the saved log.
- Failures/blockers: none for the Windows real-evidence routes covered by this
  run.
- Next recommended action: keep future slices focused on any newly discovered
  renderer/shared product workflow branching; the remaining audited platform
  checks are genuine OS/runtime/path/process boundaries unless new evidence
  contradicts that classification.

The latest full Windows-host validation log filename is
`dam-windows-ai-validation-20260613-001631.log`, and the screenshot filename is
`dam-windows-ai-console.png`.

## Post-Validation Audit-Only Update

On 2026-06-13, after the full Windows validation above, a source-contract audit
was added to `scripts/ai-runtime-status-workflow.test.ts`. It confirms that
renderer/shared Platform AI surfaces do not contain direct
`platformBranch === "windows"` or `platformBranch === "macos"` control flow,
and records the remaining platform-check files as audited OS/runtime/path/process
boundaries. This audit-only slice did not change product-facing renderer code,
runtime code, IPC channels, shared response fields, database schema, or AI
Worker HTTP API shapes, so no new Windows screenshot or runtime-evidence claim
is added here.

A later 2026-06-13 shared-workflow refactor moved current branch-runtime
metadata lookup to branch-keyed descriptors and preserved the existing
Windows-then-macOS current-platform lookup order in a focused source contract.
That change also did not alter renderer output, runtime behavior, IPC channels,
shared response fields, database schema, or AI Worker HTTP API shapes, so the
latest full Windows evidence remains the validation run reported above.

Another 2026-06-13 main-process refactor moved Platform AI branch runtime
provider registration to descriptors while preserving the existing runtime ids,
platforms, profile rules, and metadata keys. That registration-only change did
not alter renderer output, runtime probing, IPC channels, shared response
fields, database schema, or AI Worker HTTP API shapes; no new Windows runtime
evidence is claimed for it.

A further 2026-06-13 bootstrap refactor moved the Python Worker auto-start OS
set to `PYTHON_WORKER_AUTOSTART_PLATFORMS`, preserving the existing macOS and
Windows behavior. It did not alter renderer output, runtime probing, IPC
channels, shared response fields, database schema, or AI Worker HTTP API shapes;
no new Windows runtime evidence is claimed for it.

A subsequent 2026-06-13 runtime resolver refactor moved default profile and
hardware-hint selection into ordered metadata rules while preserving the
existing Windows CPU/CUDA and macOS arm64/x64 recommendations. It did not alter
renderer output, runtime probing, IPC channels, shared response fields,
database schema, or AI Worker HTTP API shapes; no new Windows runtime evidence
is claimed for it.

A later 2026-06-13 platform detector refactor moved platform-profile mapping
to `PLATFORM_PROFILE_RULES`, preserving existing win32/darwin/linux profile
outputs and the real OS capability booleans. It did not alter renderer output,
runtime probing, IPC channels, shared response fields, database schema, or AI
Worker HTTP API shapes; no new Windows runtime evidence is claimed for it.

A later 2026-06-13 Doctor display refactor moved platform-label projection to
`DOCTOR_PLATFORM_LABELS`, preserving the macOS display label and Windows raw
platform fallback. It did not alter renderer layout, runtime probing, IPC
channels, shared response fields, database schema, or AI Worker HTTP API shapes;
no new Windows runtime evidence is claimed for it.

A later 2026-06-13 shared default-policy refactor moved the Platform AI default
branch fallback to `DEFAULT_PLATFORM_AI_BRANCH`, preserving the existing macOS
fallback for branch resolution, Worker diagnostics selection, capability-matrix
defaults, AI Runtime settings initial state, and AI Console initial state. It
did not alter renderer layout, runtime probing, IPC channels, shared response
fields, database schema, or AI Worker HTTP API shapes; no new Windows runtime
evidence is claimed for it.

The immediately preceding full-route success log is
`dam-windows-ai-validation-20260612-172616.log`; it recorded
`chatOk=true`, `visionOk=true`, `success=true`, and
`ai_prompt_task=real_model_path`.

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
