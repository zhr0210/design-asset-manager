# Design Asset Manager Context

Design Asset Manager manages local image and design reference assets as a searchable, taggable, AI-assisted desktop library. This context defines the product language used across the asset library, capture, tagging, AI, runtime, and governance areas.

## Language

### Asset Library

**Design Asset**:
An image or design reference saved in the local library for later browsing, tagging, inspection, analysis, or reuse.
_Avoid_: File, picture, image item, material

**Asset Library**:
The user-facing collection of design assets and their metadata.
_Avoid_: Folder, database, gallery

**Library Root**:
The user-selected root location that owns asset-library files.
_Avoid_: App root, managed root, download root

**Asset Source**:
The origin context of a design asset, such as a source site, source page, original URL, or browser page title.
_Avoid_: Referrer, import note

**Source Site**:
A configured website or service from which assets can be searched, browsed, captured, or downloaded.
_Avoid_: Provider, platform, domain

**Capture Method**:
The way an asset entered the library, such as browser capture, direct save, or download workflow.
_Avoid_: Import type, acquisition mode

**Thumbnail**:
A lightweight preview representation of a design asset used for browsing and selection.
_Avoid_: Preview file, card image

**Normalized Image**:
An image variant prepared for consistent downstream display or analysis while preserving the original asset separately.
_Avoid_: Converted image, processed image

**Original Asset**:
The source-preserving copy or path for an asset before normalization.
_Avoid_: Raw file, input file

**Asset Inspector**:
The UI workspace for inspecting an individual asset's preview, metadata, tags, captions, AI outputs, and analysis panels.
_Avoid_: Detail drawer, preview modal

**Asset Category**:
A broad visual classification for an asset, such as UI, design, document, anime, illustration, photo, product, mixed, or unknown.
_Avoid_: Folder, tag group, file type

**Custom Category**:
A user override for the broad asset category.
_Avoid_: Manual label, user type

### Tags

**Tag**:
A reusable semantic label attached to assets for search, classification, or organization.
_Avoid_: Keyword, label, badge

**System Tag**:
A built-in tag owned by the application and protected from casual user redefinition.
_Avoid_: Default tag, locked label

**Custom Tag**:
A user-created or user-managed tag.
_Avoid_: Manual tag, private tag

**AI Tag**:
A tag proposed or attached by an AI or algorithmic source.
_Avoid_: Generated label, model tag

**Asset Tag**:
The relationship between a design asset and a tag, including source, confidence, and confirmation status.
_Avoid_: Tag assignment, label link

**Tag Suggestion**:
A pending AI or algorithmic proposal that the user can confirm or reject.
_Avoid_: Prediction, recommendation

**Tag Status**:
The confirmation state of a tag suggestion or asset tag: pending, confirmed, or rejected.
_Avoid_: Task status, review state

**Tag Alias**:
An alternate spelling or synonym that resolves to a canonical tag.
_Avoid_: Nickname, duplicate tag

**Tag Relation**:
A relationship between tags, such as parent-child structure or synonym linkage.
_Avoid_: Tag tree edge, hierarchy row

**Tag Group**:
A curated grouping of tags for organization and display.
_Avoid_: Category, collection

**Normalized Tag Name**:
The canonical comparison form of a tag name used to prevent duplicate meanings.
_Avoid_: Slug, lowercase label

**Raw Tag Value**:
The uncleaned model output or source value from which a canonical tag may be derived.
_Avoid_: Original tag, prediction text

**Design Tag Dictionary**:
The domain vocabulary used to translate raw visual signals into professional design tags.
_Avoid_: Keyword map, translation table

**Tag Fusion**:
The process of combining multiple tag sources into one cleaned, deduplicated tag set.
_Avoid_: Merge, aggregation

**Tag Localization**:
The process of converting model or dictionary tags into product-facing Chinese design language.
_Avoid_: Translation, rename

### Capture And Downloads

**Embedded Browser**:
The in-app browsing surface used to visit source sites and capture asset candidates.
_Avoid_: Webview, crawler, browser tab

**Browser Preview Injection**:
The browser-side preview helper that highlights or extracts asset candidates from the current page.
_Avoid_: Scraper, DOM hack

**Download Task**:
A queued or completed request to save an asset candidate from a remote URL to a planned destination.
_Avoid_: Download job, save job

