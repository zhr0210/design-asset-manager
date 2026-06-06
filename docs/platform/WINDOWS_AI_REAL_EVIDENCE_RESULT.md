# Windows AI Real Evidence Result

Status: validated on Windows host, ONNX artifacts still missing

This file is the GitHub handoff mailbox for Windows-host validation on branch
`codex/windows-ai-real-evidence`.

## Latest Reported Result

- Validation time: 2026-06-07 02:17, Windows host local time.
- Windows host: DESKTOP-3573AOS.
- GPU/CUDA: NVIDIA RTX 5060 Ti detected; PyTorch CUDA available.
- Torch CUDA execution: `python_cuda_execution` reported `success=true`,
  `status=executed_real`, `runtime=torch.cuda`, operation
  `tensor_square_sum`, and finite output.
- ONNX Runtime: importable; reported providers were `AzureExecutionProvider`
  and `CPUExecutionProvider`.
- `onnx_wd_tagger_load`: `success=false`, `status=artifact_missing`,
  `errorCode=MODEL_ARTIFACT_MISSING`.
- `onnx_clip_embedding`: `success=false`, `status=artifact_missing`,
  `errorCode=MODEL_ARTIFACT_MISSING`, `embeddingDimension=0`.
- Windows Platform AI Branch Status IPC: returned `success=true`,
  `platformBranch=windows`.
- Workflow statuses: `ai_tag_task`, `ai_prompt_task`, `ocr_text_box`, and
  `search_embedding` all reported `runtime_probe_ready`.
- Electron/Playwright AI Console: Windows AI branch status panel was visible;
  screenshot was captured on the Windows desktop.
- Overflow check: `doc=false`, `body=false`, viewport `1008x725`.
- Failures/blockers: WD Tagger and CLIP ONNX artifacts are missing on the
  Windows host, so ONNX workflows have runtime evidence but not real model
  load or embedding evidence.
- Next recommended action: install or download the smallest approved Windows
  ONNX WD Tagger and CLIP artifacts through app-owned model management, rerun
  this validation, then validate the Windows Llama CUDA GGUF/mmproj route.

The latest Windows-host log filename is
`dam-windows-ai-validation-20260607-021728.log`, and the screenshot filename is
`dam-windows-ai-console.png`.

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

The 2026-06-07 run also completed `npm ci`, `npm run typecheck`, `npm run build`, `npm run ci:test-runtime-safety`, Python unittest discovery with 107 tests, direct Windows AI probes, and Electron/Playwright screenshot capture. The app still reports ONNX WD Tagger and CLIP model artifacts as missing; this is an artifact readiness gap, not a CUDA runtime failure.
