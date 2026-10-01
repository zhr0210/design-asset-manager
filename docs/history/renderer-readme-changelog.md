# renderer README history

Preserved from `src/renderer/README.md` on 2026-09-07. Entries record historical
changes and may describe target decisions, not delivered features. This is not
startup context. Current entry: [README](../../src/renderer/README.md).

## Change Log

| Version | Time | Change |
| --- | --- | --- |
| v1.6.119 | 2026-08-10 | Removed legacy model acquisition/deletion controls from AI Console and relabelled AI Console/Inspector local model presence as unverified evidence. |
| v1.6.118 | 2026-08-09 | Extracted AI Console status aggregation behind one Renderer-internal Module Interface with production and in-memory Adapters. |
| v1.6.117 | 2026-07-30 | Separated Web Capture and Source Discovery from the Asset Workspace home, added truthful empty/error states, and removed renderer fallback results. |
| v1.6.116 | 2026-07-29 | Added one fixed terminal retention deadline for Missing-initialization result, Retry and Undo. |
| v1.6.115 | 2026-07-29 | Added one-way forward-retry to Undo direction handling for Missing initialization. |
| v1.6.114 | 2026-07-29 | Added evidence-gated manual retry for eligible Missing-initialization failures. |
| v1.6.113 | 2026-07-29 | Added current-live-owner scope review and lifecycle exclusions for Missing initialization. |
| v1.6.112 | 2026-07-29 | Added exact-library cross-device recovery actions and terminalize-before-Undo UI for Missing initialization. |
| v1.6.111 | 2026-07-29 | Added reviewed multi-field Missing initialization planning, progress and Undo UI. |
| v1.6.110 | 2026-07-29 | Added preflight repair and definition-level suspension UI for ineligible defaults. |
| v1.6.109 | 2026-07-29 | Generalized exact static default editors across all core Custom Field types. |
| v1.6.108 | 2026-07-29 | Added future-only Boolean default configuration and reviewed source precedence. |
| v1.6.107 | 2026-07-29 | Added explicit accessible Boolean-or-Missing choices with trusted immediate commit feedback. |
| v1.6.106 | 2026-07-29 | Added content-free UI for last-resort critical-pressure Undo reclamation. |
| v1.6.105 | 2026-07-29 | Added the reviewed no-Undo history boundary and cross-owner timeline behavior. |
| v1.6.104 | 2026-07-29 | Added adjustable count/memory Undo limits and pre-save oversized-step choices. |
| v1.6.103 | 2026-07-29 | Added contextual unavailable-Undo review with exact revalidation and whole-step removal. |
| v1.6.102 | 2026-07-28 | Added indivisible compound Undo/Redo presentation for atomic same-owner multi-field saves. |
| v1.6.101 | 2026-07-28 | Added reviewed multi-draft resolution with per-owner atomic commits and truthful partial outcomes. |
| v1.6.100 | 2026-07-28 | Unified typed manual Custom Field drafts, protected recovery and cross-type session Undo presentation. |
| v1.6.99 | 2026-07-28 | Added labelled scientific overflow fallback and on-demand dual-value Number detail. |
| v1.6.98 | 2026-07-28 | Added exact-by-default Number presentation with deterministic rounded-approximation disclosure. |
| v1.6.97 | 2026-07-28 | Added exact locale-declared Number input, ambiguity review and full-value editing. |
| v1.6.96 | 2026-07-28 | Added draft-only writing assistance with proven-local checks and per-request external disclosure. |
| v1.6.95 | 2026-07-27 | Added selection-only Text Copy/Cut, full-draft/value copy and truthful clipboard-retention behavior. |
| v1.6.94 | 2026-07-27 | Added explicit plain-Unicode paste/drop behavior for Text fields and Batch Text parameters. |
| v1.6.93 | 2026-07-27 | Added Batch Text recovery choices for Forget Library Registration and Uninstall Preparation. |
| v1.6.92 | 2026-07-27 | Added evidence-bound cross-device Batch Text actions and value-free terminal reconciliation guidance. |
| v1.6.91 | 2026-07-27 | Added ADR 0458 paused Batch Text recovery, protected device-local Undo and explicit no-Undo review. |
| v1.6.90 | 2026-07-27 | Added ADR 0457 reviewed frozen Batch Text Edit plans with explicit transforms and per-owner atomic commits. |
| v1.6.89 | 2026-07-27 | Added ADR 0456 layered draft/committed Text Undo with revision guards and a session-only stack. |
| v1.6.88 | 2026-07-27 | Added ADR 0455 protected device-local Text draft crash recovery without auto-navigation, auto-commit or plaintext fallback. |
| v1.6.87 | 2026-07-27 | Added ADR 0454 revision-bound Text edit drafts with IME-safe commit shortcuts and gated navigation. |
| v1.6.86 | 2026-07-27 | Added ADR 0453 portable reversible Compact/Expanded Text editor presentation with content-preserving temporary expansion. |
| v1.6.85 | 2026-07-27 | Added ADR 0452 on-demand generation-bound Distinct Text Value Browser without eager facets or schema changes. |
| v1.6.84 | 2026-07-27 | Added ADR 0451 versioned Natural and Exact Unicode Text Custom Field sorting with Missing last. |
| v1.6.83 | 2026-07-27 | Added ADR 0450 complete portable Text Custom Field structured-filter operators and Missing semantics. |
| v1.6.82 | 2026-07-27 | Added ADR 0449 session-only Duplicate Text group collapse with no hidden resolution or suppression state. |
| v1.6.81 | 2026-07-27 | Added ADR 0448 stable Duplicate Text finding sessions with explicit complete-generation refresh. |
| v1.6.80 | 2026-07-22 | Added ADR 0447 cross-owner Duplicate Text evaluation with explicit lifecycle scope and generation-consistent Promotion. |
| v1.6.79 | 2026-07-22 | Added ADR 0446 versioned Exact, Case-Insensitive and Normalized Duplicate Text comparison keys. |
| v1.6.78 | 2026-07-22 | Added ADR 0445 advisory Duplicate Text Value Findings instead of schema-level uniqueness constraints. |
| v1.6.77 | 2026-07-21 | Added ADR 0444 explicit portable Text pattern case, multiline and dot-all options with locale-independent Unicode semantics. |
| v1.6.76 | 2026-07-21 | Added ADR 0443 optional Text grapheme minimums and versioned linear-time Unicode pattern validation. |
| v1.6.75 | 2026-07-21 | Added ADR 0442 unsafe Text-control rejection with preservation and reveal of valid invisible Unicode formatting. |
| v1.6.74 | 2026-07-21 | Added ADR 0441 zero-length Text-as-Missing semantics with preserved, warned whitespace-only values. |
| v1.6.73 | 2026-07-21 | Added ADR 0440 NFC-preserved Text Custom Fields with portable grapheme-counted limits and no silent trimming or truncation. |
| v1.6.72 | 2026-07-21 | Added ADR 0439 non-blocking Promotion transfer for Out-of-Constraint Candidate values with synchronous revalidation. |
| v1.6.71 | 2026-07-21 | Added ADR 0438 non-destructive restrictive Custom Field validation changes with progressive revalidation. |
| v1.6.70 | 2026-07-21 | Added ADR 0437 DateTime whole-second/nanosecond precision with preserved source digits and conflict-gated overprecision. |
| v1.6.69 | 2026-07-21 | Added ADR 0436 DateTime Known-Instant/Unzoned states with explicit comparison and time-zone assignment. |
| v1.6.68 | 2026-07-21 | Added ADR 0435 exact Decimal128-equivalent Number fields with separate display precision and unit labels. |
| v1.6.67 | 2026-07-21 | Added ADR 0434 resumable large Select-option maintenance with shared scheduling and risk-specific Undo. |
| v1.6.66 | 2026-07-20 | Added ADR 0433 portable versioned Custom Field and Select-option name comparison with explicit restore-collision repair. |
| v1.6.65 | 2026-07-20 | Added ADR 0432 stable Select option identity with archive, impact-reviewed permanent deletion, and explicit merge. |
| v1.6.64 | 2026-07-20 | Added ADR 0431 fixed cross-platform Custom Field migration responsiveness, profile capacity, and 100,000-owner validation. |
| v1.6.63 | 2026-07-20 | Clarified ADR 0430 task-level, lane-wide, and background-profile Custom Field migration pause semantics. |
| v1.6.62 | 2026-07-20 | Added ADR 0430 cooperative single-lane Custom Field migration scheduling with revalidated queue order and performance profiles. |
| v1.6.61 | 2026-07-20 | Added ADR 0429 acknowledgement-gated Custom Field migration result retention and shared bounded Undo window. |
| v1.6.60 | 2026-07-20 | Added ADR 0428 portable library Custom Field conversion presets without stored item scope or execution authority. |
| v1.6.59 | 2026-07-20 | Added ADR 0427 committed-target-only search and filtering with explicit partial Custom Field migration coverage. |
| v1.6.58 | 2026-07-20 | Added ADR 0426 per-owner atomic, resumable Custom Field migration with conflict review and bounded undo. |
| v1.6.57 | 2026-07-20 | Added ADR 0425 validated lossless, rule-governed or manual migration paths for all 56 directed Custom Field type pairs. |
| v1.6.56 | 2026-07-20 | Added ADR 0424 lossless-by-default and explicitly rule-governed Custom Field type conversion. |
| v1.6.55 | 2026-07-20 | Added ADR 0423 empty-only in-place Custom Field type changes and reviewed new-identity migration for used fields. |
| v1.6.54 | 2026-07-20 | Added ADR 0422 identity-preserving Custom Field renames and explicit active-name conflict handling. |
| v1.6.53 | 2026-07-20 | Preserved ADR 0421 stable Custom Field dependencies as inactive repairable references instead of silently changing saved plans. |
| v1.6.52 | 2026-07-20 | Added ADR 0420 reversible Custom Field archive and impact-reviewed permanent deletion. |
| v1.6.51 | 2026-07-20 | Added ADR 0419 opted-in AI Custom Field Value Suggestions without overwrite or auto-confirm authority. |
| v1.6.50 | 2026-07-20 | Made ADR 0418 Custom Field Definitions user-owned with reviewed plugin/import proposals only. |
| v1.6.49 | 2026-07-20 | Fixed ADR 0417 to eight portable non-relational Custom Field Types. |
| v1.6.48 | 2026-07-20 | Limited ADR 0416 Custom Field Values to Candidates and Design Assets with transactional Promotion transfer. |
| v1.6.47 | 2026-07-20 | Established ADR 0415 core library-owned typed custom fields for optional search and filtering. |
| v1.6.46 | 2026-07-20 | Established ADR 0414 generic organization without first-class Client or Project entities. |
| v1.6.45 | 2026-07-20 | Established ADR 0413 search-first organization with neutral Unsorted membership and no classification-completeness gate. |
| v1.6.44 | 2026-07-20 | Split export fairness, resource guards, background lifecycle, planning acceptance, temporary-state safety, and matrix resolution into ADRs 0407–0412. |
| v1.6.43 | 2026-07-20 | Split bounded quit/startup recovery, recovery-staging release, cross-library fusion, original handoff, and source-generation boundaries into ADRs 0402–0406. |
| v1.6.42 | 2026-07-20 | Consolidated recovery retirement, anti-replay and returned-evidence planning in ADR 0401. |
| v1.6.41 | 2026-07-20 | Defined protected retained staging after verified returned-recovery preservation. |
| v1.6.40 | 2026-07-20 | Limited returned-evidence plans to proven safe release or verified preserve-first handling. |
| v1.6.39 | 2026-07-20 | Required new current-evidence plans for conflicts found after recovery retirement. |
| v1.6.38 | 2026-07-20 | Defined read-only handling when evidence returns after recovery retirement. |
| v1.6.37 | 2026-07-20 | Defined item-scoped two-step confirmation for retiring unverifiable recovery. |
| v1.6.36 | 2026-07-20 | Defined explicit unknown-outcome retirement with a minimal anti-replay tombstone. |
| v1.6.35 | 2026-07-20 | Assigned recovery evidence authority by claim instead of source priority. |
| v1.6.34 | 2026-07-20 | Isolated and read-only-reconstructed unverifiable recovery terminal evidence. |
| v1.6.33 | 2026-07-20 | Pruned expired recovery-staging history to a lifecycle-bound replay marker. |
| v1.6.32 | 2026-07-20 | Defined semantic compaction and 30-day minimal history for recovery-staging attempts. |
| v1.6.31 | 2026-07-20 | Defined visible manually unbounded recovery-staging completion attempts without automatic retry. |
| v1.6.30 | 2026-07-20 | Defined in-place Released After Reconciliation result and attention merge. |
| v1.6.29 | 2026-07-20 | Defined proportional one-item confirmation for completing remaining staging release. |
| v1.6.28 | 2026-07-19 | Kept grouped staging-release reconciliation browsing separate from item-scoped recovery authority. |
| v1.6.27 | 2026-07-19 | Defined member-level reconciliation for interrupted multi-file staging release. |
| v1.6.26 | 2026-07-18 | Defined Cancelled batch aggregation without result attention, retry, or notification. |
| v1.6.25 | 2026-07-18 | Defined cancel-remaining semantics and no restart resume for recovery-staging release. |
| v1.6.24 | 2026-07-18 | Gated long-running recovery-staging notifications by foreground, permission, privacy, and all owning preferences. |
| v1.6.23 | 2026-07-18 | Separated 30-day recovery-staging result history from durable task recovery attention. |
| v1.6.22 | 2026-07-18 | Defined truthful recovery-staging batch results and failed-only retry. |
| v1.6.21 | 2026-07-18 | Defined non-atomic multi-select recovery-staging release batches. |
| v1.6.20 | 2026-07-18 | Defined evidence-gated release of safely rebuildable recovery staging. |
| v1.6.19 | 2026-07-18 | Defined long-term recovery-evidence waiting and non-cache storage accounting. |
| v1.6.18 | 2026-07-18 | Defined presentation-only startup-recovery deferral and silent evidence rechecks. |
| v1.6.17 | 2026-07-18 | Defined explicit startup-recovery entry, grouped evidence states, and safe action boundaries. |
| v1.6.16 | 2026-07-18 | Defined non-blocking startup reconciliation status and recovery routing. |
| v1.6.15 | 2026-07-18 | Defined the planned 30-second Safe Stop And Quit progress and deadline behavior. |
| v1.6.14 | 2026-07-18 | Added the planned Safe Stop And Quit confirmation rule for active no-window work. |
| v1.6.13 | 2026-07-17 | Defined static monochrome Application Status Center icon priority and accessible text behavior. |
| v1.6.12 | 2026-07-17 | Unified planned no-window subsystem status into one sectioned Application Status Center. |
| v1.6.11 | 2026-07-17 | Added the planned cross-platform anchored status-card interaction and privacy rule. |
| v1.6.10 | 2026-07-17 | Added the planned numeric-input plus slider interaction rule for bounded precise App Settings. |
| v1.6.9 | 2026-07-02 | Changed global menu hover to reserve a native browser safe area instead of hiding the whole web page, delayed injected hover previews until image load, and unified browser/React library dock glyphs. |
| v1.6.8 | 2026-07-02 | Hardened snapshot-backed browser hiding so slow native snapshots cannot leave WebContentsView above React overlays or menus. |
| v1.6.7 | 2026-07-02 | Introduced the renderer AppInteractionKernel adapter so AppShell, global menu, library dock, and download-flight animation consume one shared interaction projection. |
| v1.6.6 | 2026-07-02 | Aligned browser and overlay library docks through shared geometry, moved dock-open bridge handling into AppShell, and upgraded download-to-library motion into a source-image morph flight. |
| v1.6.5 | 2026-07-02 | Added Google-style root DESIGN.md UI tokens with Miro/Framer/Apple reference translations, promoted the library into the global menu, and tightened library accessibility affordances. |
| v1.6.4 | 2026-07-01 | Hid the React dock on browser routes, reserved the menu close icon for non-library overlays, and smoothed native snapshot handoff to reduce menu-hover flicker. |
| v1.6.3 | 2026-07-01 | Added an embedded-browser dock bridge so the library entry remains visible after removing the right-side native inset. |
| v1.6.2 | 2026-07-01 | Removed the permanent right-side native-browser dock inset so browser and overlay pages no longer reserve a blank lane. |
| v1.6.1 | 2026-07-01 | Changed the global menu to a snapshot-backed Apple-style glass popover so it floats over browser content without resizing the page. |
| v1.6.0 | 2026-07-01 | Replaced menu-hover browser hiding with native safe-area resizing and kept the library dock clear of the embedded browser layer. |
| v1.5.9 | 2026-07-01 | Removed login-state badges from the browser website rail and added a lightweight public web-link add form. |
| v1.5.8 | 2026-07-01 | Coordinated menu/overlay visibility with the native browser view and lightened overlay motion to avoid WebContentsView z-order conflicts. |
| v1.5.7 | 2026-07-01 | Kept the browser mounted as the persistent background and moved non-browser routes into closable Motion overlay workspaces. |
| v1.5.6 | 2026-07-01 | Reworked the shell around the browser-first home route, global menu, library dock, and Motion-based download-to-library feedback. |
| v1.5.5 | 2026-06-29 | Routed AI Console text-box provider normalization through the shared workflow used by settings. |
| v1.5.4 | 2026-06-25 | Routed AI Console runtime dependency install toast/log summaries through shared overview workflow projection. |
| v1.5.3 | 2026-06-25 | Routed AppShell, Sidebar, Topbar, and App route paths through shared App Navigation workflow metadata. |
| v1.5.2 | 2026-06-13 | Mapped Platform AI Runtime branches to existing concrete preload methods through adapter metadata. |
| v1.5.1 | 2026-06-12 | Centralized renderer selection of existing macOS/Windows Platform AI Runtime requests in one local adapter. |
| v1.5.0 | 2026-06-11 | Renamed the shared AI capability matrix component to `PlatformAiCapabilityMatrix` for Windows/macOS reuse. |
| v1.4.9 | 2026-06-06 | Added a manual CLIP/SigLIP real Embedding action and shared evidence display in AI Runtime management. |
| v1.4.8 | 2026-06-05 | Renamed the real asset-tagging action and left submission normalization in Electron main. |
| v1.4.7 | 2026-06-05 | Unified cooperative Worker readiness input and model-row composition through shared contracts. |
| v1.4.6 | 2026-06-05 | Made AI Console route overview branch-aware and removed macOS-only diagnostics/actions from Windows and unknown branch states. |
| v1.4.5 | 2026-06-05 | Routed macOS/Windows Platform AI Branch Status response selection through shared workflow logic. |
| v1.4.4 | 2026-06-05 | Routed macOS Worker probe connection and route tiles through shared evidence-aware projection. |
| v1.4.3 | 2026-06-05 | Routed AI Runtime card status, health results, icon semantics, and summary counts through shared workflow projection. |
| v1.4.2 | 2026-06-05 | Routed PlatformAiCapabilityMatrix status labels and badge classes through shared workflow projection. |
| v1.4.1 | 2026-06-04 | Added renderer rule for shared Download Status row metadata and status projection. |
| v1.4.0 | 2026-06-04 | Moved Color Palette image/theme display fields behind the shared Visual Analysis Snapshot. |
| v1.3.9 | 2026-06-04 | Added renderer rule for consuming Visual Analysis OCR/text-box/readability summary from the shared snapshot. |
| v1.3.8 | 2026-06-04 | Moved text-color panel state and swatch display fields behind the shared Visual Analysis Snapshot. |
| v1.3.7 | 2026-06-04 | Routed Color Palette panel through the shared Visual Analysis Snapshot mapper. |
| v1.3.6 | 2026-06-04 | Moved AI smart-tagging category pipeline defaults to the shared Asset Tagging Workflow planner. |
| v1.3.5 | 2026-06-04 | Added renderer rule for consuming Platform AI Branch Status projection instead of recomputing branch status. |
| v1.3.4 | 2026-05-31 | Added custom prompt reverse templates in AI Console and a custom reverse action in the asset prompt panel. |
| v1.3.3 | 2026-05-31 | Added a front-end reverse-prompt system panel and scrollable current-model prompt preview in AI Console. |
| v1.3.2 | 2026-05-31 | Reworked AI Console into a runtime cockpit with distinct overview, expandable Qwen3-VL installed versions, inference-service naming, and in-model memory policy controls. |
| v1.3.1 | 2026-05-31 | Changed AI Console settings into a default-closed floating overlay and hardened the desktop shell, sidebar, and topbar against narrow-window layout collapse. |
| v1.3.0 | 2026-05-31 | Promoted AI Console into a core AI workspace, moved AI-specific settings out of system preferences, refreshed AI/library interaction entry points, and cleaned navigation/topbar Chinese labels. |
| v1.2.3 | 2026-05-31 | Added settings control for external AI model and Llama runtime storage directories. |
| v1.2.2 | 2026-05-31 | Expanded Llama installer dropdown to show multiple Qwen3-VL quantization options per model size. |
| v1.2.1 | 2026-05-31 | Added Qwen3-VL model selection dropdown to the Llama installer wizard. |
| v1.2.0 | 2026-05-31 | Added settings-page Llama local service installation wizard. |
| v1.1.0 | 2026-05-31 | Added settings UI controls for external OpenAI-compatible and llama AI backends. |
| v1.0.0 | 2026-05-31 | Rewrote README with compact renderer ownership and maintenance rules. |
