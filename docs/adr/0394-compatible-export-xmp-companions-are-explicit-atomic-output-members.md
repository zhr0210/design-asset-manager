# Compatible Export XMP Companions Are Explicit Atomic Output Members

A **Compatible Export Metadata Gap** exists when the selected target media
format cannot faithfully embed a metadata field chosen under ADR 0393. The
affected item cannot confirm or silently discard the field. Asset Export Review
offers three explicit resolutions: remove the unsupported field from that
output, choose another target format/recipe, or enable a **Compatible Export XMP
Companion** when a trusted export capability declares a standard interoperable
XMP mapping, association convention and validator for the exact field and
target. A homogeneous reviewed group may share the same choice, but mixed
formats or capabilities never receive an inferred per-item fallback.

XMP is a fallback only for selected descriptive metadata whose semantics can be
represented through documented interoperable namespaces and properties. It
cannot rescue an output that lacks the color profile, orientation, bit depth,
alpha or other Essential Technical Metadata needed to interpret the media
correctly; that item still requires another format or recipe. A field that also
cannot be represented faithfully in declared XMP remains unsupported rather
than being flattened into a comment, keyword or private property.

Enabling the option creates an **XMP-Backed Compatible Export Unit** containing
every reviewed media output and its required XMP companion as one logical
multi-file result. The capability declares the exact media-to-sidecar
association and filename convention; the review shows the complete tree,
physical file count, bytes and field destination before confirmation. A
same-stem `.xmp` is used only where the capability proves that convention.
Filename resemblance or the presence of source XMP never establishes the
relationship by itself.

The XMP contains only explicitly selected values assigned to it by the reviewed
plan. It never raw-copies an unknown source packet or introduces an application-
private namespace, JSON payload or opaque analysis object. Embeddings/vectors,
internal Design Asset/database/member/storage identities, Collection/source
relationships, absolute paths, recovery state, model paths and private analysis
state remain prohibited. GPS, device serials, face regions and other Sensitive
Source Metadata require their separate ADR 0393 opt-in even when XMP could
represent them. Corrected OCR and an explicitly chosen AI-derived description
remain eligible only through the same explicit field selection and provenance
review already required for Compatible Export metadata.

Because the unit contains more than one physical file, ADR 0384 routes it
through an Export Set Directory and one dedicated asset directory rather than
single-file Save As. The complete media/XMP set stages and validates together.
Validation proves every media file, XMP syntax and declared property mapping,
exact reviewed value, naming/association rule and member inventory. ADR 0387
then publishes the complete staged directory atomically; if any media or XMP
member fails, no partial image-only or sidecar-only result reaches final paths.
Conflict, retry, cancellation, replacement and result reporting operate on the
whole placement rather than on individual members.

ADR 0397 refines only the containing layout for a multi-variant task: each
multi-file variant receives its own atomically published subdirectory inside
the asset directory. The media/XMP membership and all-or-nothing unit boundary
remain unchanged.

The exported XMP is an ordinary user-owned companion output. It is not a
Companion Original Member, Compound Original mutation, Attach Companion action,
Original Metadata Writeback, Source Content Generation, library sidecar,
preview/analysis input, application manifest or maintained synchronization
relationship. After publication the application does not track, update, relink
or reclaim the image/XMP association. Metadata Portability Export remains the
separate route for typed vectors, regions, relationships and full provenance;
it is never generated alongside the XMP unit automatically.

ADR 0393 governs which metadata values may enter Compatible Export and keeps
Original Asset Export byte-exact. ADRs 0340 and 0349 continue to govern actual
Original Asset companions, ADR 0371 governs Metadata Portability Export, and
ADRs 0384–0392 govern the multi-file output lifecycle. ADR 0395 resolves field
placement through embedded-first non-duplicating routing plus an explicit
advanced Full XMP Metadata Mirror.

The current application has no Compatible Export XMP capability, review,
validator or atomic companion publisher. This ADR records target architecture
only and reads, extracts, serializes, embeds, removes, exports, stages, writes,
publishes, attaches, tracks, rewrites, converts, moves, deletes or changes no
runtime/user file, credential, sidecar, directory, database, cache, model,
backup, metadata value, analysis result, source relationship, public IPC,
database schema or AI Worker API.
