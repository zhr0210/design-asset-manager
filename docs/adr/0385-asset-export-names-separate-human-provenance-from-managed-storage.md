# Asset Export Names Separate Human Provenance From Managed Storage

Asset Export resolves every proposed output through a visible, mode-specific
**Asset Export Output Name** before destination-conflict handling. A name is
presentation and interoperability state for the external copy, never Design
Asset Identity, Original Storage Object Identity, Compound Original Identity,
or evidence that two outputs contain the same bytes. ADR 0384's directory-tree
review always shows the final filename and its parent path before any write.

For a single-file Original Asset Export, a Referenced Asset proposes its current
source basename from the validated export snapshot. A Managed Asset instead
proposes the complete received basename retained as provenance. It does not
expose the application-created bucket, Managed Original Storage Name,
`--<short-disambiguator>`, storage identity, database identity, or current
library-internal path merely because those identify the managed physical file.
This difference is explicit in review rather than pretending the managed
storage name is the user's original filename.

The proposed original name keeps its human-readable stem, while its extension
must remain truthful to the currently verified real format. A received or
current extension is preserved, including its ordinary spelling/case, when the
active format capability recognizes it as a valid alias. A missing, misleading,
or invalid extension is replaced with the capability's verified extension and
the review labels that correction. This renames only the external copy; it does
not transcode or rewrite the exact Original Asset bytes. If current capability
evidence cannot establish a truthful extension, the item is unresolved rather
than exported under an invented or merely trusted suffix.

A Compound Original preserves every current member basename and authoritative
relative path exactly. Its dedicated outer asset directory may use the same
referenced-current or managed-received primary stem and normal Export Name
Normalization because that outer directory is not a compound member. Member
names are never independently sanitized, truncated, suffixed, flattened, or
rewritten. If the destination cannot represent the complete exact member
layout, the whole item is blocked unless a future format capability defines and
validates an atomic interoperable layout mapping; ordinary filename cleanup
cannot silently break a primary/companion relationship.

Compatible Export derives a **Compatible Export Name** from the current
user-visible Design Asset title, falling back to the same referenced-current or
managed-received primary readable stem and finally the localized safe `asset`
fallback. A complete single-output rendering uses that stem plus the encoder-
verified target extension. An output representing a page, artboard, frame,
visible composition, format variant, or other selected visual unit adds a
readable structured qualifier containing its unit kind, stable display ordinal
when needed, and available user-visible unit label. Ordinals prevent empty or
duplicate labels from being mistaken for the same output. The exact name plan
shows these qualifiers; it does not expose database identities or treat an
untrusted layer/unit label as a path.

When ADR 0397 selects more than one Compatible Export Variant, every output
also carries a visible normalized qualifier derived from its reviewed unique
variant name. A single-variant task need not add redundant variant text. The
qualifier cannot be replaced by an internal variant identity, preset ID,
encoder/plugin name or hidden directory order.

**Export Name Normalization** preserves safe Unicode and ordinary spaces while
normalizing to NFC, replacing path separators, destination-forbidden/control
characters with `_`, removing forbidden trailing spaces/periods, protecting
reserved or hidden special names, and shortening only at grapheme boundaries
to satisfy the actual destination and disclosed portability budget. An empty
result uses `asset`. The review shows the proposed human name and final
normalized name whenever they differ. Normalization never changes bytes,
silently changes a Compound member, or appends a collision suffix; two names
that become equivalent after case, Unicode, or safety normalization remain a
visible destination conflict for the separately decided collision workflow.

Name derivation is frozen into the confirmed Asset Export Plan and fully
revalidated with the current asset/source generation, capability, recipe,
destination, layout, unit scope and final paths before publication. A later
title/source rename, capability change, external destination change, or stale
plan cannot silently alter already reviewed output names. Users may edit an
ordinary planned output or outer-directory name in review, after which the
same normalization and complete-plan validation apply; exact Compound member
names remain protected.

This ADR extends ADRs 0285, 0288 and 0289 without making their managed-storage
naming policy an export policy. ADR 0386 requires visual resolution of
destination and same-plan name conflicts without silent suffixing or overwrite.
ADR 0389 derives the explicit Keep Both name with a reviewed minimum
parenthesized number while preserving Compound member names. Batch naming
templates/presets remain separate; result retention follows ADR 0392. The current
application has no complete Asset Export name planner or publisher. This ADR
records target architecture only and creates, reads, copies, renders, exports, stages, writes,
rewrites, converts, renames, moves, deletes or changes no runtime/user file,
credential, sidecar, directory, database, cache, backup, metadata value,
analysis result, source relationship, public IPC, database schema or AI Worker
API.
