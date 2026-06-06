# AI Worker Mock And Planned Capability Audit

This audit separates user-visible AI features into four implementation states:

- **Real model path**: output is produced by an installed local model or a configured external inference backend.
- **Mock inference path**: output is randomized, templated, simulated, or derived from filenames instead of model inference.
- **Mock fallback path**: a real wrapper exists, but missing dependencies, missing weights, or runtime failures silently fall back to mock output.
- **Planned capability**: product UI or capability metadata describes a route that is not yet wired to a real runnable backend.

## Executive Summary

The app currently contains several product-visible AI surfaces that look implemented but are not real model-backed paths yet.

- Qwen3-VL 2B through the Llama/OpenAI-compatible route is a real model path when the local Llama service and GGUF/mmproj are running.
- Python Worker manual prompt reverse and deep analysis still use pure mock model classes.
- Cooperative tagging wrappers for RAM++, Florence-2, CLIP, WD Tagger, translation, and Qwen-VL fallback can silently degrade into mock output.
- AI Runtime Management registers mock runtime providers in the product IPC manager, so runtime start and health checks can report mock health.
- macOS capability cards are mostly runtime probes and planned capability metadata; they do not prove models are downloaded, loaded, or usable.
- GPU/MPS telemetry is not random mock data, but Apple Silicon memory reporting is incomplete and does not show true process-level Metal/MPS memory.

## Current Remediation Status

- Product AI Runtime IPC no longer registers the mock runtime, mock external HTTP runtime, or mock Python Worker runtime.
- The product Python Worker runtime now points at the real AI Worker entrypoint and starts it with `DESIGN_ASSET_MANAGER_STRICT_REAL_AI=1`.
- The external HTTP runtime provider now defaults to a real `fetch` client; the mock HTTP client remains available for tests only.
- Python model wrappers now block simulated output in strict-real-AI mode through `core.mock_policy`.
- Pure mock Python prompt and analysis endpoints now reject production requests instead of queueing template-based mock workers.

## Product-Visible Mock Inference Paths

| Surface | Current state | Evidence | User impact | Required next step |
| --- | --- | --- | --- | --- |
| Manual prompt reverse via Python Worker | Pure mock inference path | `ai-service/workers/prompt_worker.py` loads `joycaption`, then instantiates `models.joycaption.JoyCaption`; `ai-service/models/joycaption.py` randomly chooses template prompts. | Results can look polished but are unrelated to the asset image. | Replace with a real JoyCaption-compatible model path, or route the UI exclusively to the real Qwen3-VL Llama path. |
| Manual deep visual analysis via Python Worker | Pure mock inference path | `ai-service/workers/analysis_worker.py` instantiates `models.qwen_vl.QwenVL`; `ai-service/models/qwen_vl.py` randomly chooses structured OCR/layout/tag payloads. | OCR text, layout tags, and evidence can be completely fabricated. | Remove from production UI until a real VLM backend is wired, or route to Qwen3-VL Llama/OpenAI-compatible analysis. |
| Product mock tag generator | Blocked by env guard, but still present as a product IPC/API surface | `src/main/ipc/asset-tag.ipc.ts` registers `mock-ai:generate-suggestions`; `src/main/services/mock-ai-tag.service.ts` writes random tag suggestions and mock captions/analysis; renderer still uses the method name `generateMockAiSuggestions`. | The UI naming and IPC shape still imply mock tagging is part of the feature. | Rename renderer/store API to real tagging, remove product IPC exposure, keep mock service only in tests. |
| AI Runtime Management mock runtime | Removed from product IPC | Product registration no longer creates `MockAiRuntimeProvider`, `MockAiRuntimeHttpClient`, or `MockAiRuntimeProcessRunner`. | Mock runtime cards should no longer appear from the product runtime list. | Keep mock provider classes test-only and guard against product re-registration. |
| Mock Python Worker runtime | Removed from product IPC | Product registration now creates `python-worker-runtime` with the real AI Worker entrypoint and strict-real-AI env. | Runtime start no longer represents a fake Python process. | Improve process stop/health behavior and surface real Worker logs. |
| Mock external HTTP runtime | Removed from product IPC | `ExternalHttpRuntimeProvider` defaults to a fetch-backed real HTTP client; tests can still inject the mock client. | External runtime health checks no longer use mock routes unless a test injects them. | Keep manual health checks explicit and user-initiated. |

