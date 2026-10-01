---
name: Design Asset Manager Workstation
version: 0.3.0
description: Asset-workspace-first local AI design asset manager with fast
  intake, image-led discovery, explainable multimodal search, contextual AI,
  and optional professional-tool extensions.
influences:
  - "google-labs-code/design.md: tokens first, rationale second, actionable rules always."
  - "VoltAgent/awesome-design-md Miro: colorful tag/source/status accents and spatial canvases."
  - "VoltAgent/awesome-design-md Framer: polished artboard rhythm, precise surfaces, and motion taste."
  - "VoltAgent/awesome-design-md Apple: product/asset-first restraint, generous inspection space, quiet chrome."
  - "Claude/Gemini references: editorial calm plus lightweight AI/runtime feedback."
colors:
  source: "src/renderer/styles/design-system.css"
  primary: "#0064CE"
  canvas: "#F2F5FA"
  canvas_dark: "#171E2B"
  surface: "#FFFFFF"
  surface_dark: "#222C3D"
  ink: "#192333"
  muted_ink: "#4D5A6E"
  border: "#D7E0EC"
spacing:
  micro: 4
  compact: 8
  control_gap: 12
  panel_gap: 16
  workspace_margin: 20
  roomy: 24
  overlay_padding: 32
rounded:
  compact_control: 12
  asset_card: 18
  overlay_workspace: 28
typography:
  font_family: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  workspace_title: "29px / 1.2 / 610"
  panel_title: "14-18px / 1.25 / 700"
  control_text: "12-13px / 1.4 / 570"
  metadata: "10-12px / 1.35 / 600-800"
  code_prompt: "12px / 1.55 / 500 / ui-monospace"
motion:
  overlay_ms: 160-220
  menu_ms: 140-180
  dock_ms: 180-240
  easing: "cubic-bezier(0.16, 1, 0.3, 1)"
---

# Design Asset Manager DESIGN.md

Current visual and interaction authority is
[WORKSPACE-UI-SYSTEM.md](docs/design/WORKSPACE-UI-SYSTEM.md) and
`src/renderer/styles/design-system.css`. The user requested Apple-inspired
frosted glass and desktop interactions on 2026-09-10, superseding earlier
palette, typography, navigation and elevation directions in this historical
contract. Its domain, data-safety and explicit approval requirements remain.
ADR references describe target behavior where implementation evidence is absent.
Do not copy third-party code, logos or artwork. CSS glass is not native Liquid Glass.

## Current product scope and design workflow (2026-09-14)

[PRODUCT-FOUNDATION.md](docs/product/PRODUCT-FOUNDATION.md) and ADR 0483/0484
own core/optional/deferred scope, supplemented by ADR 0485 and
[Work Mode](docs/product/WORK-MODE-AND-MOTION-REFERENCE.md). Core UI makes palette/proportions, tag suggestions,
scene descriptions and prompt reconstruction useful in Inspector, search and batch
work. It distinguishes measured, generated, user-confirmed, pending, failed and
unavailable results, and explains which field or evidence matched. Model setup and
resource limitations remain visible without blocking manual library work.
Work Mode is a core lightweight creation surface: saved multi-asset sets in multiple
native floating windows, with viewing, contextual tools and safe external handoff.
Remove Reference changes only set membership. Library organization stays in the main
workspace; model grants and library authority are not broadened by a window. Save/load,
missing media, offscreen-window recovery and supported video/frame states are explicit.
The current single-card UI is a starting point, not proof these targets are complete.
Screen recording is an optional producer; videos and selected reference-frame records
belong to the host and remain useful after the recording plugin is removed.

Advanced matting/layer tools are optional extensions; the full marketplace and new
cloud development/MCP surfaces are deferred. Historical future screens below do
not require building those capabilities now or advertising them as available.

Design the core tasks and states first, then a low-fidelity UX flow and a small
implementable data/contract slice. Validate actual analysis → retrieval → reuse
before polishing all screens or freezing a broad SDK. Refine this design contract
and the current UI system as evidence develops; neither a static mockup nor a long
design document substitutes for a working, understandable workflow.

## 1. Visual Theme And Vibe

Design Asset Manager is a creative workstation. The user is collecting,
inspecting, tagging, searching, and operationalizing visual assets. The app
should feel calm enough for long sessions, precise enough for production work,
and alive enough that downloads, overlays, and AI/runtime states feel physical.

Use these reference translations:

- Google DESIGN.md: keep design decisions explicit and reusable by agents.
- Miro: use color as collaboration/status vocabulary, not decoration.
- Framer: use polished spatial panels, crisp typography, and purposeful motion.
- Apple: let real assets, screenshots, and previews dominate the visual field.
- Claude: make dense information readable with editorial restraint.
- Gemini: make AI states feel responsive, lightweight, and confidence-aware.

## 2. Color Palette And Roles

Use the single semantic token source in `src/renderer/styles/design-system.css`.
Primary actions and selection use blue; success, warning and danger retain
separate colors and labels. Glass belongs to navigation/control surfaces;
asset content remains sharp and text contrast must survive the fallback mode.

## 3. Typography

Use system typography, 29px semibold workspace titles, 12–13px controls and
11px supporting text. Actual tokens and spacing are defined in the current
workspace UI specification. Do not use viewport-scaled type.

## 4. Components And Surface Language

Asset Workspace shell:

- The Asset Workspace is the default product layer and keeps browsing,
  discovery, inspection, organization, and contextual AI in one stable frame.
- Real assets and retrieval evidence lead; runtime and acquisition machinery
  remain secondary.
- Embedded web browsing, collection, website login and external search are
  retired. Future browser connectors hand off to reviewed host intake.

Global command menu:

- Persistent labeled sidebar owns primary destinations; the right-top menu
  holds secondary tools. Neither depends on hover.
- Keep Asset Workspace and currently available import/activity, settings,
  diagnostics/model management and theme actions reachable. Target-only
  destinations do not become active navigation merely because they appear here.
- Asset Workspace must never depend on a browser-layer dock or overlay.

Library:

- Real asset imagery leads.
- Cards are repeated items and may be visually expressive.
- Search/filter surfaces should be compact and durable.
- Tags and source badges are secondary but colorful enough to scan.
- Follow ADR 0413 Search-First Organization: do not render Unsorted membership
  or missing optional enrichment as an error, mandatory backlog, or lower-value
  asset state.
- Follow ADR 0414 Generic Organization Model: client/project language may label
  user collections and boards, but core navigation must not imply a dedicated
  CRM or project-management hierarchy.
