# Windows AI Real Evidence Result

Status: validated through commit `8d53d03` on 2026-06-14.

This is the sanitized Windows evidence baseline for the
`codex/windows-ai-real-evidence` branch. Detailed logs and screenshots remain
outside the repository.

## Validation Gate

- `npm ci`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm run ci:test-runtime-safety`: passed.
- Python unittest discovery: 142 tests passed.
- Full `scripts/windows-ai-real-evidence-validation.ps1`: passed.
- Electron/Playwright viewport: `1008x725`.
- Document/body horizontal overflow: absent.

## Real Evidence

| Workflow | Evidence | Status |
| --- | --- | --- |
| AI Tag Task | WD Tagger ONNX Session loaded; real provider input/output shape validated. | `real_model_path` |
| Search Embedding | CLIP ONNX generated-image/text execution returned finite 512-dimensional output. | `real_model_path` |
| AI Prompt Task | Llama CUDA loaded GGUF/mmproj and completed text plus generated-image inference. | `real_model_path` |
| OCR Text Box | Explicit generated-image probe ran without downloads; dependency/artifact requirements were incomplete. | `runtime_probe_ready` |

CUDA fixed-tensor execution also completed with finite output. Runtime
execution evidence was kept separate from model-load and inference evidence.

## OCR Result

- The product operation was explicitly triggered.
- The input was a generated temporary PNG.
- `generatedFixture=true`.
- `downloadsAllowed=false`.
- RapidOCR reported a missing dependency.
- EasyOCR reported a missing local model artifact.
- The branch status retained structured `artifact_missing` evidence and an
  `ocr-model-artifact` missing requirement.
- No user asset, model-cache path, package installation, external service, or
  model download was used.

OCR must not be promoted until a separately approved dependency/artifact slice
installs the required local resources and the generated-image probe completes
finite inference with at least one Text Box.

## Product Surface

Electron/Playwright verified that:

- all four shared workflows were visible;
- Windows platform evidence appeared inside runtime lanes rather than changing
  the shared workflow shape;
- status labels and actions fit without overlap;
- refresh preserved the in-process evidence cache;
- no automatic install or download was triggered.

## Remaining Decision

The Windows AI validation assignment is complete. The only open AI evidence
decision is whether to authorize OCR dependency and model-artifact acquisition.
That decision is independent from the next shared Runtime Package Executor
slice.