## Model Wrappers With Silent Mock Fallbacks

These wrappers contain real-model loading attempts, but failure paths currently return simulated output instead of failing closed.

| Model family | Current fallback behavior | Evidence | User impact | Required next step |
| --- | --- | --- | --- | --- |
| RAM++ | Falls back to filename/contextual mock tags with random confidence. | `ai-service/models/ram_tagger.py` sets `is_mock = True` and calls `_simulate_mock_prediction`. | Generic tags may look plausible while no RAM++ weights ran. | Require downloaded weights and runtime dependencies before marking usable; surface `is_mock` as failure in product tagging. |
| Florence-2 | Falls back to simulated caption/OCR/object outputs. | `ai-service/models/florence2_tagger.py` uses `_simulate_mock_prediction` on load or inference failure. | Captions and design tags may be invented. | Use downloaded model directory, verify Transformers/PyTorch load, fail closed on fallback. |
| CLIP design classifier | Falls back to filename keyword matching and random scores. | `ai-service/models/clip_design_classifier.py` uses `_simulate_mock_classification`. | Design classification can jump or match filenames rather than image content. | Wire local model path and dependencies; treat mock classification as dev-only. |
| WD Tagger | Falls back to mock metadata and canned tags; can also try runtime Hugging Face download inside worker. | `ai-service/models/wd_tagger.py` sets `is_mock = True` after ONNX/dependency/model failure. | Anime/illustration tags can appear even when ONNX Runtime or weights are missing. | Use app-managed downloaded ONNX/CSV files; remove silent worker-side auto-download; fail closed when dependencies are missing. |
| Qwen-VL fallback analyzer in tag workflow | Falls back to simulated deep analysis when real Qwen2.5-VL wrapper fails. | `ai-service/models/qwen_vl_fallback_analyzer.py` uses `_simulate_mock_analysis`. | Low-confidence tag tasks can receive fabricated “deep fallback” tags. | Disable mock fallback in product tagging or route to the real Llama/OpenAI-compatible Qwen3-VL path. |
| Translation service | Falls back to dictionary/heuristic translation. | `ai-service/services/translation_service.py` uses `_translate_batch_mock`. | Caption localization can be marked as translated even when OPUS-MT is unavailable. | Label fallback translations distinctly or require the real translation model before claiming model translation. |
| Visual router CLIP scoring | Falls back to simulated visual scores when CLIP is mock or inference fails. | `ai-service/models/visual_router.py` uses `_simulate_mock_visual_scores`. | Asset category routing can be based on filenames/extensions rather than image content. | Use deterministic metadata-only routing when CLIP is unavailable, or surface “routing confidence unavailable.” |

## Planned Or Probe-Only Capabilities

