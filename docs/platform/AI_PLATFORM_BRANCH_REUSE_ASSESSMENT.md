# Windows / macOS AI Platform Branch Reuse Assessment

Design Asset Manager keeps shared product workflows and branches only where
runtime or operating-system behavior is genuinely different.

## Current Baseline

| Area | Shared implementation | Platform adaptation |
| --- | --- | --- |
| Product status | Platform AI Branch Status response, workflow status, evidence/missing vocabulary, action routing, Chinese UI | Runtime-lane evidence values |
| AI task flow | Electron-owned Queue Sync, task/result projection, Tag Suggestion projection | Model execution backend |
| Small-model readiness | Model Readiness contracts and projectors | CUDA, MPS, ONNX provider and dependency probes |
| Large vision | OpenAI-compatible request/result shape and Llama multimodal evidence | llama.cpp CUDA on Windows, llama.cpp Metal on macOS |
| Runtime lifecycle | Runtime Registry, plans, health/result shapes | Package artifacts, executable names, process and quarantine behavior |
| Packaging | electron-builder configuration, Package Smoke intent | Windows signing/NSIS and macOS signing/notarization |

## Evidence Status

| Workflow | Windows AI Branch | macOS AI Branch |
| --- | --- | --- |
| AI Tag Task | WD Tagger ONNX real evidence | WD Tagger ONNX real evidence |
| Search Embedding | CLIP ONNX finite embedding | CLIP ONNX finite embedding |
| AI Prompt Task | Llama CUDA GGUF/mmproj text plus generated-image evidence | Llama Metal GGUF/mmproj scoped evidence |
| OCR Text Box | Generated-image probe; local artifact missing | Generated-image probe; dependency missing |

Runtime probes, fixed-tensor accelerator execution, model readiness, and Real
Model Path evidence remain separate states.

## Shared As-Is

- AI Console workflow and status surfaces.
- Dedicated platform status IPC channels with one response shape.
- Platform AI Action Plan routing.
- AI task and Queue Sync contracts.
- Model Readiness and evidence projection.
- Prompt templates and structured result schemas.
- Runtime Registry and managed-path concepts.
- Privacy, fail-closed, and user-triggered operation rules.

## Shared Through Adapters

- CUDA and MPS compatibility/execution probes behind shared descriptor-driven
  IPC flows, with platform response types and evidence lanes kept distinct.
  The focused Python execution evidence test runs in cross-platform runtime
  safety CI.
- macOS and Windows raw capability probes behind one descriptor-driven IPC
  registration flow while retaining separate probe methods and response types.
- ONNX execution-provider selection.
- Llama package selection and process launch.
- OCR interpreter and dependency discovery.
- Runtime archive and executable handling.
- Windows Sandbox and macOS packaged-app smoke.
- Signing, quarantine, and notarization checks.

These are real seams because at least Windows and macOS provide different
adapters. Product workflow modules must not contain direct platform control
flow when an existing adapter can own the difference.

## Not Shared

- CUDA VRAM policy and NVIDIA package requirements.
- Apple unified-memory estimates and MPS/Metal capability rules.
- Platform-native executable and archive formats.
- Windows code-signing and macOS notarization implementation.

Do not create separate renderer workflows, response shapes, or task semantics
for these differences.

## Current Recommendation

The AI branch architecture is complete enough to stop broad platform refactors.
The next maintenance-cost reduction is a shared Runtime Package Executor:

- one transaction interface;
- one workflow and progress vocabulary;
- local/bundled and in-memory adapters first;
- platform adapters only for archive, executable, quarantine, and signing
  behavior;
- no implicit model download or runtime start.

ADR-0007 remains authoritative: MLX is not a separate product route without an
executable lifecycle and real inference evidence.