**Download Queue**:
The collection of download tasks tracked by the app.
_Avoid_: Downloader, transfer list

**Save Path Plan**:
A dry-run destination plan for a download, including filename sanitization and duplicate handling.
_Avoid_: Download path, target filename

### Visual Analysis

**Color Palette**:
The extracted set of representative colors for an asset.
_Avoid_: Swatches, colors

**Dominant Color**:
The primary representative color for an asset.
_Avoid_: Main color, average color

**Extracted Color**:
A palette color with ratio, RGB values, and optional color-family classification.
_Avoid_: Swatch detail, color row

**Color Family**:
A human-readable color grouping used for filtering and display.
_Avoid_: Hue bucket, color class

**Text Box**:
A detected text region in an image, optionally with recognized text, foreground color, background color, and readability score.
_Avoid_: OCR box, bounding rectangle

**Text Color Analysis**:
The workflow that estimates text foreground and background colors and readability for detected text regions.
_Avoid_: OCR color extraction, text palette

**OCR Text**:
Recognized text extracted from a design asset.
_Avoid_: Copy, detected words

**OCR Provider**:
The configured text-detection source used for OCR or text-box discovery.
_Avoid_: OCR engine, text detector

**Readability Score**:
The contrast-oriented quality signal for a text box.
_Avoid_: Contrast score, legibility value

### AI Workflows

**Platform AI Branch**:
A platform-specific AI capability branch for Windows or macOS that chooses different runtime backends while preserving shared product workflows where possible.
_Avoid_: Cross-platform AI, one AI stack

**Windows AI Branch**:
The Windows AI capability branch that keeps the CUDA AI Worker main chain while moving Qwen3-VL large visual inference toward quantized llama.app, llama.cpp, or Ollama services.
_Avoid_: Windows build, CUDA mode

**macOS AI Branch**:
The macOS AI capability branch targeting Python MPS, ONNX Runtime, llama.app, llama.cpp Metal, MLX, Ollama fallback, and external HTTP fallback. Phase 1 exposed lane metadata and AI Console visibility; the current bridge also surfaces live Worker probe results for Python MPS, ONNX Runtime, and MLX availability. Model downloads and real inference validation are later phases.
_Avoid_: macOS build, MPS mode

**AI Worker**:
The local Python worker responsible for AI tagging, prompt reverse, visual analysis, routing, OCR helpers, and translation support.
_Avoid_: AI service, runtime, model server

**Real Model Path**:
An AI workflow path whose output is produced by an installed and loaded model backend, or by an explicitly configured external inference backend.
_Avoid_: Enabled card, downloaded label, wrapper import

**Mock Inference Path**:
An AI workflow path that returns simulated, randomized, templated, or filename-derived AI output instead of model-backed inference.
_Avoid_: Demo data, graceful fallback, fake model

**Planned Capability**:
A UI-visible or metadata-visible AI capability that describes an intended runtime, model family, or fallback route before a real model path is available.
_Avoid_: Available model, installed runtime, loaded route

**Runtime Probe**:
A read-only check that reports whether a runtime dependency, import, service, or hardware hint appears available without proving full model inference.
_Avoid_: Inference validation, model load, health guarantee

**AI Client**:
The Electron-side facade that enqueues AI work, records local task state, polls worker results, and notifies the renderer.
_Avoid_: AI Worker, model client

**AI Task**:
A tracked unit of AI work for an asset, such as tagging, prompt reverse, or visual analysis.
_Avoid_: Job, request

**AI Tag Task**:
An AI task that produces tag suggestions or asset tags.
_Avoid_: Tagging job

**AI Prompt Task**:
An AI task that produces prompt-reverse results or captions.
_Avoid_: Prompt job

**AI Analysis Task**:
An AI task that produces structured visual analysis.
_Avoid_: Analysis job

**Queue Sync**:
The background synchronization of completed AI Worker results into local asset and task state.
_Avoid_: Callback, webhook, push sync

**Task Cache**:
The AI Worker-side fallback record of finished task results when in-memory task state is unavailable.
_Avoid_: Result database, worker DB

**Batch Scheduler**:
The AI Worker coordinator that monitors queued tag tasks and triggers batch tagging.
_Avoid_: Queue runner, cron

