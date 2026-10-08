# Compatible Export Metadata Defaults To Technical Minimum And Explicit Fields

Original Asset Export always preserves the exact current Original Asset bytes,
including every existing embedded metadata block and declared Compound Original
member. It offers no metadata removal, addition or rewrite control. A user who
needs a clean, normalized or differently described file uses Compatible Export,
which writes metadata only into its newly generated user-owned output and never
changes the original, library metadata or source relationship.

Every Compatible Export task selects one **Compatible Export Metadata Policy**.
The default is **Essential Technical Metadata**: only the truthful information
needed to interpret the generated output correctly. Where the target supports
it, this includes an embedded ICC profile matching the selected output color
intent, physically applied and normalized orientation, actual pixel dimensions,
bit depth and alpha behavior, and format-required technical fields. Resolution
or DPI is preserved or transformed only when the source or explicit recipe has
a meaningful value; the exporter never invents one. If a requested P3, sRGB or
other color intent cannot be represented and tagged faithfully by the target,
the item remains unresolved or unsupported until the user changes the recipe;
it is never emitted as an untagged or silently downgraded result.

Essential Technical Metadata does not copy GPS, device or camera serial
identifiers, face regions, editor history, embedded source thumbnails or other
privacy-sensitive payloads. It also does not add title, caption, creator,
copyright, keywords, rating or application analysis merely because those values
exist. Review shows which technical values are preserved, normalized,
transformed, removed or unsupported for every asset and target format.

Two explicit alternatives are available. **Preserve Compatible Source
Metadata** additionally maps only source fields whose meaning, value and target
serialization are capability-supported and validates the resulting output; it
does not raw-copy incompatible metadata blocks. Privacy-sensitive fields remain
a separate, visibly listed opt-in and are never hidden behind a generic
"preserve all" choice. **Custom Compatible Export Metadata** lets the user
select supported field categories and exact values, including title, caption or
description, creator, copyright, confirmed keyword/tag labels and rating.
Conflicting or unrepresentable values remain visible rather than being silently
merged, truncated, translated, substituted or dropped.

Application tags, user-authored descriptions/captions and corrected OCR enter a
compatible output only when explicitly selected. A generated description needs
its own explicit selection and review shows that it is AI-derived; model paths,
internal inference state and other private provenance are not embedded.
Embeddings/vectors are never written into image files. Absolute source or local
paths, Design Asset/database/member/storage identifiers, recovery state,
Collection relationships, model locations and internal analysis state are
always excluded. Full-fidelity transfer of selected structured analysis and
provenance remains Metadata Portability Export rather than Compatible Export
metadata.

The policy resolves separately for each selected asset, visual unit and actual
target capability while remaining one task-wide semantic choice. The final
review reports each field category as preserved, transformed, removed,
unsupported or explicitly included, and output validation checks the resulting
metadata as part of the Compatible Export commit unit. Unsupported selected
metadata never causes an invisible sidecar or private manifest to appear;
ADR 0394 permits a standard XMP companion only through a separately explicit
resolution for an eligible metadata gap and makes the resulting media/XMP set
one complete multi-file export unit.

ADR 0357's conversion separation and ADR 0358's Original Metadata Writeback
allowlist continue to govern mutations of current originals; selecting export
metadata grants no writeback authority. ADR 0371 Metadata Portability Export
continues to carry richer library-only metadata without becoming an image
export. ADR 0383 governs the remaining Compatible Export recipe, availability
and source-separation contract, while ADRs 0384–0392 govern output layout,
naming, conflicts, publication, control, scheduling, directory ownership and
activity/recovery. ADR 0394 governs explicit XMP companion output.
ADR 0395 governs embedded-versus-XMP field routing and optional mirroring.

The current application has no Compatible Export metadata-policy review or
output-metadata validator. This ADR records target architecture only and reads,
extracts, serializes, embeds, removes, exports, stages, writes, rewrites,
converts, moves, deletes or changes no runtime/user file, credential, sidecar,
directory, database, cache, model, backup, metadata value, analysis result,
source relationship, public IPC, database schema or AI Worker API.
