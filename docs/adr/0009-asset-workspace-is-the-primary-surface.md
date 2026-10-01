# Asset Workspace Is the Primary Surface

Updated under ADR 0483 (2026-09-14) and ADR 0486 (2026-09-15).

The approved Gallery & Glass presentation is specified in DESIGN.md and shared by prototype and formal
Renderer adapters. Legacy component availability does not override that presentation contract.

Design Asset Manager is an AI-centered local asset workbench for visual creators.
Asset Workspace is the primary surface for intake, understanding, search,
inspection and safe reuse. Built-in AI+ results support that loop; models and
plugins supply capabilities while the host retains identity, persistence and
permission authority. Missing models leave reliable manual operations available.

Embedded browsing, page collection, site login and external website search are
retired. Local Copy import, Asset Discovery and independent direct-image downloads
remain. Future Chrome/Edge connectors submit reviewed intake through ADR 0106;
they do not restore browser ownership of the app surface.

Eagle remains a reference for dependable asset-management basics. The product's
differentiation is searchable AI understanding and practical optional tools.
The former embedded browser made native web layering compete with app overlays;
its staged-retention rationale is preserved in historical ADR 0010.