- ADR 0415 Custom Fields are optional library-owned metadata. Missing values
  must not render as incomplete assets unless a user has explicitly filtered
  for field presence or absence.
- ADR 0416 allows the same fields on Candidate and Design Asset inspectors, but
  Collections, Sources, Tags and Smart Filters must not render as universal
  custom-field records.
- ADR 0417 field editors use controls appropriate to Text, Number, Date,
  DateTime, Boolean, Single Select, Multi Select and URL. Single/multi-line Text
  is a presentation choice, not a different stored field type.
- ADR 0418 requires plugin/import field proposals to render inside trusted host
  review as Create New, Map Existing or Exclude; extension UI must never imitate
  schema authority or present a proposal as already installed library structure.
- ADR 0419 renders AI Custom Field results as suggestions with provider/
  confidence provenance and explicit accept, edit-and-accept, reject or delete
  actions; they must not visually occupy the current confirmed-value slot.
- ADR 0420 makes Archive Custom Field the ordinary removal action. Archived
  fields disappear from normal Inspectors and search/filter builders but remain
  restorable in a dedicated field-management surface. Permanent Delete Custom
  Field must be visually separated as high risk and first show affected
  Candidate, Design Asset, current-value and unresolved-suggestion counts in a
  trusted impact review.
- ADR 0421 keeps affected Saved Searches, User Smart Filters and Import Mapping
  Presets visible but inactive when a referenced field is archived or missing.
  Show the exact unavailable criterion/mapping and explicit restore, remove or
  compatible-remap path; never render the dependent object as if the condition
  had been omitted or a same-name field had replaced it.
- ADR 0422 treats field names as editable labels, not identity. Active field
  names must remain unique; creation/rename collisions stay inline and block
  commit without automatic suffixing. Restoring an archived field with a name
  collision opens a trusted choice to rename the archived or active definition
  before restoration, never a merge or automatic dependency reassignment.
- ADR 0423 permits direct type editing only when the field has no current
  values, unresolved AI suggestions or stable dependencies. A used field opens
  a visual Type Migration Preview with target field identity/type, convertible
  and retained-unconvertible value counts, and every Saved Search, User Smart
  Filter or Import Mapping Preset needing explicit remapping. Never present
  lossy coercion, silent clearing or dependency retargeting as completed work.
- ADR 0424 labels conversions as lossless, rule-governed or unconvertible.
  Rule-governed conversion requires a visible rule selector, representative
  before/after examples and affected/convertible/retained counts before confirm.
  Never preselect a rule from OS locale, language, region or current timezone,
  and keep failed or ambiguous values visibly retained on the source field.
- ADR 0425 exposes a safe path for every directed type pair. When built-in rules
  are insufficient, Manual Conversion Mapping provides structured batch
  conditions, distinct-source-value rows and per-item overrides with inline
  target-type validation. Clearly show precedence and unresolved counts; never
  depict a hidden Text bridge, executable formula or forced conversion.
- ADR 0426 keeps source and target fields visibly distinct during resumable
  execution. The target shows Migration In Progress with committed, failed,
  conflict, unconvertible and remaining counts plus pause/cancel controls.
  Terminal result review precedes a separate source-archive confirmation. Undo
  previews eligible unchanged generated values and excluded later edits; never
  imply whole-library rollback or deletion of the target definition.
- ADR 0427 allows immediate target-field search and filtering while showing
  Partial Custom Field Migration Coverage in the Inspector, criterion/facet and
  result surfaces. Results use committed target values only, never source-field
  fallback or query-time conversion. Saved criteria keep their identity when
  the live coverage state clears after every requested item becomes terminal.
- ADR 0428 lets users save a named library Custom Field Conversion Preset from
  validated semantic rules, with an explicit include control for Distinct-Value
  Mappings. Show that field identities, item selection and Per-Item Overrides
  are excluded. Applying a preset always opens a fresh migration preview with
  current validation and a separate confirmation; never present it as Run Now.
- ADR 0429 keeps the complete migration result and Undo available without an
  expiry countdown until the user reviews the result and chooses Archive Source
  Field or Keep Source Field Active. Then show the user-configurable deadline,
  default 30 days, and live eligible/excluded Undo counts. Early clearing must
  say that it ends Undo; expired detail becomes value-free aggregate history.
- ADR 0430 presents one current Custom Field schema-maintenance task plus an
  ordered queue shared by migrations and large Select-option operations.
  Allow Pause/Resume on the selected eligible task, but drag or move controls
  only for not-started tasks; show why a task is Waiting or Needs Attention
  after fresh admission validation.
  Foreground/background Energy Saver, Balanced and Full Speed profiles, plus
  background Pause, affect future work only. Never imply Force Stop, fixed CPU
  use, guaranteed completion order or concurrent database writers.
  Label task-level Pause as allowing the next eligible task to run. Keep a
  separate Pause All/Resume Eligible Maintenance lane control in the queue and
  Application Status Center; resuming the lane never resumes individually
  paused tasks.
  Returning to foreground clears only background-profile Pause automatically.
- ADR 0431 shows the shared maintenance profile, effective safe capacity,
  current limiting reason and memory reserve without promising CPU share or
  completion time.
  Full Speed reserve uses synchronized 10%–50% numeric input and slider with a
  20% default. If responsiveness throttles admission, show the typed reason;
  Pause acknowledgement must distinguish request receipt from item settlement.
- ADR 0432 gives every Single/Multi Select option stable identity. Rename and
  reorder are non-destructive; Archive marks retained values/results inactive
  and removes the option from new assignment. Permanent Delete first shows
  Candidate, Design Asset, value, suggestion and dependency counts. Option Merge
  previews an exact source-to-target replacement, Multi Select deduplication and
  conflicts; never imply that matching labels merge automatically.
- ADR 0433 applies one library-versioned, locale-independent Unicode comparison
  policy to field names and sibling Select-option labels. Preserve display
  spelling and internal whitespace, but trim edges, normalize to NFC and use
  full Unicode case folding for collision checks. Show restore collisions for
  explicit rename or same-field option merge; never auto-suffix or name-merge.
- ADR 0434 runs confirmed large Select-option merge/delete plans as durable
  tasks in the shared schema-maintenance lane with per-owner/dependency atomic
  results and restart reconciliation. Merge has acknowledgement-gated 30-day-
  default bounded Undo for unchanged effects. Permanent Delete blocks new
  assignment, becomes pause/resume-only after its first irreversible commit,
  exposes partial coverage until every reference is resolved, and has no Undo.
- ADR 0435 validates, stores, sorts and filters Number values as exact finite
  Decimal128-equivalent decimals with up to 34 significant digits. Keep range
  constraints exact and keep display precision/grouping/unit labels visibly
  separate from numeric identity. Invalid precision/range input stays visible
  with an error; never clamp, binary-float, silently round or imply unit
  conversion.
