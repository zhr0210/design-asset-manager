# THROWAWAY — Gallery & Glass work-mode prototype

Answers: can designers find/inspect references, build a Work Set, keep multiple sets
visible, and resume them under the Mobbin + Apple-inspired visual direction?

Run `npm run prototype:work-mode` from the repository root. It starts an isolated
loopback Vite preview; it never imports the production App/stores or starts Electron.
The new route directory follows the existing isolated prototype convention and is
excluded from production source-context coverage. Production imports stay unchanged.

Visual source: [mobbin.md](../../../../mobbin.md). The launcher reads its token YAML.
Detailed flows and evidence limits: [handoff](../../../../docs/design/CORE-EXPERIENCE-PROTOTYPE-20260914.md).

Eight original SVG design studies are generated in `fixtures.ts`. `motion-study.mp4`
is an original 5-second synthetic wave/typography study generated from an SVG and a
slow ffmpeg zoom; no real screen recording or external asset download took place.
AI descriptions, prompts and palette proportions are preset examples, not inference.

Most UI state is in memory. Explicit Save writes only synthetic set/layout/note/frame-time
and appearance preferences under `dam-work-mode-prototype-v1` in this preview origin's
localStorage. Reset removes that key; a different port has a different origin. Video
selection in the Inspector is temporary; frame times in a Work Window are saved with its set.

Multiple panels and the Copy receiver simulate browser interactions. They are not OS
always-on-top windows or native file transfer. Saved layouts do not grant library authority.
The sample has no real files to delete and removal only changes set membership.

Check a running preview with `node scripts/check-work-mode-prototype.mjs`.
`DAM_PROTOTYPE_URL` selects another preview URL. Checks use a separate Playwright context,
block external requests and emit screenshots/report in a temporary evidence directory.

## Organization / AI folders / palettes refinement

The current sidebar prioritizes organization views, analyzed-tag AI folders, a folder
tree and creation references. AI folders require explicit synthetic analysis eligibility,
not just matching a caption; they filter existing IDs without copying assets. Suggested
and confirmed tags remain distinct. The tag page currently exposes evidence/filtering,
not global editing; the community/cloud platform remains deferred.

Palette color left click copies HEX; context menu or Shift+F10 offers copy, collection
into existing/new Palette Folders, and addition to a selected Work Window. Window colors
precede work notes and save with the set. Shared palette folders save separately under
`dam-palette-prototype-v1`; duplicate colors in one folder are ignored. Reset removes
both prototype keys. Storage failure keeps in-memory edits and exposes a retry path.

Focused reference images open a preview with Space; closing returns focus. Text inputs
and video controls keep their normal key behavior. The Inspector palette now follows
the preview directly; its redundant asset-title heading is removed.

`node scripts/check-palette-prototype.mjs` checks this refinement using synthetic data;
clipboard intent is captured by an isolated test adapter, not an OS clipboard certification.

## Current minimal canvas revision

Current layout supersedes the wide organization sidebar: All, Folders, Work Mode, Trash
icon rail with a shared bottom search/tag control and vertical density slider. Folders
include ordinary/AI collections and palettes; Work Mode owns Work Set browsing. Twelve
synthetic entries demonstrate images, video, text, system-font specimens and a document
cover (not font installation or arbitrary PDF decoding); one begins in synthetic Trash.

Run `node scripts/check-minimal-prototype.mjs` for current checks. Prior check entrypoints
redirect to this suite because the old sidebar selectors no longer describe the UI.
The current design/research note is [MINIMAL-CANVAS-20260914.md](../../../../docs/design/MINIMAL-CANVAS-20260914.md).
Public mymind video downloads and contact sheets are research-only outside the app;
the running preview still has no external media dependency.

## Light glass / clean preview refinement

Default preview hides the top and bottom developer strips. The left-bottom settings
button can restore them with “显示预览说明条”. The manual solid-material feature is
removed; legacy saved solid flags are ignored. OS accessibility/unsupported-blur
fallbacks remain automatic. Navigation and selected tags are neutral gray, image
tags are clickable glass capsules, and scrollbars are hidden without disabling scrolling.
The vertical density slider is compact with a value shown only during interaction.
See [review mapping](../../../../docs/design/GLASS-POLISH-20260914.md).

## Anchored sidebar and Focus Mode

Single-click opens a layout-reserving detail rail. AnchoredGrid keeps the selected
viewport position when it fits, otherwise clamps horizontally to avoid the rail.
Other items preserve array order and animate their layout change with a short blur.
Space/double-click opens FocusMode with media, shared details and an ordered filmstrip.
Filtered results/Work Set membership define that filmstrip; arrows and thumbnails
navigate, editable fields retain their keys, and Escape restores trigger focus.
This replaces the former simple focus dialog. Reduced motion skips transitions.

Run `node scripts/check-inspector-focus-prototype.mjs` for position/scope/transition
checks. [Design and limits](../../../../docs/design/INSPECTOR-FOCUS-20260914.md).

## Current adaptive layout and visual notes

The latest request replaces fixed-width anchored packing and blur transitions. On
sidebar open, preserve column count where possible and shrink card widths to fill
the available width; animate only translation/scale. Focus image changes are hard cuts.
FocusCanvas provides keyboard/wheel zoom, drag pan and independent per-image note pages.
Pen, rectangle, ellipse, text, sticky markers and per-page undo/redo operate in a
normalized annotation overlay, never on source image bytes. Space temporarily pans
while the canvas is focused; Escape closes an editor/popup before closing focus.

Explicit Save writes `dam-focus-notes-prototype-v1` in this preview origin. Committed
unsaved edits survive closing/reopening focus within the same loaded page, but require
Save to survive reload. Pending text/sticky editors block image switching/close/save
until applied or cancelled. Undo/redo is an editing-session operation, not persisted history.
Video still uses its existing reference-frame controls; drawing notes currently apply
to static preview images. No file export or production note schema is delivered here.
Run `node scripts/check-focus-notes-prototype.mjs`; the previous inspector/focus check
entrypoint delegates to this revised suite.
