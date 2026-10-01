# shared README history

Preserved from `src/shared/README.md` on 2026-09-07. Entries record historical
changes and may describe target decisions, not delivered features. This is not
startup context. Current entry: [README](../../src/shared/README.md).

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.8.47 | 2026-08-10 | Prevented local-file and `ready_to_load` evidence from being presented as a verified installation or real loaded-model state, including Inspector Prompt Reverse. |
| v1.8.46 | 2026-07-30 | Made Asset Workspace the home route, kept Web Capture explicitly reachable, hid its duplicate Library Dock, and stopped mounting Browser outside its route. |
| v1.8.45 | 2026-07-30 | Added the synchronous local Asset Discovery projection for title, filename, tag, description, and OCR matching with hard source constraints and bounded evidence. |
| v1.8.44 | 2026-07-02 | Updated AppInteractionKernel projection so global menu hover reserves native browser safe area rather than hiding the full web view. |
| v1.8.43 | 2026-07-02 | Added shared AppInteractionKernel projection for browser live/snapshot, overlay/menu visibility, dock state, and download-flight planning. |
| v1.8.42 | 2026-07-02 | Added shared library dock geometry and motion timing for browser injection, React dock controls, and download-to-library flight targets. |
| v1.8.41 | 2026-07-01 | Added shared overlay-route detection so non-browser pages render above the persistent browser shell. |
| v1.8.40 | 2026-07-01 | Added shared home/menu/library-dock navigation projection for the browser-first full-screen shell. |
| v1.8.39 | 2026-06-30 | Moved AI Console GPU risk status, service-health label, and bar tone metadata into shared overview projection. |
| v1.8.38 | 2026-06-30 | Moved Platform AI branch workflow action-button visibility and icon intent into shared display projection. |
| v1.8.37 | 2026-06-29 | Moved Python runtime incompatible compatibility display copy and tone into shared status metadata. |
| v1.8.36 | 2026-06-29 | Consolidated text-box provider execution planning into one descriptor table for provider type, availability, skip reason, and mock marker policy. |
| v1.8.35 | 2026-06-29 | Moved Visual Analysis text-color skip reason copy into shared table-driven metadata. |
| v1.8.34 | 2026-06-29 | Moved text-box provider execution planning into shared workflow metadata consumed by Color Palette OCR detection. |
| v1.8.33 | 2026-06-29 | Moved OCR dependency selected-provider availability projection into a shared workflow. |
| v1.8.32 | 2026-06-29 | Moved product text-box provider normalization into a shared workflow consumed by settings and AI Console. |
| v1.8.31 | 2026-06-29 | Normalized Worker probe connection accessors to branch-keyed predicates without changing macOS/Windows connection evidence. |
| v1.8.30 | 2026-06-26 | Moved Platform AI branch-to-OS current-platform mapping into shared runtime metadata helpers. |
| v1.8.29 | 2026-06-25 | Moved AI Console runtime dependency install toast/log display into shared overview workflow projection. |
| v1.8.28 | 2026-06-25 | Moved Electron app lifecycle policy into shared workflow metadata for main-process startup. |
| v1.8.27 | 2026-06-25 | Added shared app navigation workflow for route paths, sidebar labels, topbar titles, and shell visibility policy. |
| v1.8.26 | 2026-06-25 | Added shared desktop viewport policy for Electron window defaults and renderer AppShell minimum sizes. |
| v1.8.25 | 2026-06-14 | Added shared Runtime Package Executor request, progress, result, stage, and error-code types. |
| v1.8.8 | 2026-06-14 | Preserved model dependency and artifact gaps when a workflow has runtime evidence but no real model path. |
| v1.8.7 | 2026-06-14 | Added the shared explicit OCR real-evidence IPC contract and Chinese display projection. |
| v1.8.24 | 2026-06-13 | Moved Worker probe connection recognition to branch-keyed marker metadata without changing probe semantics. |
| v1.8.23 | 2026-06-13 | Moved Platform AI runtime lane-status policy into shared constants while preserving concrete lane topology. |
| v1.8.22 | 2026-06-13 | Moved Platform AI runtime metadata capability and fallback-status helpers into shared constants while preserving concrete lane topology. |
| v1.8.21 | 2026-06-13 | Moved Platform AI default branch fallback to `DEFAULT_PLATFORM_AI_BRANCH` for shared projectors and renderer initial state. |
| v1.8.20 | 2026-06-13 | Moved Doctor platform label display to shared metadata while preserving macOS label and raw platform fallback. |
| v1.8.19 | 2026-06-13 | Moved Platform AI branch runtime metadata selection to branch-keyed descriptors and locked the current-branch priority order in shared workflow tests. |
| v1.8.18 | 2026-06-12 | Normalized Worker diagnostics selection through one branch resolver and branch-indexed probe map. |
| v1.8.17 | 2026-06-12 | Centralized macOS/Windows Worker probe connection and accelerator reads in branch-keyed accessors. |
| v1.8.16 | 2026-06-12 | Moved the macOS-specific Platform AI runtime-install command into branch-keyed action metadata. |
| v1.8.15 | 2026-06-12 | Added a platform-neutral Platform AI runtime lane ID type for shared main-process metadata and readiness routes. |
| v1.8.14 | 2026-06-12 | Moved shared Worker probe header projection from macOS/Windows concrete probe unions to the platform-neutral Worker probe envelope. |
| v1.8.13 | 2026-06-12 | Added a platform-neutral Worker probe-with-runtime-versions type for shared AI capability matrix inputs. |
| v1.8.12 | 2026-06-12 | Moved the shared AI capability matrix prop type from macOS/Windows concrete probe unions to a platform-neutral Worker probe envelope plus minimal runtime version fields. |
| v1.8.11 | 2026-06-12 | Added a platform-neutral Worker probe result base type so macOS/Windows runtime probes share one envelope while keeping device details platform-specific. |
| v1.8.10 | 2026-06-11 | Added platform-neutral AI runtime lane and branch metadata base types for macOS/Windows runtime definitions. |
| v1.8.9 | 2026-06-11 | Extracted platform-neutral AI runtime capability/probe types so Windows runtime types no longer depend on macOS runtime types. |
| v1.8.8 | 2026-06-11 | Renamed the reusable AI capability matrix renderer component to `PlatformAiCapabilityMatrix` while keeping shared projection ownership unchanged. |
| v1.8.7 | 2026-06-11 | Moved Platform AI route overview dependency labels, diagnostic tile labels, and runtime-lane captions into shared workflow projection. |
| v1.8.6 | 2026-06-11 | Moved AI capability matrix title and description into shared AI Runtime Status projection. |
| v1.8.5 | 2026-06-11 | Moved AI Runtime panel platform-specific copy and display selection into shared workflow projection for Windows/macOS parity. |
| v1.8.4 | 2026-06-11 | Moved Platform AI Action Plan UI command routing into shared workflow code so renderer actions no longer infer destinations from workflow/kind pairs. |
| v1.8.3 | 2026-06-06 | Extended ONNX probe contracts with CLIP image/text embedding operation, finite-result, and dimension evidence. |
| v1.8.2 | 2026-06-06 | Added shared MPS real-execution probe contract and display projection without promoting model workflow readiness. |
| v1.8.1 | 2026-06-06 | Added path-free, time-bounded WD Tagger ONNX real-load evidence for the AI Tag workflow. |
| v1.8.0 | 2026-06-06 | Added shared executable Platform AI Action Plan projection for model, runtime, backend, and evidence-refresh UI operations. |
| v1.7.9 | 2026-06-06 | Wired the AI Client IPC contract through main, preload, service responses, queue stats, and task-sync events. |
| v1.7.8 | 2026-06-05 | Allowed shared model artifact evidence to target both macOS and Windows runtime lanes without splitting workflows. |
| v1.7.7 | 2026-06-05 | Unified Worker cooperative readiness types and combined model-row projection across main and renderer. |
| v1.7.6 | 2026-06-05 | Added branch-aware AI route overview projection so Windows does not render macOS-only diagnostics or actions. |
| v1.7.5 | 2026-06-05 | Replaced Visual Analysis Snapshot payload and renderer `any` boundaries with typed legacy/modern palette inputs and guarded normalization. |
| v1.7.4 | 2026-06-05 | Completed Chinese Platform AI Branch Status panel and workflow display projection without changing business selection fields. |
| v1.7.3 | 2026-06-05 | Reused the shared custom-tag color default in AssetTagPanel quick creation. |
| v1.7.2 | 2026-06-05 | Moved AI Console active-model readiness and model-row artifact source/status/action projection into the shared readiness workflow. |
| v1.7.1 | 2026-06-05 | Added shared Settings Migration display projection for panel status, plan summary, backup list, and empty labels, and moved compatibility types into shared layer. |
| v1.7.0 | 2026-06-05 | Added shared Doctor and Path Governance display projection for settings panels. |
| v1.6.9 | 2026-06-05 | Moved settings panel local display helpers (INFO_LABELS, displayValue, actionLabel) and macOS branch metadata helpers to shared workflow. |
| v1.6.8 | 2026-06-05 | Moved TagEditDialog local PRESET_COLORS and TAG_TYPES plus TagChip local type-to-color class mapping into shared Asset Tagging Workflow type/color options. |
| v1.6.7 | 2026-06-05 | Moved remaining renderer-local ColorPalettePanel formatting (OCR count, box ratio, metadata, and background source labels) to shared projection. |
| v1.6.6 | 2026-06-05 | Added typed Visual Analysis swatch role, copy-value, contrast, confidence, and text-box display projection. |
| v1.6.5 | 2026-06-05 | Added shared Asset Tagging panel scan-state, category-option, and model-toggle projection. |
| v1.6.4 | 2026-06-05 | Added shared Platform AI Branch Status candidate selection based only on business status and evidence fields. |
| v1.6.3 | 2026-06-05 | Added shared macOS Worker probe connection and route-tile projection with evidence-insufficient unchecked states. |
| v1.6.2 | 2026-06-05 | Added shared AI Runtime panel status, health-result, icon-semantic, and summary-count projection. |
| v1.6.1 | 2026-06-05 | Moved PlatformAiCapabilityMatrix status labels and badge classes into shared AI Runtime Status projection. |
| v1.6.0 | 2026-06-05 | Extended Model Artifact Readiness display projection to Smoke GGUF and Vision mmproj artifact tile labels. |
| v1.5.9 | 2026-06-04 | Extended Model Artifact Readiness display projection to cooperative model download progress visibility, labels, and clamped percentages. |
| v1.5.8 | 2026-06-04 | Extended shared Asset Display projection to caption text, source labels, restore/regenerate copy, and updated-at labels. |
| v1.5.7 | 2026-06-04 | Extended shared Download Status projection to queue-row metadata, file-size labels, and progress labels. |
| v1.5.6 | 2026-06-04 | Extended shared Asset Display projection to original image viewer metadata, preview source, zoom labels, and fit-toggle copy. |
| v1.5.5 | 2026-06-04 | Added shared Asset Display projection for library cards, dashboard recent assets, tag overflow, file-size labels, dates, and detail specs. |
| v1.5.4 | 2026-06-04 | Added shared Library tag sidebar and active filter-chip projection for query labels, shortcut states, and usage groups. |
| v1.5.3 | 2026-06-04 | Added shared Asset Tag picker/input projection for selection groups, suggestions, usage badges, and merge option labels. |
| v1.5.2 | 2026-06-04 | Added shared Download Status projection for queue rows, search actions, dashboard counts, sidebar badge, and topbar indicator. |
| v1.5.1 | 2026-06-04 | Added shared Asset Tagging compute banner projection for Tag Manager Worker/GPU status copy and indicator tone. |
| v1.5.0 | 2026-06-04 | Added shared Tag Manager list projection for filtering, sorting, category labels, parent labels, aliases, and usage-count display. |
| v1.4.9 | 2026-06-04 | Added shared Asset Tag chip display projection for source labels, confidence, pending/rejected state, and tooltip status. |
| v1.4.8 | 2026-06-04 | Added shared AI Console overview display projection for GPU risk and model-readiness status cards. |
| v1.4.7 | 2026-06-04 | Added shared AI runtime compatibility and Llama runtime display projection for Settings and AI Console. |
| v1.4.6 | 2026-06-04 | Added shared Prompt Reverse panel state projection for loading, error, result, ready, and configuration-needed display. |
| v1.4.5 | 2026-06-04 | Added shared AI queue status display projection for overview cards and queue preview rows. |
| v1.4.4 | 2026-06-04 | Added shared AI task status classifier for renderer polling terminal/success/failure rules. |
| v1.4.3 | 2026-06-04 | Added shared Model Artifact Readiness display projection for cooperative model readiness labels, tones, and details. |
| v1.4.2 | 2026-06-04 | Added shared Platform AI Branch Status display projection for AI Console status labels, tones, lane badges, evidence, and missing summaries. |
| v1.4.1 | 2026-06-04 | Added Visual Analysis image/theme display projection for theme pills, dominant color, and image swatches. |
| v1.4.0 | 2026-06-04 | Added Visual Analysis OCR/text-box/readability summary projection without exposing full OCR text in panel UI. |
| v1.3.9 | 2026-06-04 | Extended Visual Analysis Snapshot with text-color panel state, skip/failure messages, warnings, and foreground swatch display fields. |
| v1.3.8 | 2026-06-04 | Added shared confirmed Asset Tag chip projection for dedupe, active names, and search query targets. |
| v1.3.7 | 2026-06-04 | Added shared Asset Tagging suggestion review item projection for confidence labels and review actions. |
| v1.3.6 | 2026-06-04 | Added shared Asset Tagging task submission projection for model-list cleanup and task model names. |
| v1.3.5 | 2026-06-04 | Added shared pending Tag Suggestion projection for Asset Tagging Workflow. |
| v1.3.4 | 2026-06-04 | Added shared Visual Analysis Snapshot mapper for renderer-ready palette and text-color projection. |
| v1.3.3 | 2026-06-04 | Added shared Asset Tagging Workflow planner for category-to-model pipeline defaults. |
| v1.3.2 | 2026-06-04 | Added shared Model Artifact Readiness vocabulary for Platform AI Branch Status evidence and missing requirements. |
| v1.3.1 | 2026-06-04 | Added shared Platform AI Branch Status types and dedicated AI Runtime IPC contract entries. |
| v1.3.0 | 2026-06-04 | Documented shared Platform AI Branch Status response-shape rule for Windows/macOS. |
| v1.2.3 | 2026-05-31 | Added persisted custom prompt reverse template settings and shared default prompt template constants. |
| v1.2.2 | 2026-05-31 | Added optional official release date metadata to native and GGUF AI model types for AI Console version display. |
| v1.2.1 | 2026-05-31 | Extended Llama installer plan types with Qwen3-VL candidate and mmproj metadata. |
| v1.2.0 | 2026-05-31 | Added shared Llama runtime installer types and IPC contracts. |
| v1.1.0 | 2026-05-31 | Added shared external AI backend types and IPC contracts. |
| v1.0.0 | 2026-05-31 | Rewrote README with compact shared contract rules and change log. |