- ADR 0462 gives manual Number entry a visible device-local input locale backed
  by pinned parsing data. It accepts strict localized decimal/grouping and exact
  scientific notation, while canonical-versus-locale conflicts show both exact
  interpretations and block commit until corrected. Currency, percent, unit,
  expression and rich/object input are rejected rather than stripped or
  calculated. Invalid and out-of-range literals remain Number Edit Drafts.
  Ordinary display may be formatted, but editing always starts from a complete
  round-trip exact value; a numerically changed precision display is visibly
  approximate and offers full exact access.
- ADR 0463 defaults Number presentation to Automatic Exact. Definitions may
  instead choose Fixed Decimal Places from 0–34 or Significant Digits from
  1–34; both use exact decimal round-half-to-even and never rewrite a value.
  Only a numerically changed rounded result receives `≈`; trailing-zero changes
  remain exact, and negative values rounded to zero do not invent negative zero.
  Grouping defaults to Auto with portable Auto/On/Off intent, pinned localized
  separators for ordinary notation and no grouping in scientific notation.
  Units remain outside the numeric token, and every approximation opens the
  full exact value.
- ADR 0464 switches an inline Number to a visibly labelled normalized
  scientific fallback when its configured numeric token exceeds 64 Unicode
  graphemes or its complete number/unit cannot fit. The fallback represents the
  same exact or already-rounded display result without a second rounding and
  preserves `≈`. Its read-only detail separately shows the complete requested
  formatting and authoritative exact value, generating long text only on
  demand. Ellipsis is allowed only when even the fallback cannot fit and must
  retain an overflow marker plus detail entry.
- ADR 0465 gives every manual Custom Field type one typed draft parent,
  contextual Unsaved Custom Field Changes Gate, protected device-local recovery
  infrastructure and chronological current-library session Undo stack. Types
  keep their own input, validation and commit gestures; window blur never
  commits. Empty Number input proposes Clear-to-Missing and never zero, while
  invalid or ambiguous Number literals remain drafts and are reparsed under
  current rules after recovery. Text ADRs remain specializations rather than
  parallel gates, journals or stacks, and batch/AI/import/migration actions keep
  separate operation-scoped Undo.
- ADR 0466 turns every multi-draft Unsaved Custom Field Changes Gate into one
  reviewed transition plan with an explicit Save or Discard choice per field.
  Save All requires every draft to be current and valid; Fix or Stay returns to
  the first blocker, while multi/recovered Discard All requires confirmation.
  Trusted complete preflight occurs before mutation, each owner's selected
  fields commit atomically in frozen order, and cross-owner failures retain
  failed/unstarted drafts with a truthful partial result. Navigation remains
  blocked until all drafts resolve; this is not Batch Activity and has no
  durable result history.
- ADR 0467 preserves every same-owner atomic multi-field save as one Compound
  Custom Field Edit Undo Step. It stores ordered typed field deltas in the
  session-only shared stack and never creates per-field Undo entries for that
  transaction. Undo and Redo revalidate every field and restore the complete
  owner group in one transaction or none; one drifted delta blocks the whole
  compound step without partial replay or silent fallthrough. Cross-owner
  resolution contributes one step per proven owner in actual commit order, and
  discarded, failed or unstarted groups contribute none.
- ADR 0468 keeps an Unavailable Custom Field Edit Undo Step at the top of the
  shared stack instead of silently skipping it. Its contextual review defaults
  to Keep and silently rechecks only relevant exact evidence; restored
  eligibility re-enables Undo but never executes it. Confirmed Remove Undo Step
  rechecks first, then deletes only the complete in-memory entry and its Redo
  branch, changing no values or history. The next older step becomes newest but
  is not prevalidated or executed. Compound/type deltas cannot be removed
  separately, and there is no skip-once, automatic removal or clear-all action.
- ADR 0469 bounds the device-local manual stack by both complete entry count and
  estimated retained bytes: 200 steps and 64 MiB by default, adjustable in
  Advanced Settings to 20–1,000 and 8–256 MiB through synchronized integer
  inputs/sliders. New entries evict complete oldest steps until both caps hold;
  compound and unavailable entries are never split or pinned. Lowering a cap
  first reviews projected whole-step loss. A prospective step larger than the
  current byte cap opens Oversized Manual Undo Review before any write, offering
  an in-range limit increase, return with drafts preserved or explicit Save
  Without Manual Undo. Cross-owner plans resolve every oversized owner during
  zero-write preflight, and Undo values never spill to disk.
- ADR 0470 makes every proven Save Without Manual Undo a Manual Undo History
  Boundary. Its pre-commit confirmation discloses that the save itself and all
  currently retained manual Undo/Redo opportunities will become unavailable,
  using aggregate counts and estimated memory only. Cancellation or failed
  commit preserves the stack; proven commit clears it before success becomes
  observable and leaves no crossable barrier. In a frozen cross-owner plan,
  each reviewed no-Undo owner clears entries before its exact commit position,
  including earlier entries from that plan, while later recordable owners begin
  a new timeline. Operation-scoped batch, AI, import, migration, conflict and
  Promotion Undo remain independent.
- ADR 0471 keeps the configured manual Undo budget subordinate to proven
  Critical operating-system memory pressure. Ordinary/warning pressure first
  stops background admission and releases unpinned models, rebuildable previews,
  caches and other disposable memory. Only fresh platform-qualified Critical
  evidence that remains afterward permits trusted oldest-first reclamation in
  bounded whole-entry batches with an evidence refresh after every batch.
  Compound and unavailable entries are not split or pinned; drafts, protected
  recovery and active authoritative writes are never reclaimed. No blocking
  prompt or system notification is used, but the active UI reports a
  content-free expired count plus retained count/estimated bytes. Unknown or
  stale pressure cannot invoke this irreversible last resort.
- ADR 0472 keeps Boolean values binary while presenting Missing separately.
  Inspector uses an explicit accessible Not Set/Yes/No three-choice control,
  with a semantically identical dropdown fallback at constrained widths; it
  never uses an ambiguous switch, indeterminate checkbox, repeated-click clear
  or implicit False. Choosing the current state is a no-op. Another choice
  becomes a trusted immediate commit request with a field-scoped Pending state,
  exact revision revalidation and no optimistic authority, draft or recovery
  record. Failure retains the prior state; proven change creates one ordinary
  manual Undo step containing the exact previous Boolean-or-Missing state.
