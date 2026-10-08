# Web Capture Entry Evolves in Stages

Status: Superseded by ADR 0483 (2026-09-14). Embedded web collection is retired.

The original staged-retention decision below is historical evidence, not an instruction
to restore the browser. External connectors remain a future direction under ADR 0484.

The Web Capture Entry will evolve in stages. Short term, the Embedded Browser
stays available as a small entry in the Asset Workspace sidebar so existing
Pinterest-oriented capture workflows do not break. It must not regain primary
surface ownership or host app-level menus, docks, inspectors, or workspace
overlays.

Medium term, the capture architecture should move toward the Eagle reference
model: browser extension, local API, and focused capture-window workflows bring
asset candidates into the Asset Workspace, while webpage UI remains responsible
only for discovery and capture handoff. This preserves current capability while
moving product interaction, animation, and organization back under the
React-owned workspace.