**Tag Worker**:
The AI Worker component that routes assets and runs cooperative tagging models.
_Avoid_: Tagger, classifier

**Prompt Worker**:
The AI Worker component that performs manual prompt reverse work.
_Avoid_: Prompt generator

**Analysis Worker**:
The AI Worker component that performs deeper visual analysis.
_Avoid_: Analyzer

**Model Manager**:
The AI Worker component that coordinates model loading, keep-alive, eviction, and memory-aware exclusivity.
_Avoid_: Loader, cache

**Keep-Alive Window**:
The period during which a loaded model stays resident after use before eviction.
_Avoid_: Timeout, cache lifetime

**VRAM Policy**:
The memory-safety rules that control heavy model loading, eviction, and pre-inference cleanup.
_Avoid_: GPU settings, memory config

**Manual Heavy Model**:
A model family that must not run concurrently with another heavy manual model because of memory pressure.
_Avoid_: Big model, exclusive model

**Visual Router**:
The routing decision that classifies asset type and selects an appropriate tagging pipeline.
_Avoid_: Classifier, dispatcher

**Florence Semantic Router**:
The secondary routing step that uses Florence-derived visual captions to refine design/UI/document routing.
_Avoid_: Semantic classifier, Florence route

**Cooperative Tagging Pipeline**:
A multi-model tagging flow that combines routing, model predictions, design rules, and tag fusion.
_Avoid_: Multi-model inference, tag pipeline

**Routing Preview**:
A user-visible preview of how an asset would be routed before or during AI tagging.
_Avoid_: Pipeline debug, model preview

**Prompt Reverse**:
The workflow that analyzes a visual asset and produces reusable image-generation prompt language and design descriptors.
_Avoid_: Reverse prompt, prompt generation

**Prompt Template**:
A versioned instruction template used to guide prompt reverse or tagging output.
_Avoid_: System prompt, prompt file

**Prompt Reverse Result**:
The structured output of prompt reverse, including English prompt, Chinese description, caption, tag groups, and negative prompt suggestion.
_Avoid_: Prompt response, generated prompt

**Deep Visual Analysis**:
The structured design analysis workflow for layout, style, and visual semantics beyond tags.
_Avoid_: Senior analysis, visual sweep

**AI Console**:
The product workspace for monitoring AI status, models, inference services, prompt reverse configuration, runtime management, and logs.
_Avoid_: AI settings, model page

**macOS AI Worker Probe**:
The live macOS Worker capability snapshot surfaced in AI Console through the Python Worker capability probe bridge, including top-level runtime availability and family-specific probe data such as CLIP/SigLIP ONNX.
_Avoid_: Static metadata, fake health check

**macOS AI Optional Family Probe**:
The fine-grained worker probe layer that checks whether the macOS Python MPS and ONNX capability families, such as RAM++, Florence-2, CLIP/SigLIP, CLIP/SigLIP ONNX, WD14, RapidOCR, and PaddleOCR, are actually importable in the current environment.
_Avoid_: Model download status, hard runtime guarantee

**PaddleOCR ONNX**:
The ONNX-based OCR family used as a macOS-friendly alternative to EasyOCR and as a first-class text-detection dependency in the OCR governance and color-analysis pipeline.
_Avoid_: Paddle, generic OCR, text model

**macOS AI Route Overview**:
The macOS-focused AI Console summary card that surfaces MPS, ONNX Runtime, MLX, and Llama route readiness together with the current route priority.
_Avoid_: Generic model summary, static route note

**macOS AI Runtime Lane**:
A typed macOS AI branch lane shown in AI Console, such as Python MPS Runtime, ONNX Runtime, or Llama.
_Avoid_: macOS tab, AI section

**macOS AI Branch Skeleton**:
The Phase 1 implementation state where macOS AI lanes, runtime metadata, profile capabilities, and AI Console cards exist, with a live Worker probe bridge for Python MPS, ONNX Runtime, and MLX visibility but without claiming that downloads or inference routes are complete.
_Avoid_: finished macOS AI, macOS support complete

### AI Models And Sources

**AI Source**:
The canonical source identifier for an AI, rule, metadata, or palette contribution to tags.
_Avoid_: Model source, provider string

**RAM++ Tagger**:
The general-purpose visual tagger used for broad image and multi-label tagging.
_Avoid_: RAM, general tagger