- ADR 0473 lets a Boolean definition optionally store a portable True/False
  default, disabled by default and labelled Future New Owners Only. It applies
  once only to a newly created Candidate or non-Promotion Design Asset when no
  explicit intent exists. Reviewed import True/False/Missing wins, and
  Promotion transfers the Candidate's exact value-or-Missing without applying
  the default again. Default changes never backfill existing owners; current
  initialization requires a separate reviewed batch. Creation/import review
  shows the applied source and binds the exact definition revision, while
  archive suspends future application and plugins may only propose the rule
  through trusted definition review.
- ADR 0474 generalizes that rule to one default-Off Static Custom Field Default
  for every core type. The stored value uses the exact authoritative Text,
  Number, Date, DateTime, Boolean, stable Single/Multi Select identity or URL
  representation and must satisfy current validation; input/display strings and
  labels are never schema values. All types share future-owner-only application,
  explicit/imported/transferred precedence, no Promotion reapplication, no
  backfill and revision-bound review. Dynamic Today/Now, filename/path, user,
  device, random/sequence, AI/plugin callback, formula and field-reference
  values remain automation, not defaults.
- ADR 0475 prevents user-authored schema/option changes from leaving an invalid
  future-write rule: zero-write preflight requires a valid replacement, Disable
  Default or cancellation, while reviewed Select merge may explicitly retarget
  stable identities. Migration/upgrade/recovery-discovered invalidity instead
  preserves the exact default as Suspended and shows one definition-level
  Default Needs Attention state. It never applies or mutates that default.
  Direct creation/import explains the affected field will remain Missing;
  automatic creation continues without per-owner failure, retry, notification
  or Review Signal. Repair is current-validated and future-only, with no
  backfill.
- ADR 0476 makes intentional existing-owner initialization a separate Reviewed
  Batch Action. Selection, a stable filter generation or explicit library-wide
  scope freezes exact owners; each chosen field uses a reviewed static-default
  snapshot or explicit exact typed value. Preview separates eligible Missing
  assignments from present, Out-of-Constraint, invalid and conflicted
  exclusions. One owner group commits all its eligible selected fields
  atomically; owners commit independently with truthful partial results.
  Pause/cancel/restart use owner boundaries and ordinary batch conflict guards,
  while pre-confirm definition/default drift invalidates the plan. Successful-
  group Undo clears only still-current effects back to Missing, stores no prior
  value payload and never enters the manual Undo stack.
- ADR 0477 binds that operation's recovery authority to the exact Local Library
  Instance rather than its initiating device. Another compatible device may
  explicitly Resume, Cancel Remaining or Undo proven effects only after Library
  Open Inspection and exclusive write ownership. Undo cannot begin while the
  plan remains resumable: Cancel Remaining And Undo Completed must first
  terminalize the unstarted scope. Copied/colliding instances, restored backups
  and missing, corrupt or unsupported records never inherit or guess authority.
- ADR 0478 makes Current Selection, one Stable Filter generation and
  Library-Wide three active-library-only scope sources. Library-Wide freezes all
  current Active Candidates and non-deleted Design Assets; mixed owner classes
  remain separately counted. History, cleanup and Asset Trash records are
  disclosed exclusions even when visible, while source-byte unavailability
  alone does not remove an active Design Asset's metadata eligibility.
  Pre-confirm membership drift requires a fresh preview; post-confirm lifecycle
  drift conflicts only that owner and never follows Promotion or substitutes a
  new/restored object.
- ADR 0479 permits manual retry only for explicitly selected terminal owner
  groups whose transient failure and complete no-commit outcome are proven.
  Trusted execution revalidates the unchanged full atomic group and still-
  Missing state before reusing the frozen assignment. Present values, drift,
  ambiguous outcomes and recovery states never become Retry authority.
  Attempts use the existing per-owner limit of three and merge into the original
  result; no automatic or catch-all Retry All action exists.
- ADR 0480 gives each terminal initialization result one forward-or-reverse
  direction. Forward Recovery Open permits reviewed retries and accumulates
  every retry success into the potential Undo set. Undo review discloses both
  eligible successes and retry eligibility that will be abandoned; successful
  trusted admission durably closes all forward retry before the first reverse
  commit. Retry/Undo never overlap, and partial or failed Undo never reopens the
  old plan or creates Redo.
- ADR 0481 starts one user-configurable, default-30-day Missing Initialization
  Action Window at first terminal reconciliation. Result detail, Retry evidence,
  Undo effects and direction share its fixed deadline; later actions, views,
  restarts and devices never extend it. Expiry stops new owner admission while
  an in-flight atomic group settles, then removes executable detail without
  changing values. Clear Result And End Actions offers the same early outcome
  after disclosing retry, Undo, conflict and direction aggregates; only
  value-free Pruned Batch Detail may remain.
- ADR 0436 marks every DateTime as Known Instant or Time Zone Unknown. Show the
  original local time and offset for known instants and permit non-mutating
  display-zone conversion; never convert an Unzoned value. Filters must choose
  instant or local-component comparison and may filter by zone-known state.
  Zone assignment is explicit, with daylight-saving gaps blocked and overlaps
  requiring the exact occurrence rather than a hidden earlier/later default.
- ADR 0437 defaults DateTime editing to whole seconds and permits zero through
  nine source-significant fractional digits. Display only the declared digits
  while comparing exact nanoseconds. Minute-only input must preview appended
  `:00`; over-nine-digit values remain blocked until a reviewed rounding or
  truncation rule is selected. Never fabricate fractional zeros.
- ADR 0438 impact-previews every potentially restrictive validation-rule edit.
  After confirmation, new writes use the rule immediately while retained
  failures show Out of Constraint instead of being changed or hidden. Keep
  them searchable/filterable/exportable; block new copying, AI acceptance and
  stale import mappings. Large revalidation shares the maintenance queue and
  shows valid, out-of-constraint, Unknown, failed and conflict coverage.
- ADR 0439 synchronously revalidates Candidate field values at Promotion.
  Transfer valid and Out-of-Constraint values unchanged to the Design Asset;
  show the latter as a non-blocking warning rather than Required Review. Block
  only missing/incompatible field identity or concurrent value/schema changes,
  never drop metadata to make Promotion succeed. Undo restores exact values and
  validation evidence before applying the current rule's live marker.
- ADR 0440 stores Text values in Unicode NFC while otherwise preserving case,
  whitespace and line breaks. Single-line and multi-line are editor choices,
  never distinct stored types. Default the per-field maximum to 10,000
  user-perceived characters and allow 1–65,536, counted as grapheme clusters
  under pinned Unicode data. Reject new over-limit values and use ADR 0438 when
  a later tighter limit makes retained text Out of Constraint; never trim,
  collapse or truncate authoritative text. Search normalization is derived only.
