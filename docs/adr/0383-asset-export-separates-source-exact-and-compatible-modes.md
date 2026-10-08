# Asset Export Separates Source-Exact And Compatible Modes

An **Asset Export Review** selects Design Assets, one user-owned external destination and exactly one semantic **Asset Export Mode** for the complete task. The modes are **Original Asset Export** and Compatible Export; one task never mixes source-exact originals with rendered/converted outputs because their availability, fidelity, naming, validation and failure meanings differ. The review identifies selected, eligible, unavailable, unsupported and excluded items plus estimated logical/physical output bytes before any destination write.

Original Asset Export copies the exact current Original Asset bytes. A single-file original produces that complete file without re-encoding, metadata writeback or extension change. A Compound Original produces every included current member with its declared names and relative layout; primary-only output remains the separately warned action from ADR 0341 and is never the batch default. Managed and Referenced Assets have identical export fidelity, but a referenced source or required compound member must be currently available and revalidated before use.

Original Asset Export is a persistent destination-planned operation, distinct from ordinary drag/Copy File **Original Handoff** under ADR 0405. Both preserve source content, but handoff serves an immediate operating-system/application reuse gesture while export provides reviewed selection, destination, capacity, collision and batch results. Neither may substitute a System Preview, Required Preview, Preview Cache object, rendered thumbnail or prior generation for an unavailable current original.

Compatible Export creates a source-separated user-owned output under an explicit recipe covering target format, dimensions, color gamut/profile behavior, bit depth/quality where supported and page, artboard, frame or other visual-unit scope where applicable. Each mixed-format source resolves the recipe through current trusted format/encoder capability and shows preserved, transformed, flattened, omitted and unsupported professional information before confirmation. An item without a proven compatible route is excluded or remains unresolved; it never falls back to a preview-file copy or falsely reports source-fidelity export.

For ADR 0397 multi-variant Compatible Export, ADR 0412 requires complete
Compatible Export Matrix Resolution through current executable evidence or an
explicit task-local exclusion. Unsupported cells are never dropped silently,
and bulk exclusion or later reinclusion never becomes a remembered rule or
changes a preset.

ADR 0397 permits the Compatible mode to hold an explicit set of named output
variants, each with its own complete recipe and independent eligibility/result.
This does not mix Asset Export Modes: Original Asset Export remains one exact
source result per asset and has no rendered variants.

Both modes operate from one consistent selected library snapshot and revalidate the exact Design Asset, Source Content Generation, complete original/member availability and applicable capability evidence at each execution boundary. They may export mixed source formats, but every item remains independently truthful. Optional AI runtime/model availability has no bearing on source-exact export and is required for compatible output only if an explicitly selected future recipe declares an AI-dependent transformation; no ordinary export silently starts analysis or downloads a dependency.

Every successful output is an ordinary user-owned external file/set. Export never replaces, relinks, rewrites, moves or deletes a current original; changes Asset File Ownership, Source Content Generation, collection/tag state or source relationship; creates another Design Asset/Candidate; adopts its result back into the library; or becomes Full Library Backup. Metadata Portability Export remains an independent explicit operation and is neither embedded nor attached automatically. ADR 0384 defines single-file Save As, contained multi-file Export Set Directories, the shallow default layout and explicit Collection layout projection. ADR 0385 derives human-facing original/compatible names without exposing managed-storage identifiers, ADR 0386 requires explicit visual resolution of occupied and same-plan destination conflicts, ADR 0387 publishes each complete verified asset placement progressively, ADR 0388 stops pause/cancel/retry at safe pre-publication boundaries, and ADR 0392 separates expiring result history from external-file recovery authority.

ADR 0393 defines Compatible Export metadata as another explicit recipe
dimension: Essential Technical Metadata is the default, source descriptive and
privacy-sensitive metadata require stronger choices, and library/AI values are
never embedded implicitly. Original Asset Export remains byte-exact and gains
no metadata controls from that policy.

ADR 0396 allows that compatible recipe intent to be saved as a personal,
library or immutable built-in Compatible Export Preset without saving any
destination, item resolution, capability proof, privacy/destructive authority
or completed review.

The current application has contextual Original Handoff/Compatible Export concepts but no complete Asset Export Review, mode-separated batch plan or verified publisher. This ADR records target architecture only and reads, copies, renders, exports, stages, writes, rewrites, converts, moves, deletes or changes no runtime/user file, credential, sidecar, directory, database, cache, backup, metadata value, analysis result, source relationship, public IPC, database schema or AI Worker API.