**Florence-2 Tagger**:
The caption-oriented vision model used for scene description and design-semantic tag extraction.
_Avoid_: Florence, caption model

**WD Tagger**:
The anime-oriented tagger used for character and illustration-style features.
_Avoid_: WD, anime model

**CLIP Design Classifier**:
The zero-shot or dictionary-based classifier used to match assets against design vocabulary.
_Avoid_: CLIP, design classifier

**CLIP/SigLIP ONNX**:
The ONNX Runtime capability family for CLIP/SigLIP-style embedding and classification, surfaced in the macOS worker probe as a distinct ONNX availability signal.
_Avoid_: Generic ONNX, CLIP model, SigLIP model

**CLIP/SigLIP ONNX Compatibility Checker**:
The dedicated environment-and-model-shape checker used to verify whether a local CLIP/SigLIP ONNX folder has the expected Python dependencies, config, and ONNX graph files.
_Avoid_: Generic health check, model download job, inference job

**JoyCaption**:
The caption and prompt model used by the prompt worker.
_Avoid_: Caption model

**Qwen-VL**:
The vision-language model family used for structured visual analysis and prompt reverse workflows.
_Avoid_: Qwen, VLM

**Qwen3-VL Candidate**:
A selectable Qwen3-VL model option with size, quantization, vision support, and hardware guidance.
_Avoid_: Model option, GGUF choice

**Qwen3-VL Large Vision Runtime**:
The large-model visual inference route for Qwen3-VL; it should be served through quantized runtime services on Windows and through Metal or MLX-capable services on macOS rather than treated as a universal Python model.
_Avoid_: Native Qwen3-VL, Python Qwen runtime

**MMProj Model**:
The companion vision projection model required by some multimodal GGUF Llama workflows.
_Avoid_: Vision adapter, projector

**Quantization**:
The model-size and precision trade-off label used to choose a feasible local model.
_Avoid_: Compression, model variant

**Model Compatibility Status**:
The recorded compatibility state of a model for the current runtime environment.
_Avoid_: Install status, model health

### Runtime And Inference

**AI Runtime**:
The Electron-side abstraction for selectable inference runtimes, their configuration, lifecycle state, and health checks.
_Avoid_: AI Worker, backend, model server

**Active Runtime**:
The currently selected AI runtime for runtime-managed AI operations.
_Avoid_: Current backend, selected service

**Runtime Provider**:
An implementation of an AI runtime kind, such as Python Worker, external HTTP, disabled, or mock.
_Avoid_: Backend provider, adapter

**External HTTP Runtime**:
A user-configured inference endpoint accessed through HTTP, such as Ollama, LM Studio, llama.app, or a custom OpenAI-compatible service.
_Avoid_: Remote backend, external model

**Python MPS Runtime**:
The macOS Python inference route for models that can run safely through PyTorch MPS.
_Avoid_: macOS Python AI, MPS backend

**Python MPS Compatibility Checker**:
The dedicated environment probe used to verify that the macOS Python runtime can actually use PyTorch MPS and that optional RAM++, Florence-2, and CLIP family wrappers are importable.
_Avoid_: Generic Python health check, model download job, inference job

**ONNX Runtime Route**:
The cross-platform or macOS-friendly small-model route for models that are better served as ONNX graphs.
_Avoid_: ONNX model, CPU backend

**MLX Runtime**:
The Apple Silicon-oriented runtime route for macOS large-model inference where MLX-supported model formats are appropriate.
_Avoid_: Apple AI backend, macOS model server

**CoreML Fallback**:
The macOS ONNX-related fallback path for model execution where CoreML provider support is available and appropriate.
_Avoid_: Apple fallback, CoreML mode

**Ollama Vision Fallback**:
The macOS large-vision fallback route that can serve a Qwen2.5-VL compatible model through Ollama when Qwen3-VL GGUF or MLX is not ready.
_Avoid_: Ollama primary path, remote model

**Manual Health Check**:
A user-triggered connectivity check for an external HTTP runtime.
_Avoid_: Auto probe, startup ping

**Python Worker Runtime**:
The runtime provider shape for launching or health-checking the local Python AI Worker.
_Avoid_: AI Worker, Python service