- ADR 0441 treats zero-length Text after NFC as Missing and stores no empty
  sentinel. Preserve non-empty whitespace-only Text as a present value and show
  a non-blocking pre-save warning rather than trimming or rejecting it; it may
  have no lexical token but still matches presence and exact-value behavior.
  Import and migration previews distinguish missing/null, zero-length and
  whitespace-only inputs. AI empty output cannot clear a current value.
- ADR 0442 accepts only well-formed Unicode Text and rejects NUL, unpaired
  surrogates and C0/C1 controls other than TAB, LF and CR. Preserve valid
  bidirectional and zero-width formatting, but show a non-blocking invisible-
  character warning with a reveal mode that labels each code point. Manual,
  AI, import and migration inputs never strip invalid controls silently;
  retained values newly rejected by policy use ADR 0438, and export escapes
  rather than executes or discards preserved content.
- ADR 0443 optionally validates a present Text value with a 1-to-current-
  maximum grapheme minimum and one library-versioned linear-time Unicode
  pattern. Missing remains valid. Pattern mode is explicitly Entire Value or
  Contains; exclude backreferences, lookaround, recursion, conditions and code.
  Show user-entered example tests and ADR 0438 impact before activation. Never
  use a native regex fallback, and migrate pattern/Unicode versions only through
  reviewed library-schema compatibility and impact evidence.
- ADR 0444 defaults portable patterns to case-sensitive whole-value anchors
  with dot excluding line boundaries. Store independent case-insensitive,
  multiline-anchor and dot-all options on the definition; never inherit flags.
  Case-insensitive mode uses pinned locale-independent Unicode simple folding,
  not ADR 0433 full name folding, and property classes use the same pinned data.
  Option changes participate in tests, impact evidence and ADR 0438 review.
- ADR 0445 gives Text no unique-value constraint. Never block save, AI
  acceptance, import, migration or Promotion; never mark duplicate values Out
  of Constraint or merge their owners. Advanced Filters may group duplicate
  current values for one stable field using an explicit Exact, Case-Insensitive
  or Normalized comparison and save the criterion as a library-wide Smart
  Filter. Keep findings advisory and distinct from content Duplicate Signals;
  cross-library presentation never implies name-based field equivalence or
  global uniqueness.
- ADR 0446 derives versioned duplicate keys without rewriting Text. Exact uses
  authoritative NFC; Case-Insensitive uses locale-independent full case fold
  plus NFC without trim/whitespace/diacritic removal; Normalized uses pinned
  `NFKC_Casefold`, standard default-ignorable handling, collapsed Unicode
  whitespace and edge trim without extra accent/punctuation stripping. Empty
  derived keys from present values can group but never equal Missing. Show
  original distinct forms and review group changes before policy migration.
- ADR 0447 defaults library-wide duplicate evaluation to Active Candidates and
  non-deleted Design Assets after all explicit criteria, requiring two in-scope
  current owners per group. Type criteria narrow the population; Include
  Deleted is explicit; history is excluded; Out-of-Constraint values remain.
  Render owner types in separate native result groups but show total/type counts
  and one read-only cross-owner comparison panel. Promotion/Undo switches the
  one counted owner atomically; stale projections refresh, never double-count.
- ADR 0448 binds each opened Duplicate Text Finding Session to one complete
  query/projection generation. Later edits and lifecycle changes expose a
  separately counted refresh state without mutating rows, groups or frozen
  totals; owner editing uses the normal Inspector and revalidates current
  authority. Explicit refresh replaces the result set, while reopening a saved
  Smart Filter computes a fresh generation rather than restoring memberships.
- ADR 0449 keeps Duplicate Text findings outside Review Signal, attention and
  suppression lifecycles. A group may collapse only for its current session;
  no resolved/ignored history, badge or portable exception is created. Reusable
  narrowing requires ordinary visible User Smart Filter criteria applied before
  grouping, and no row action silently writes those exclusions.
- ADR 0450 gives Text fields explicit presence, comparison, grapheme-length,
  portable-pattern, validation-state and duplicate-grouping conditions.
  Comparison conditions store Exact, Case-Insensitive or Normalized mode plus
  policy version; patterns keep their own portable options. All content,
  negative, length and validation operators evaluate present values only, so
  Missing requires an explicit condition and Unknown validity remains distinct.
- ADR 0451 supports ascending/descending Text Custom Field Sort through
  versioned Natural or Exact Unicode modes. Natural sorting is numeric-aware
  and freezes a visible language/tailoring; Exact compares authoritative NFC.
  Missing stays last in both directions, whitespace-only remains present,
  validation state never affects order, and saved sorts retain their stable
  field dependency instead of following device locale or falling back.
- ADR 0452 avoids eager high-cardinality Text facets. An explicit Distinct Text
  Value Browser binds the exact field, scope, comparison mode and one generation
  while loading uncapped bounded pages with entry search and explicit refresh.
  Missing is exclusive; whitespace-only is a labelled non-additive present
  subset; folded/normalized groups expand original forms. Selection creates
  ordinary visible conditions and never schema, Select options or saved browser
  snapshots.
- ADR 0453 defaults each Text field to a portable Compact editor unless its
  definition explicitly chooses Expanded. Both preserve multiline content;
  Compact marks summarized values and expands before multiline editing or
  commit. Expanded stays vertically resizable within Inspector bounds and shows
  minimum/current/maximum grapheme evidence, whitespace warning and
  invisible-format reveal. Temporary expansion never changes field schema.
- ADR 0454 specializes ADR 0465 for Text typing and IME composition in a
  revision-bound draft.
  Compact Enter and Expanded Command/Ctrl+Enter commit outside composition;
  Shift+Enter expands Compact and inserts a line break, while Expanded Enter
  remains a line break. Deliberate same-Inspector field exit may commit a valid
  current draft, but window blur never does. Invalid and stale drafts remain
  visible, and owner/result/route/library/close transitions use one Save,
  Discard or Stay gate instead of silently losing work.
- ADR 0455 supplies the Text record class inside ADR 0465's protected draft
  recovery infrastructure. It protects composition-complete Text drafts after
  an unclean termination through operating-system encryption with no plaintext
  fallback. Same-instance library activation shows only a
  non-blocking count and contextual recovered markers; it never navigates or
  commits. Current drafts return pending, stale drafts enter field-aware review,
  and unavailable identities are never name-matched. Settings and Forget
  Library Registration expose explicit counted Keep/Clear choices, while
  normal close/quit still uses Save/Discard/Stay.
