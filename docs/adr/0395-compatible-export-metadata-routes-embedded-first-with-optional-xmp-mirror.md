# Compatible Export Metadata Routes Embedded First With Optional XMP Mirror

Compatible Export defaults to **Embedded-First Compatible Metadata Routing**.
Essential Technical Metadata always remains in the generated media where the
consumer needs it to interpret pixels correctly. Each selected descriptive
field is written only into the media when the exact target capability can
faithfully embed and validate it; otherwise it is routed to an explicitly
enabled ADR 0394 XMP companion when a faithful standard mapping exists. A field
that fits neither destination remains a Compatible Export Metadata Gap. The
default never duplicates a descriptive value across media and sidecar merely
for convenience.

Every destination representation derives from one frozen reviewed semantic
value. The review shows the exact destination, namespace/property, language,
limits and transformations for each field. An encoder may use several
synchronized properties inside one media file only when its capability declares
that interoperable representation as one field mapping and validation proves
the values agree; it cannot use that implementation detail to create an
undeclared media/XMP-sidecar mirror.

An advanced, default-off **Full XMP Metadata Mirror** is available for workflows
that deliberately require a complete sidecar view. It may create an XMP-Backed
Compatible Export Unit even when no metadata gap otherwise requires one. In
this mode, every already selected descriptive field that both the media and XMP
can represent faithfully is written to both destinations from the same frozen
value, while selected fields that only XMP can carry remain XMP-only. The XMP
therefore contains the complete selected compatible descriptive set. "Full"
does not mean all source metadata, all library metadata or all fields known to
the application. If any selected descriptive field lacks an exact XMP mapping,
the output cannot be described as a Full XMP Metadata Mirror; review requires
removing that field, returning to embedded-first routing or changing the recipe.

The mirror option never expands field eligibility. Sensitive Source Metadata
still requires its separate explicit selection and the review discloses every
destination copy. OCR and AI-derived descriptions retain ADR 0393 selection and
provenance requirements. Embeddings, private namespaces/JSON, internal
identities, paths, model state and other prohibited values remain excluded.
ICC profiles, orientation and other interpretation-critical technical evidence
remain authoritative in the media and cannot be replaced by a sidecar copy.

Validation compares the embedded and XMP representations against the same
reviewed semantic values and blocks publication on missing, lossy or divergent
mirrors. ADR 0394 still stages and publishes the complete media/XMP directory as
one commit unit. After publication both files are ordinary user-owned outputs;
the application does not designate either as a continuing authority, monitor
external edits or synchronize later divergence. The explicit mirror therefore
improves sidecar-oriented interoperability at the accepted cost of duplicate
values and possible post-export disagreement.

ADR 0393 continues to govern selected values and privacy, while ADR 0394 governs
XMP eligibility, naming, layout and atomic publication. Original Asset Export,
Original Metadata Writeback, Compound Original companions and Metadata
Portability Export remain separate and unchanged.

The current application has no embedded-first field router or Full XMP Metadata
Mirror option. This ADR records target architecture only and reads, extracts,
serializes, embeds, mirrors, removes, exports, stages, writes, publishes,
attaches, tracks, synchronizes, rewrites, converts, moves, deletes or changes no
runtime/user file, credential, sidecar, directory, database, cache, model,
backup, metadata value, analysis result, source relationship, public IPC,
database schema or AI Worker API.