| Area | Current state | Evidence | User impact | Required next step |
| --- | --- | --- | --- | --- |
| macOS Python MPS lane | Runtime probe, not full inference validation. | `ai-service/core/macos_ai_capabilities.py` checks imports such as `torch` and wrapper modules. | A card may say optional/planned/fallback without proving model weights can load. | Split “dependency present,” “weights present,” “model loaded,” and “last inference passed.” |
| macOS ONNX Runtime lane | Runtime probe, not model validation. | Same capability probe checks `onnxruntime`, RapidOCR/PaddleOCR imports, and CLIP/SigLIP ONNX compatibility. | ONNX routes can appear in the matrix before model files/providers are installed. | Add per-model download state and dry-run load checks. |
| Llama lane overview | Mixed real/planned state. | Capability probe hard-codes Qwen3-VL GGUF/MLX as planned while separate Llama runtime code can run the GGUF path. | Overview can say Llama service not running or planned even when Qwen3-VL 2B inference works elsewhere. | Connect overview to actual Llama runtime service state and selected backend health. |
| Qwen3-VL MLX | Removed by ADR-0007. | The previous dependency-only capability had no executable model lifecycle. | No longer appears as a product route or completion signal. | Reintroduce only through an evidence-backed provider. |
| Qwen2.5-VL Ollama fallback | Configurable fallback metadata. | AI Console renders fallback summary from configured backends; no automatic health probe. | Can look like an available fallback without configured Ollama model health. | Require explicit backend health/model-list check before “ready.” |
| External HTTP fallback | Configurable fallback metadata. | External backend cards are based on settings/manual checks, not automatic probing. | Can look configured but be unavailable. | Show last manual health result and disabled/unconfigured state compactly. |
| OCR dependency governance | Installer is intentionally deferred. | `src/main/services/ocr-governance.service.ts` sets `autoInstall: false`, `installerDeferred: true`. | EasyOCR/RapidOCR/PaddleOCR can be visible as providers before dependencies exist. | Build explicit install/status flow per OCR provider or hide unavailable providers. |

## Development Or Non-AI Fallbacks

| Area | Current state | Evidence | Product guidance |
| --- | --- | --- | --- |
| Mock text boxes | Dev/test mock provider with production guard. | `src/main/services/text-detection/mock-text-box-provider.ts` returns empty in packaged production. | Keep test-only; remove from product provider selection unless developer mode is active. |
| Color palette mock quantizer | Non-AI algorithm fallback when native image packages fail. | `src/main/services/color-palette.service.ts` generates `mock_fallback` palettes and queues refresh later. | Acceptable as a visual-analysis fallback if clearly labeled and refreshed when native deps are available. |
| Browser/search/download web-environment mocks | Renderer fallback for non-Electron or demo environments. | Renderer stores contain web fallback mocks. | Not part of AI Worker, but should not appear in packaged production feature validation. |

## Features That Are Not Mock But Are Incomplete

| Feature | Current state | Gap |
| --- | --- | --- |
| Qwen3-VL 2B prompt reverse through Llama/OpenAI-compatible route | Real path when local Llama service is started and selected GGUF/mmproj are present. | AI Console overview does not consistently bind to real Llama service state. |
| GPU/MPS telemetry | Not random mock data. CUDA/NVML and MPS probes exist. | Apple Silicon reports estimated unified-memory budget, not real per-process MPS/Metal memory. Missing `torch` prevents MPS probe. |
| Cooperative model download UI | Backend and UI have a download path, but failures can still occur if Python/HF dependencies, network, or registry paths are wrong. | Download success must be connected to model-manager path resolution and load validation. |
| Design rule tagger | Real rule-based heuristic, not AI mock. | Should be labeled as rule-based, not presented as model inference. |
| Tag fusion and localization dictionaries | Real deterministic processing. | Downstream quality still depends on whether upstream tags are real or mock. |

## Recommended Remediation Order

1. Remove or hide product-visible mock runtimes and rename renderer APIs that still say `mock`.
2. Make Python Worker model wrappers fail closed in packaged/product mode when `is_mock` would be used.
3. Add a per-model state machine: `not_downloaded`, `downloaded`, `dependency_missing`, `load_failed`, `loaded_real`, `mock_blocked`, `last_inference_passed`.
4. Connect AI Console overview to actual Llama runtime health for the selected Qwen3-VL backend.
5. Replace pure mock PromptWorker and AnalysisWorker with real Qwen3-VL/Llama routes or hide them until implemented.
6. Compact the compatibility UI into dense rows showing dependency, weights, load, inference, and last error.

## Open Terminology Decision

Recommended canonical split:

- Use **Mock Inference Path** only when an output is simulated.
- Use **Planned Capability** when a route is visible but not runnable yet.
- Use **Runtime Probe** when a dependency check is informational but not inference validation.
- Use **Real Model Path** only after a backend can load weights and complete an inference smoke test.