- ADR 0456 supplies Text-typed steps inside ADR 0465's shared manual Custom
  Field Undo framework. A focused Text Edit Draft first owns Undo/Redo and one
  successful manual save creates one typed step, not one per keystroke. With no
  active draft, global Undo identifies the newest typed current-library step
  across all field types; Undo and Redo require exact current owner, field,
  rule and value revisions. Divergence opens field-aware review or disables the
  newest step without falling through. The memory-bounded shared stack clears
  on Library Switch or exit and never becomes recovery or metadata history.
  ADR 0467 keeps a Text delta inside a same-owner multi-field save inseparable
  from that compound cross-type Undo/Redo step.
- ADR 0457 makes every multi-owner Text edit a Reviewed Batch Action. Batch
  Inspector shows All Missing, Same Value or Mixed Value and defaults to No
  Change; Set, Clear, Prefix, Suffix and case-sensitive NFC Exact Literal
  Replacement each open a frozen preview. Transformations default to present
  values, while Treat Missing Text As Empty is explicit. Preview shows bounded
  examples and mutually exclusive changed/unchanged/invalid/conflict/excluded
  counts, with existing Out-of-Constraint as a non-additive subset. Execution
  commits per owner with live rule/revision checks, keeps selection visible and
  never feeds the shared manual Custom Field Edit Undo Stack.
- ADR 0458 keeps active Batch Text progress recoverable in a library-bound
  operation record that contains no previous Text. Exact before/after Undo
  evidence is OS-protected and device-local; failure to stage it stops later
  items. Restart reconciles proven commits and leaves remaining owners Paused
  for explicit Resume, Cancel Remaining or evidence-qualified Undo Completed.
  Terminal aggregate result, local detail and Undo share a 30-day-default
  window; clearing discloses remaining eligible Undo. Insufficient protected
  journal storage blocks by default, with only a separate high-risk Execute
  Without Undo confirmation allowed.
- The same library opened on another device never imports or reconstructs a
  Batch Text Undo Journal. That device may inspect aggregate state and Cancel
  Remaining, but Resume, Undo Completed and Clear Result And End Undo remain
  unavailable. Cancellation leaves only a value-free terminal marker so the
  initiating device applies the original terminal deadline when it returns;
  continuing elsewhere requires a new Batch Text Edit Plan over current values.
- Forget Library Registration shows path-free Batch Text recovery counts and
  defaults to Keep Batch Text Recovery as inactive device-local recovery. An
  unfinished journal cannot be cleared there: Cancel Remaining must first make
  the operation terminal. Uninstall Preparation separately recommends
  cancelling uninstall to review recovery; explicit proceed safely pauses
  reachable operations and warns that every represented Batch Text Undo will
  be lost without export. It does not imply Cancel Remaining. Unintercepted
  external removal writes nothing to the library and also leaves the operation
  Paused.
- ADR 0459 makes paste and text drop accept only an explicitly declared Unicode
  plain-text representation. Rich formatting is ignored only when that plain
  representation exists; the app never derives Text from HTML/RTF or an opaque
  transferable. Accepted content remains a draft, preserves all whitespace and
  valid invisible formatting, and then follows ordinary NFC and validation
  rules without silent cleanup. URL/path-looking strings remain literal.
  File/image/asset drops are rejected by Text fields, while dedicated Add
  Assets and Original Handoff targets retain their separate behavior. Batch
  Text parameter editors use the same contract.
- ADR 0460 makes native Copy/Cut selection-only plain-Unicode actions. No
  selection is a no-op; Cut deletes from the draft only after clipboard write
  succeeds and participates only in draft-local Undo. Unsafe controls block the
  whole Copy/Cut without silent cleanup, while other safe but invalid draft
  content remains copyable. Copy Full Text resolves a complete visibly
  unsaved/stale draft when present, otherwise the authoritative value; Missing
  is unavailable, and Compact summaries never supply clipboard content.
  Copied content becomes OS/user-owned and is never automatically read back or
  cleared despite possible clipboard-manager retention.
- ADR 0461 keeps spelling, grammar and rewriting help non-authoritative and
  draft-only. Only proven on-device capabilities may check continuously;
  platform services with unknown or possible network behavior require an
  explicit External Writing Assistance Request. Writing languages and optional
  input substitutions are device-local, while correction, capitalization,
  smart punctuation and system replacements default Off. Applied proposals
  remain range-bound draft edits with local Undo and normal validation.
  External requests disclose provider, purpose and selection-versus-complete-
  draft scope each time, send no surrounding asset/library context by default
  and never auto-apply a response.

Inspector drawer:

- Dense but calm.
- Has an explicit accessible close affordance.
- Collapsed side panels leave the readable/interactive tree.
- Compact Text fields must disclose hidden multiline content; Expanded Text
  fields may resize vertically without causing horizontal overflow or hiding
  validation evidence.
- Text draft errors and stale-revision conflicts stay inline with the owning
  field. Input-method candidate controls take keyboard priority, and an active
  field consumes Escape before the surrounding preview or drawer closes.
- Recovered Text drafts use a content-free library-level count and contextual
  field marker; no notification, startup modal or automatic selection may
  reveal or navigate to private draft content.
- Undo/Redo availability must identify whether the command targets the active
  draft or the latest committed Text edit. A stale or expired step must render
  unavailable/conflicted rather than silently targeting another field.
- Batch Text controls must never replace Mixed Value with an implicit input.
  Exact action, Missing behavior and before/after examples remain visible
  through confirmation, execution and result review.
- Interrupted Batch Text work must remain visibly Paused and must never
  auto-resume metadata writes. Global progress and notifications show only
  aggregate counts; Resume/Undo controls appear only when their protected
  device-local evidence is available.
- On a device without the originating Batch Text Undo Journal, show why Resume,
  Undo and early result clearing are unavailable. Cancel Remaining remains
  explicit and creating a new batch must not look like continuing the old Undo
  chain.
- Forget and Uninstall Preparation surfaces show only path-free active/Paused
  and terminal-Undo counts. Keep is the Forget default; destructive local
  removal has no remembered choice and must distinguish recoverable in-app
  preparation from external application deletion the product cannot intercept.
- Text paste/drop must never render or execute HTML, insert a file path,
  auto-link an asset or silently strip rejected characters. Unsupported
  transfer types keep the draft unchanged and receive contextual feedback;
  invalid accepted plain text stays visibly editable for correction.
- Text Copy/Cut feedback never echoes content. Copy Full Text must distinguish
  Unsaved Draft from authoritative value, keep whitespace/invisible warnings
  visible and never copy ellipses, labels or a collapsed presentation string.