**Llama Runtime**:
The local Llama-oriented runtime capability for planning, installing, starting, and testing GGUF-based inference services.
_Avoid_: llama.cpp, llama server

**Llama Install Plan**:
The planned runtime package, model candidate, install root, and warning set for a Llama runtime setup.
_Avoid_: Installer config, download plan

**Llama Hardware Profile**:
The detected CPU, memory, GPU, platform, and accelerator information used to recommend a Llama runtime plan.
_Avoid_: Hardware detection, device profile

**Accelerator**:
The runtime acceleration family used for Llama planning, such as CUDA, Vulkan, Metal, or CPU.
_Avoid_: GPU type, backend

**Runtime Profile**:
The platform and hardware profile that describes available runtime capabilities and recommended runtime kinds.
_Avoid_: Platform profile, install profile

**Runtime Registry**:
The app-managed record of runtime profile, managed paths, installed packages, available models, and doctor status.
_Avoid_: Runtime database, package registry

**Runtime Package**:
A typed package entry for runtime, model, tool, dependency, or metadata planning.
_Avoid_: Artifact, installer file

**Runtime Package Source**:
A typed source for runtime packages, categorized as local, bundled, or reserved remote.
_Avoid_: Download source, package repository

**Runtime Package Manifest**:
The typed catalog of runtime packages and the profiles they support.
_Avoid_: Package list, registry manifest

**Runtime Package Selection**:
The chosen required, recommended, and optional packages for a runtime profile.
_Avoid_: Install set, dependency list

**Runtime Package Install Plan**:
A dry-run plan that combines download, verification, extraction, registry metadata, rollback, warnings, and blocking issues.
_Avoid_: Installation, setup

**Bootstrap**:
The initial environment decision flow that combines doctor results, runtime profiles, package planning, and user choices.
_Avoid_: Startup, onboarding

### Settings And Governance

**App Settings**:
The persisted user and platform configuration for library, AI, runtime, OCR, paths, bootstrap, and doctor behavior.
_Avoid_: Preferences, config

**Managed Path**:
An app-owned path resolved by platform rules for config, database, logs, cache, runtime metadata, models metadata, temp files, or downloads.
_Avoid_: Local path, app folder

**User Root**:
A user-selected root such as the asset library root or model root.
_Avoid_: Managed path, default folder

**Path Root ID**:
The logical owner identifier for a stored path value.
_Avoid_: Root enum, path namespace

**Library-Relative Path**:
A stored path representation relative to the library root.
_Avoid_: Relative file path, portable path

**Legacy Absolute Path**:
An existing physical path retained for compatibility reads.
_Avoid_: Old path, absolute fallback

**Path Remap**:
A future mapping from a stored logical root and relative value to the current physical root location.
_Avoid_: Path rewrite, migration

**Dry Run**:
A side-effect-free plan or report that shows what would happen without changing user data, files, settings, or runtime state.
_Avoid_: Simulation, preview

**Blocking Issue**:
A plan or report finding that prevents the operation from safely proceeding.
_Avoid_: Error, warning

**Warning**:
A non-blocking risk or limitation that should be surfaced to the user or maintainer.
_Avoid_: Notice, hint

**Settings Migration Plan**:
A dry-run or gated plan for upgrading persisted settings while preserving user roots.
_Avoid_: Settings migration, upgrade

**Doctor**:
The environment diagnostic system that reports platform, dependency, AI Worker, port, native dependency, and managed path health.
_Avoid_: Health check, diagnostics

**Doctor Report**:
The generated set of doctor check results and overall status.
_Avoid_: Health report, diagnostic output

**Doctor Repair**:
A bounded in-app repair action for a specific doctor check.
_Avoid_: Auto fix, cleanup

**Path Governance**:
The rules and reports that prevent unsafe path reads, writes, migrations, moves, deletes, or private path exposure.
_Avoid_: Path management, migration work

**Package Smoke**:
A release-candidate validation flow for packaged app artifacts.
_Avoid_: Installer test, packaging smoke test

**Sandbox Install Smoke**:
A package smoke variant that runs installer validation inside a disposable sandbox rather than on the host.
_Avoid_: Host install test, E2E install

**Release Flow**:
The governed packaging path for Windows and macOS artifacts, with publishing, signing, notarization, and auto-update explicitly reserved until configured.
_Avoid_: Build pipeline, distribution