- Text writing diagnostics must distinguish Checked, Not Checked and
  Unavailable without implying that no findings means valid content. Automatic
  input transformations need device-local opt-in and draft Undo. A potentially
  external request must remain a separate trusted action with visible provider,
  purpose and exact Text scope; provider setup, AI Value Suggestions and
  extension permissions cannot silently activate it.
- Local paths and source URLs may appear inside the app when needed, but never
  in chat reports or generated public summaries.

AI Console:

- AI Console is a secondary diagnostics and model/runtime-management surface,
  not the primary AI workflow or product home.
- Dense diagnostic presentation is acceptable, but every status must have
  text and must route user-facing work back to the relevant Asset Workspace
  context.
- Runtime cards should distinguish ready, unknown, planned, blocked, and failed
  states without relying on color alone.
- Prompt previews need strong reading containers and clear scroll boundaries.

System status card:

- Use one application-owned icon and compact card anchored to the native macOS
  menu-bar or Windows notification-area item; subsystems never add separate
  tray icons and the card is not a miniature main window.
- Keep the native icon static and monochrome/template-based. Project only the
  highest current state mark in Needs Attention, Paused/Waiting, Running, Idle
  order; keep counts in the card and expose full text through tooltip and
  accessible name. Color is never the sole state signal.
- Use Apple-inspired restraint, subtle depth and short motion while following
  platform focus, keyboard, high-contrast and reduced-motion behavior; never
  copy platform trade dress.
- Divide long-running export, AI, download/install and preview/index work into
  independently controlled sections. Collapse idle sections and place Needs
  Attention sections before merely active sections.
- Lead with aggregate state, current resource profile and limiting reason. Keep
  private asset names, thumbnails, paths and metadata out of the surface.
- Keep Open and Quit global; Pause/Resume is section-scoped and never affects a
  sibling subsystem. Destructive cancellation, output deletion and replacement
  require the full reviewed application UI.
- When work is active, global Quit opens a content-free aggregate confirmation
  with Safe Stop And Quit recommended, Open Application and Cancel. Do not offer
  Force Quit or Finish Entire Queue from the status card. ADR 0402 owns this
  bounded shutdown and exact startup-reconciliation lifecycle.
- After Safe Stop And Quit is accepted, replace the confirmation with an
  aggregate Safely Quitting state for the application-wide 30-second maximum.
  Do not expose private work detail, cancellation or a second force-quit
  control during this terminal flow.
- On the next launch, make the normal application interface available while
  Application Status Center marks unresolved startup reconciliation as Needs
  Attention. Route review into the owning visual recovery surface; do not use a
  whole-application blocking modal or expose private recovery detail in the
  status card.
- Do not auto-open or auto-navigate to startup recovery. Persist its aggregate
  attention count in the main interface and Application Status Center, mark
  affected tasks as Recovery Required, and enter review only through the user's
  Review Startup Recovery action.
- Group the recovery workspace into Evidence-Proven Complete, Safely Paused and
  Ambiguous. Keep the first two read-only; acknowledgment clears presentation,
  not outcome evidence. Show only operation-owned safe actions for Ambiguous
  items and never offer generic Mark Successful, Ignore or Force Continue.
- Defer Startup Recovery Review may close the workspace or collapse its expanded
  banner for the current foreground session, but the aggregate count and
  affected-work marks remain. Relevant evidence changes may update them through
  a read-only recheck without reopening UI or generating an OS notification.
- Present long-unavailable dependencies as Waiting For Recovery Evidence with a
  path-free reason rather than failure. Storage Management should show safely
  calculable recovery-evidence and required-staging bytes in a distinct read-
  only interrupted-operation section, never among cache-cleanup selections.
- When fresh proof makes staging safely rebuildable, replace that row's read-
  only treatment with an explicit Release Safely Rebuildable Recovery Staging
  action. Its review must show bytes and the full-reprocessing consequence;
  ambiguous or outcome-bearing staging remains read-only. ADR 0403 owns release
  eligibility, independent item commits and interrupted-release reconciliation.
- For many eligible rows, start with no selection and support multi-select plus
  Select All Currently Eligible. The batch review shows item count, bytes and
  full-reprocessing count; progress and results remain item-scoped, and no
  selection or confirmation is remembered for future cleanup.
- In flight, offer Cancel Remaining Releases rather than Pause/Resume. Stop new
  items, let the current item settle, keep completed releases and mark untouched
  selections Cancelled Before Release without changing their recovery state.
  Never resume the batch after restart.
- For interrupted multi-member removal, show expected, removed and remaining
  counts plus proven bytes. All absent is Released, wholly intact is Release
  Failed, and any mixed/unassessable set requires reconciliation. Offer Complete
  Remaining Release only after fresh item proof; never reconstruct or reuse a
  partial staging set.
- Multiple reconciliation items may share one filterable/sortable view, but do
  not render row selection, multi-select, Select All or Apply To All. Keep
  Complete Remaining Release on each separately reviewed row. A wholly intact
  item returns to ordinary batch eligibility without automatic selection.
- Use one confirmation panel for Complete Remaining Release. Show remaining
  count, proven bytes, loss of resumable staging and required full reprocessing;
  do not request a typed name or password. Confirm triggers fresh validation,
  and drift refreshes the item without mutation or remembered consent.
- On success, show Released After Reconciliation and Safely Paused Without
  Staging. Merge into the original batch result, retain the interruption marker,
  add only proven reclaimed bytes and reduce both relevant attention counts;
  do not render a second history entry, notification or retry attempt.
- On failure, append a path-free Recovery Staging Completion Attempt to the same
  item and show attempt count, latest outcome/member counts/bytes/reason. Offer
  Try Again only after fresh eligibility proof and a new confirmation. Do not
  impose an arbitrary manual limit or expose automatic/batch retry controls.
- In the attempt timeline, keep every state-changing node. Coalesce only a
  consecutive identical no-change run into count plus first/latest time and
  latest typed reason. After resolution, retain the original interruption,
  changes and final outcome for 30 days without paths, filenames or raw errors.
- After that retention expires, remove the visible attempt timeline, reasons
  and statistics. Under ADR 0401, do not render the minimal terminal marker:
  retain it only behind live references or duplicate-release prevention, then
  delete it when both needs end.
- If a live reference finds its marker missing, damaged or contradictory,
  isolate only the item and exact shared conflict scope. Perform read-only
  reconstruction from authoritative task/recovery/current-member evidence;
  repair only a uniquely proven terminal marker, otherwise keep recovery
  attention and forbid release or automatic cleanup.
- Do not resolve reconstruction conflicts through a fixed database/log/file
  priority or latest timestamp. Journals/receipts prove committed intent and
  boundaries, matching current-member identity/generation proves physical
  state, and task state remains a consistency projection. Without one complete,
  contradiction-free conclusion, keep waiting and offer no Mark Successful.
- If the user no longer expects missing evidence to return, offer Retire
  Unverifiable Recovery as an explicit non-automatic decision. It changes no
  files and claims no result; it ends the old task's attention/isolation, marks
  Recovery Retired — Outcome Unknown and keeps a non-rendered anti-replay
  tombstone. Any later same-target write is new and repeats complete preflight.
- Make retirement item-scoped and two-step, with no bulk/apply-to-all path.
  First show scope, unavailable evidence, unknown outcome and irreversible
  consequences; then require a dedicated acknowledgment checkbox and confirm,
  without typed name/password. Recheck evidence at confirm and return to normal
  reconciliation without retirement if evidence or state has changed.
- When retired evidence returns, run one bounded read-only check per evidence
  generation without reviving the old task. Silently settle a uniquely proven
  tombstone; keep still-unknown evidence silent; or create fresh exact attention
  and isolation only for a proven current mixed/partial conflict. Never mutate,
  auto-open UI or send a system notification from this check.
- Review a returned-evidence conflict read-only with only Defer or Create New
  Recovery Plan. The new plan gets a new identity, current generation/member
  scope, complete operation-specific preflight and independent review/consent;
  creation itself mutates nothing. The old tombstone is lineage/anti-replay
  evidence only, and any evidence drift invalidates the draft.
- A returned-evidence plan may safely release only a complete staging set proven
  application-owned, unpublished, outside destructive boundaries, unnecessary
  to determine outcome and rebuildable. Otherwise, when the complete set and
  ownership are known, it may first copy and verify the set in a user-selected
  local folder outside app data while leaving staging unchanged. Original
  release is separately confirmed; any identity/ownership/publication ambiguity
  keeps the plan read-only and never touches source or published files.
- After verified preservation, Keep Staging may settle as Preserved — Staging
  Retained only if staging is app-owned, inert, unable to affect user paths and
  no longer outcome evidence. End conflict attention/isolation and show its
  bytes as Protected Preserved Recovery Staging, never cache or generic cleanup;
  later release requires a new plan. Otherwise retain exact recovery attention
  and isolation despite the successful external copy.
- Batch results separate Released, Proven Already Absent, Cancelled Before
  Release, Staging Release Reconciliation Required, Excluded After Evidence
  Change and Release Failed, plus Complete, Partial, None Released or Cancelled.
  Use Cancelled when no item was Released;
  otherwise use Partial and show the cancelled count.
  Display planned and actually proven reclaimed bytes distinctly; retry is an
  explicit failed-items-only action after fresh validation.
- Cancelled and Cancelled Before Release create no batch-result attention,
  failed-item retry or completion notification. Keep the original tasks'
  recovery attention, and require a new batch for any later release attempt.
- Keep one lightweight batch result for 30 days by default. Complete has no
  activity badge; unresolved items require retry/recovery, explicit Reviewed
  acknowledgment or Dismiss Batch Result. Opening detail alone and every
  history action leave the affected tasks' recovery attention unchanged.
- A user-confirmed long-running release may emit one ordinary aggregate system
  notification only after background completion and only when all represented
  owning-operation preferences permit it. Never notify for startup/read-only
  reconciliation, split a mixed batch or expose item/path detail.

## 5. Layout Principles

- Asset Workspace is home.
- Available intake/activity, settings, diagnostics and focused management
  surfaces belong to the application shell. Future Capture Inbox detail remains
  target scope until wired and validated.
- Every workspace uses stable margins, clear navigation, and no horizontal
  overflow at the desktop minimum viewport.
- Cards belong to repeated assets, dialogs, drawers, and framed tools.
- Avoid cards inside cards. Use bands, panels, or unframed groups for section
  structure.
- Fixed-format controls need stable dimensions: menu button, dock button,
  icon buttons, rail items, status badges, card media, and counters.

## 6. Depth And Elevation

The application frame owns the content plane; a frosted sidebar and toolbar
serve navigation and controls. Inspector stays inside the workspace; review
sheets and Quick Look own temporary modal focus above it. Browser capture is
an ordinary destination, not the base plane of the whole application.

## 7. Motion

Use 160–200ms opacity and small transform transitions for current glass controls
and task sheets. Existing Motion for React integrations remain available for
coordinated interactions; CSS transitions need no new runtime dependency.
Reduced-motion users still receive clear state changes without spatial travel.

## 8. Accessibility And Interaction

- Every icon-only button needs `aria-label` and `title`.
- Critical routes cannot be hover-only.
- Hidden panels should unmount or use `aria-hidden` plus no focusable children.
- Focus order follows visible work: command/menu, workspace controls, content,
  inspector, modal.
- Menu, overlay, inspector, and dock need obvious escape/return behavior.
- No text may overflow its parent button, card, or compact panel.

## 9. Anti-Patterns

- Do not make a landing page.
- Soft background tint and material highlights support the requested glass
  treatment. Production pages must not invent user assets or availability.
- Do not turn every surface into frosted glass.
- Keep success, warning and danger distinct from the blue action accent.
- Do not bury the local library behind only an injected browser control.
- Do not add Remotion as an app UI dependency unless the app gains a real video
  composition surface.
- Do not expose private local paths, keys, cookies, database contents, or full
  binary/base64 payloads in chat, docs, reports, or logs.

## 10. Agent Prompt Guide

When improving UI, optimize in this order:

1. Interaction architecture: can the user find the workspace, return, and
   recover?
2. Information hierarchy: can the user scan state without reading everything?
3. Surface grammar: does each layer have a clear role?
4. Color semantics: are source, asset, AI, success, warning, and danger roles
   visually distinct?
5. Motion: does animation explain origin, destination, and state change?
6. Accessibility: are hidden states, labels, focus, and overflow handled?
7. Polish: spacing, contrast, texture, rhythm, hover/focus, and empty states.

## 2026-09-13 范围更新

内置网页浏览、网站登录、网页采集与外部来源搜索已按用户要求移除。文中对应旧
架构仅作历史背景；本地素材检索/导入、独立下载、AI/工具和恢复保留。
实际范围见[移除报告](docs/product/WEB-COLLECTION-RETIREMENT-20260913.md)。
以软件主体为核心的插件平台见[讨论稿](docs/product/PLUGIN-PLATFORM-DISCUSSION-20260913.md)，
SDK、安装器、第三方运行时和浏览器连接器尚未实施。
