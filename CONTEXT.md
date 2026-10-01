# Design Asset Manager Context

This is a reference glossary, not startup context or a statement of delivered
features. Search the exact term needed for the current task; verify behavior
in code and tests. Domain reading guidance: [domain.md](docs/agents/domain.md).

Design Asset Manager manages local image and design reference assets as a searchable, taggable, AI-assisted desktop library. This context defines the product language used across the asset library, capture, tagging, AI, runtime, and governance areas.

## Language

### Asset Library

**Ordinary Folder**:
A named library grouping whose direct members reference existing Design Assets and whose children are other ordinary folders.
_Avoid_: Source directory, physical move, duplicated asset, AI folder

**Palette Folder**:
A named library collection of distinct color codes, optionally associated with the assets from which they were collected.
_Avoid_: Image color proportions, duplicate image, automatic analysis result


**Asset Notebook**:
A collection of user-authored annotation pages associated with one Design Asset and its reference view, independent of the Original.
_Avoid_: Image overwrite, AI description, global notebook

**Note Page**:
One named annotation layer within an Asset Notebook, containing drawing marks, text and sticky references.
_Avoid_: Duplicate asset, edited original


**Design Asset**:
An image or design reference saved in the local library for later browsing, tagging, inspection, analysis, or reuse.
_Avoid_: File, picture, image item, material

**Delete Design Asset**:
A user action that removes a confirmed Design Asset from active library surfaces through Asset Trash without implying deletion of a Referenced Asset's user-owned source file.
_Avoid_: Reject candidate, hard delete candidate, delete referenced source file

**Remove Referenced Asset from Library**:
The default Delete Design Asset action for a Referenced Asset, preserving its user-owned source file while moving only the Design Asset into Asset Trash.
_Avoid_: Delete source file, forget source, Permanent Asset Delete

**Delete Referenced Source File**:
A separately confirmed, item-committed Referenced Source Operation that requests moving a user-owned referenced original to operating-system trash and moves its Design Asset into Asset Trash only after that source operation succeeds.
_Avoid_: Remove from library, Permanent Asset Delete, immediate unlink

**Delete Referenced Compound Source**:
A separately confirmed group-level Referenced Source Operation that requests moving every current member of one Referenced Compound Original to operating-system trash and moves its Design Asset into Asset Trash only after the complete member set succeeds.
_Avoid_: Delete primary file, remove from library, delete containing folder

**Referenced Compound Source Delete Plan**:
A destructive review binding every current Referenced Compound Member Relationship to one disclosed operating-system trash request before any member is changed.
_Avoid_: File checklist, parent-folder delete, remembered batch choice

**Referenced Compound Source Delete Recovery**:
The group-scoped state entered after any compound-member trash request begins when complete source deletion and the Asset Trash transition are not both proven committed.
_Avoid_: Successful group deletion, automatic rollback, independent missing-member recovery

**Referenced Compound Source Trash Receipt Set**:
Group restoration evidence binding one compound source deletion to the portable deletion state and device-local trash handle, when available, for each successfully trashed member.
_Avoid_: Source backup, system-trash index, single synthetic folder receipt

**Referenced Compound Source Delete Undo**:
A short-lived whole-group affordance that requests the normal receipt-scoped restoration of a successfully deleted Referenced Compound Original without promising filesystem rollback.
_Avoid_: Restore one member, automatic rollback, recreate from preview

**Restore Referenced Source File**:
An explicit, receipt-scoped Referenced Source Operation that may use operating-system trash capabilities to return an exact app-trashed original as part of restoring its Design Asset.
_Avoid_: Relink arbitrary file, restore metadata only, empty system trash

**Referenced Source Delete Undo**:
A short-lived post-delete affordance that requests the normal Restore Referenced Source File operation for only the source deletions that actually succeeded.
_Avoid_: Filesystem rollback, restore guarantee, second recovery path

**Referenced Source Trash Receipt**:
Two-part restoration evidence linking one app-performed source deletion to portable deletion state and one device-local trash handle without making that handle portable.
_Avoid_: System trash index, source backup, filename match, restore guarantee

**Portable Referenced Source Deletion State**:
Authoritative library state preserving that a referenced source was deliberately deleted, its Design Asset relationship and content identity, without a platform trash location or restore capability.
_Avoid_: Device trash handle, missing-file guess, external source backup

**Device Trash Restore Handle**:
Minimal platform-specific device-local evidence that may identify and restore one exact app-trashed source item without entering portable library state, backup, or offline catalogs.
_Avoid_: Portable receipt, source path history, system trash index

**Dormant Trash Restore Handle**:
A retained device-local trash restore handle made inactive after its Library Registration is forgotten and eligible again only after reconnecting the same verified Local Library Instance.
_Avoid_: Active registration, portable backup, orphaned source file

**Clear Local Restore Handles**:
An explicit device-local privacy action that removes selected trash restore handles without changing portable deletion state or operating-system trash contents.
_Avoid_: Empty system trash, Permanent Asset Delete, cache cleanup

**Keep Local Restore Handles**:
The explicit choice that retains eligible device-local trash restore handles as dormant recovery state for later verified library reconnection without keeping a Library Registration active.
_Avoid_: Portable backup, keep source file, active registration

**Uninstall Preparation**:
An optional in-app review of device-local recovery state before an app-managed uninstall, distinct from external application removal that the product cannot intercept.
_Avoid_: Operating-system uninstall guarantee, settings reset, application removal event

**Dormant Batch Text Recovery**:
A protected Batch Text Undo Journal retained after its Library Registration is
forgotten and inactive until the same verified Local Library Instance returns.
_Avoid_: Portable Undo, active Batch Text Edit, Local File Recovery

**Cancel Uninstall And Review Batch Text Recovery**:
The recommended Uninstall Preparation choice that preserves Batch Text recovery
and returns the user to its owning review.
_Avoid_: Cancel batch, keep library registered, export Undo

**Proceed And Lose Batch Text Recovery**:
An explicit Uninstall Preparation choice that accepts loss of represented local
Batch Text Undo while leaving unfinished library operations Paused.
_Avoid_: Cancel Remaining, export recovery, clear committed Text

**Local File Recovery**:
A device-local utility surface containing only application-created recovery records for displaced external files and remaining usable without an active or registered library.
_Avoid_: Asset Trash, system trash browser, Offline Library Catalog

**Referenced Source Restore Conflict**:
A collision where the original destination for receipt-scoped source restoration is occupied, requiring exact-content reconnection, a user-selected alternate destination, or an explicit replacement decision without overwrite or automatic renaming.
_Avoid_: Generic Restore as Copy, automatic overwrite, silent suffix

**Asset Trash**:
The recoverable deletion area for confirmed Design Assets after Delete Design Asset.
_Avoid_: Capture Cleanup History, Capture Inbox, candidate cleanup

**Library Utility Entry**:
A Workspace Navigation entry for library maintenance surfaces that are not Asset Collections or Smart Filters.
_Avoid_: Asset collection, workspace entry, settings item

**Trash Count**:
The count of deleted Design Assets currently represented by Asset Trash.
_Avoid_: Error badge, review signal count, collection count

**Trash Surface**:
The dedicated workspace surface for browsing, restoring, and permanently deleting Design Assets in Asset Trash.
_Avoid_: Asset Grid, Capture Cleanup History, settings page

**Trash Visibility**:
The product rule for where deleted Design Assets and Deleted Asset Records appear across active library, search, filter, trash, and history surfaces.
_Avoid_: Hidden asset, global visibility, normal grid state

**Deleted Asset Placeholder**:
A lightweight history or trace state showing that a linked Design Asset has been deleted.
_Avoid_: Active asset card, missing file error, broken link

**Include Deleted**:
An explicit search or filter mode that includes deleted Design Assets from Asset Trash.
_Avoid_: Show hidden, include candidates, trash view

**Asset Restore**:
A user action that returns a deleted Design Asset from Asset Trash to active library surfaces.
_Avoid_: Candidate restore, undo promote, re-import

**Restore Conflict**:
A risk detected during Asset Restore where the deleted asset's target, filename, content, or linked state conflicts with current library state.
_Avoid_: Duplicate signal, restore error, candidate review

**Restore Conflict Sheet**:
A confirmation surface for choosing how to handle a Restore Conflict before Asset Restore completes.
_Avoid_: Promotion sheet, delete confirmation, error dialog

**Restore as Copy**:
A restore choice that returns a deleted Design Asset without overwriting or merging with an existing Design Asset.
_Avoid_: Merge restore, overwrite restore, duplicate cleanup

**Asset Trash Retention Policy**:
The user-configurable rule that controls whether and when deleted Design Assets are permanently removed from Asset Trash.
_Avoid_: Candidate retention policy, capture cleanup, automatic candidate expiry

**Permanent Asset Delete**:
The irreversible removal of a deleted Design Asset from Asset Trash.
_Avoid_: Hard delete candidate, reject candidate, hide asset

**Deleted Asset Record**:
The minimal library history record left after a Design Asset is deleted.
_Avoid_: Promoted candidate record, active candidate, rejected candidate

**Asset Library**:
The user-facing collection of design assets and their metadata.
_Avoid_: Folder, database, gallery

**Registered Library**:
A Local Library Instance explicitly enrolled on the current device for availability checks, reopening, and Cross-Library Search without making it the active writable library.
_Avoid_: Automatically discovered folder, active library, library backup

**Library Registration**:
The device-local record that binds a verified Portable Library Lineage Identity and Local Library Instance Identity to one user-selected location for reopening, availability, and device preferences without taking ownership of the library.
_Avoid_: Portable library identity, automatic disk discovery, active library lock

**Reconnect Registered Library**:
The explicit action that updates a missing Library Registration location only after Library Open Inspection proves the selected root is the same Local Library Instance.
_Avoid_: Edit library path, material library migration, merge libraries

**Forget Library Registration**:
The non-destructive removal of one device's Library Registration and registration-owned offline projections without modifying the library or its assets; library-bound restore handles and registration-independent Local File Recovery remain distinct.
_Avoid_: Delete library, delete assets, unmount drive

**Library Root**:
The user-selected top-level directory that identifies one portable library and contains its Library Control Directory and Managed Originals Directory without implying ownership of every other file beneath it.
_Avoid_: App root, managed root, download root, source ownership boundary

**Library Control Directory**:
The reserved hidden application-owned subtree inside a Library Root that holds authoritative library state and Required Preview Storage while remaining separate from Original Asset Storage and excluded from source discovery.
_Avoid_: Managed originals directory, referenced source folder, generic cache folder

**Managed Originals Directory**:
The reserved user-visible library-owned subtree inside a Library Root that holds activated Candidate Artifacts and Managed Asset originals as ordinary files while remaining independent from Collections and referenced-source discovery.
_Avoid_: Library control directory, collection folder, referenced source, cache folder

**Managed Originals Directory Binding**:
The authoritative Library Manifest relationship assigning exactly one safe root-relative directory to Original Asset Storage without claiming arbitrary pre-existing files at that location.
_Avoid_: Absolute folder setting, implicit folder adoption, source scan, localized path name

**Managed Originals Storage Bucket**:
An application-managed shallow directory beneath Managed Originals Directory that bounds per-directory entry count without becoming user organization, source hierarchy, or object identity.
_Avoid_: Collection folder, Source Tree node, flat originals root, portable identity

**Compound Original Directory**:
A user-visible application-allocated directory inside one Managed Originals Storage Bucket that contains exactly one Compound Original's ordinary members while authoritative membership remains in library state.
_Avoid_: Collection folder, source folder, app-manifest folder, arbitrary adjacent files

**Sealed Managed Originals Storage Bucket**:
A registered storage bucket that accepts no new managed-original allocation after reaching its cumulative allocation limit or losing safe allocation eligibility, even if files are later removed.
_Avoid_: Read-only folder, archived collection, reusable free space, deleted bucket

**Original Storage Object Identity**:
A stable library-scoped identity for one library-owned ordinary original member file, retained across Candidate Promotion and independent of filename, path, content digest, and Design Asset Identity.
_Avoid_: Candidate Identity, filename suffix, content hash, filesystem file identifier

**Compound Original Identity**:
A stable library-scoped identity for one primary original and its capability-declared companion members under a single asset ownership and lifecycle boundary.
_Avoid_: Candidate Identity, Design Asset Identity, folder path, shared content hash

**Managed Original Storage Name**:
The cross-platform-safe ordinary filename allocated to a single-file library-owned original from a readable source-derived stem plus a stable short disambiguator, without becoming its identity; compound members instead retain their capability-required relative layout inside one disambiguated Compound Original Directory.
_Avoid_: Original source filename, Design Asset title, content-addressed name, filename identity

**Managed Original Readable Stem**:
The Unicode-preserving, cross-platform-safe human-readable portion of a Managed Original Storage Name or Compound Original Directory name, derived from but distinct from the complete received filename retained as provenance.
_Avoid_: Transliteration, slug, Design Asset title, exact received filename

**Validated Storage Extension**:
The lowercase extension in a Managed Original Storage Name selected from verified real-format capability evidence, preserving a received alias only when that capability declares it valid for the detected format.
_Avoid_: Trusted source extension, producer MIME, generic `.raw`, transcoded format

**Managed Original Path Headroom**:
The remaining portable and target-filesystem path-length capacity for a library-owned final path after its Library Root, managed-directory binding, storage bucket, any Compound Original Directory, disambiguator, member layout, and extension are accounted for.
_Avoid_: Free storage space, filename-component limit, long-path support

**Managed Original Short Disambiguator**:
The stable opaque suffix appended to a Managed Original Storage Name or Compound Original Directory name to prevent physical collisions without serving as authoritative storage or group identity.
_Avoid_: Original Storage Object Identity, content digest, counter suffix, source fingerprint

**Managed Original Recovery**:
An item-scoped state entered when a library-owned Original Asset is absent, outside its bound directory, invalid, or cannot be uniquely reconciled after an external filesystem change, preserving its Design Asset without guessing a path or implying deletion.
_Avoid_: Asset deletion, automatic referenced-asset conversion, preview fallback, path guess

**Compound Original Recovery**:
A group-scoped Managed Original Recovery state entered when a Compound Original's primary, required companion, identity, or declared relationship is unavailable or invalid, preserving its Design Asset and last verified generation without treating surviving members as separate originals.
_Avoid_: Missing sidecar warning, partial asset deletion, primary-only fallback, independent member recovery

**Compound Member Repair**:
A Compound Original recovery path that restores one missing member into its proven vacant declared location while retaining the current Compound Original Directory and validating the complete group before availability returns.
_Avoid_: In-place overwrite, independent-member asset, complete directory rebuild

**Compound Directory Rebuild**:
A Compound Original recovery path that publishes a fully validated new Compound Original Directory and switches the same group identity to it when member-only repair is unsafe or insufficient.
_Avoid_: In-place directory merge, new Design Asset, automatic overwrite

**Superseded Compound Directory Residue**:
A non-authoritative former Compound Original Directory retained after a successful Compound Directory Rebuild until its known old members can be explicitly and safely cleaned without touching unknown entries.
_Avoid_: Current original, backup version, second asset, generic cache

**Recover as Managed Original**:
The default Managed Original Recovery action that copies and verifies selected or backup-provided bytes into bound Original Asset Storage while leaving any external source untouched.
_Avoid_: Move original, relink, backup merge, import duplicate

**Asset Ownership Conversion**:
An explicit complete-Original-Asset transition between user-owned referenced sources and library-owned managed storage that preserves one Design Asset and preserves Source Content Generation only for an exact byte/member match.
_Avoid_: Reimport, duplicate asset, source-format conversion, partial-member conversion

**Convert to Referenced Asset**:
An explicit Asset File Ownership transition that preserves one Design Asset while replacing its complete library-owned Original Asset storage relationship with byte-verified user-owned source relationships.
_Avoid_: Automatic relink, Compatible Export, silent ownership change

**Convert to Managed Asset**:
An explicit Asset File Ownership transition that preserves one Design Asset while replacing its complete user-owned source relationships with a byte-verified library-owned Original Asset.
_Avoid_: Copy Into Library as another asset, move source, silent ownership change

**Retained Ownership Conversion Source**:
A user-owned former referenced source kept unchanged after Convert to Managed Asset and excluded from automatic readmission in the same library without remaining part of the current Original Asset.
_Avoid_: Managed original, duplicate Design Asset, current referenced source

**Keep And Exclude**:
The default retained-source disposition that leaves exact former referenced bytes user-owned while suppressing their byte-identical automatic readmission in the same library.
_Avoid_: Hide changed content, automatic cleanup, current source relationship

**Release Retained Source Exclusion**:
An explicit action that leaves a retained external file untouched while ending its same-library duplicate-readmission exclusion and application cleanup authority.
_Avoid_: Delete retained source, reattach source, undo ownership conversion

**Clean Up Retained Conversion Sources**:
An explicit complete-set action that revalidates the current managed original and each unchanged former referenced source before requesting operating-system trash for those former sources.
_Avoid_: Automatic cleanup, primary-only delete, managed-original delete

**Retained Conversion Source Cleanup Receipt Set**:
Device-local recovery evidence grouping the exact system-trash result for every former referenced member successfully cleaned after ownership conversion.
_Avoid_: Source backup, Asset Trash, ownership-conversion undo

**Recover Cleaned Retained Conversion Sources**:
An explicit receipt-scoped action that restores exact cleaned former sources to safe selected external locations without changing the current Managed Asset.
_Avoid_: Undo ownership conversion, reattach source, restore Design Asset

**Retained Conversion Source Cleanup Recovery**:
A complete-set attention state for partial, failed or ambiguous retained-source cleanup that preserves every proven member outcome without changing the current Managed Asset.
_Avoid_: Managed Original Recovery, automatic retry, partial cleanup success

**Managed Ownership Conversion Residue**:
A non-authoritative former library-owned Original Asset retained without automatic expiry after Convert to Referenced Asset until its exact complete files receive explicit safe cleanup or recovery resolution.
_Avoid_: Current managed original, backup generation, generic cache

**Clean Up Managed Ownership Conversion Residue**:
An explicit complete-set Storage Management action that revalidates a healthy current Referenced Asset and every exact former managed member before requesting operating-system trash for the residue.
_Avoid_: Cache cleanup, timed expiry, ownership-conversion commit cleanup

**Managed Conversion Residue Cleanup State**:
Portable library evidence that an exact former managed Original Asset was explicitly cleaned without retaining device-specific system-trash authority or changing the current Referenced Asset.
_Avoid_: Device trash handle, current source relationship, Full Library Backup of source bytes

**Managed Residue Trash Restore Handle**:
Minimal device-local platform evidence that may verify and restore one exact app-trashed managed conversion residue member without entering portable library state.
_Avoid_: Portable cleanup state, residue backup, system trash index

**Managed Conversion Residue Cleanup Receipt Set**:
Complete-group recovery evidence combining portable residue-cleanup state with the currently available device-local restore handle for each successfully trashed member.
_Avoid_: Ownership-conversion undo, current managed original, revision history

**Recover Cleaned Managed Conversion Residue**:
An explicit complete-set action that restores exact cleaned members only as non-authoritative library-owned residue without changing the current Referenced Asset.
_Avoid_: Convert to Managed Asset, relink referenced source, restore current generation

**Managed Conversion Residue Cleanup Recovery**:
A complete-set attention state for partial, failed or ambiguous residue cleanup or restoration that preserves every proven member outcome without changing current asset ownership.
_Avoid_: Automatic retry, partial residue activation, dual asset ownership

**Residue-to-Managed Recovery**:
An explicit complete-Original-Asset recovery that selects one verified Managed Ownership Conversion Residue to replace an unavailable referenced relationship with current library-owned storage.
_Avoid_: Automatic fallback, reimport, partial-member recovery

**Recover as Managed Asset from Residue**:
The exact-generation Residue-to-Managed Recovery outcome that makes a complete matching residue current while preserving the existing Source Content Generation.
_Avoid_: Use earlier content, new Design Asset, automatic ownership change

**Use Earlier Residue as Managed Replacement**:
An explicitly confirmed Residue-to-Managed Recovery outcome that makes a verified prior residue current as replacement content and creates a new Source Content Generation.
_Avoid_: Reactivate historical generation, ownership conversion, silent rollback

**Residue-to-Managed Commit Recovery**:
An item-scoped complete-set attention state where residue promotion cannot yet prove one committed managed ownership and generation outcome.
_Avoid_: Simultaneous referenced and managed ownership, automatic retry, partial compound activation

**Asset Ownership Conversion Batch**:
A reviewed one-direction coordinator that applies Convert to Managed Asset or Convert to Referenced Asset to selected Design Assets while every complete Original Asset commits independently.
_Avoid_: Mixed-direction batch, cross-asset transaction, batch source cleanup

**Asset Ownership Conversion Batch Item**:
One Design Asset, its exact current Source Content Generation and its complete single-file or Compound Original conversion plan inside an Asset Ownership Conversion Batch.
_Avoid_: Compound member row, destination-only task, shared batch commit

**Asset Ownership Conversion Batch Result**:
A truthful per-asset grouping of converted, excluded, stale, failed, recovery and cancelled outcomes without representing the batch as atomic success or failure.
_Avoid_: Whole-batch rollback, aggregate-only error, hidden partial success

**Retry Failed Asset Ownership Conversions**:
An explicit fresh-plan action for eligible failed or stale batch items that never reruns converted or recovery-bound items.
_Avoid_: Replay batch, automatic retry, retry ambiguous commit

**Managed-to-Referenced Destination Plan**:
A reviewed mapping from each selected Managed Asset's complete Original Asset to one explicit user-owned final path, normally proposed beneath one batch-selected destination root.
_Avoid_: Folder adoption, Collection hierarchy export, internal bucket mirror

**Reference Destination Readable Name**:
A user-visible path-safe default name for a referenced conversion result derived from human-readable asset or filename provenance without exposing managed bucket labels or internal storage disambiguators.
_Avoid_: Managed Original Storage Name copy, Design Asset identity, automatic folder taxonomy

**Managed-to-Referenced Destination Conflict Review**:
A visual per-item review of a planned referenced-conversion path that is occupied or collides with another planned output before any occupant or current ownership changes.
_Avoid_: Silent suffix, automatic replacement, batch failure

**Use Existing Identical Conversion Destination**:
An explicit conflict outcome that adopts a fully verified byte/member-identical existing destination as the new referenced Original Asset without publishing a duplicate copy.
_Avoid_: Filename match, shared current source, unverified folder merge

**Publish Referenced Conversion With Unique Name**:
A non-destructive destination-conflict outcome that binds one conversion item to a reviewed safe vacant final path without changing its Design Asset or content generation.
_Avoid_: Silent suffix, automatic retry, duplicate Design Asset

**Apply Unique Names To Current Conversion Conflicts**:
A plan-time convenience that assigns and displays one explicit safe unique path for each currently shown conversion conflict without becoming a rule for later collisions.
_Avoid_: Apply replacement to all, remembered suffix policy, future auto-resolution

**Replace Referenced Conversion Destination**:
An explicit per-item conflict outcome that moves one proven replaceable destination occupant to operating-system trash before publishing verified conversion staging.
_Avoid_: Overwrite, Apply to All, permanent delete

**Conversion Destination Replacement Receipt**:
Device-local recovery evidence for the exact external occupant displaced by a successful Replace Referenced Conversion Destination action.
_Avoid_: Managed residue, source backup, ownership-conversion undo

**Conversion Destination Replacement Recovery**:
An item-scoped state entered when a conversion destination occupant was proven trashed but verified target publication or ownership commit has not reached one safe proven outcome.
_Avoid_: Automatic retry, batch rollback, ambiguous replacement success

**Conversion Metadata Separation**:
The ownership-conversion rule that preserves library metadata on the same Design Asset while keeping every destination original member byte-exact and creating no metadata sidecar or embedded write.
_Avoid_: Metadata export, XMP generation, source rewrite

**Original Metadata Writeback**:
A separately invoked capability-controlled source operation that serializes explicitly selected library metadata into supported embedded fields or a declared companion and follows content-generation rules.
_Avoid_: Ownership conversion, background synchronization, automatic AI export

**Writeback-Eligible Metadata Value**:
A user-authored or explicitly user-confirmed value whose exact interoperable field mapping, language and serialized value are supported and selected for one Original Metadata Writeback.
_Avoid_: Raw AI suggestion, internal identifier, inferred field mapping

**Original Metadata Writeback Review**:
A source-bound review showing every selected library value, exact destination field and serialized value, existing target value, unsupported or lossy consequence and resulting source-generation effect before writing.
_Avoid_: Metadata editor save, background sync, format preset

**Library-Only Metadata Field**:
An application-owned value such as OCR, embeddings, model provenance, Collection Membership or an internal identity that has no approved interoperable original-file writeback mapping.
_Avoid_: Missing file metadata, unsupported writeback error, hidden custom namespace

**Metadata Portability Export**:
An explicit user-owned JSON, CSV or versioned metadata-package output carrying selected library metadata and provenance without modifying, attaching to or relinking an Original Asset.
_Avoid_: Original Metadata Writeback, Full Library Backup, automatic sidecar attachment

**Metadata Portability Export Review**:
A review of the selected assets, fields, provenance, representation gaps and destination consequences before one portability export is published.
_Avoid_: Writeback review, backup configuration, metadata import mapping

**Metadata Portability Package**:
The versioned full-fidelity metadata export representation containing structured records and schema-declared typed payloads for selected complex evidence, never originals or formal preview objects, and optionally bounded visual-review thumbnails.
_Avoid_: Full Library Backup, sidecar bundle, opaque database copy

**DAM Metadata Package**:
The open ZIP64-compatible `.dammeta` single-file container that physically carries one Metadata Portability Package.
_Avoid_: Private archive, Full Library Backup, application database

**Metadata Package Manifest**:
The required versioned JSON inventory declaring a DAM Metadata Package's schemas, records, blobs, counts, lengths, types and integrity evidence.
_Avoid_: Database schema dump, backup manifest, source path index

**Metadata Package Blob**:
A schema-declared typed binary payload stored separately from JSON records and addressed through safe identity, length and digest evidence.
_Avoid_: Base64 field, original asset by default, opaque cache object

**Open Metadata Portability Export**:
The default documented `.dammeta`, JSON or CSV interchange output whose selected contents are readable without a confidentiality layer.
_Avoid_: Unprotected backup, accidental plaintext, encrypted export

**Encrypted Metadata Portability Export**:
A complete metadata portability output wrapped in a documented age passphrase envelope without changing the inner package, JSON or CSV schema.
_Avoid_: Encrypted ZIP entries, private crypto format, Full Library Backup

**Export-Scoped Asset Reference**:
A random identity unique to one portability export that connects its records and payloads without disclosing a stable library identity.
_Avoid_: Design Asset Identity, database row, filename key

**Portable Asset Identity**:
The optional stable pair of Portable Library Lineage Identity and Design Asset Identity used as correlation-sensitive matching evidence across exports.
_Avoid_: Local Library Instance Identity, database primary key, source path

**Exact Asset Matching Evidence**:
The reviewed package option that includes stable portable identity and available exact Original Content Match Evidence for future deterministic matching.
_Avoid_: Filename matching, visual duplicate signal, automatic metadata import

**Original Content Match Evidence**:
Verified real-format, byte-length, content-digest and complete compound member/manifest evidence that can prove exact original-content correspondence without exposing a path.
_Avoid_: Byte length alone, preview hash, source filename

**Portability Review Thumbnail**:
An optional bounded sRGB raster inside a Metadata Portability Package used only for human visual review and future import mapping, never as an original, formal preview, AI input or exact-match proof.
_Avoid_: Exported asset, Required Preview, matching digest

**Metadata Portability Import Inspection**:
A side-effect-free compatibility, integrity and content-class inspection of one selected portability representation before mapping or library writes.
_Avoid_: Import execution, package preview, automatic merge

**Metadata Import Mapping Plan**:
A current-library-bound reviewed plan connecting portability records to existing Design Assets through unique deterministic evidence or explicit user mapping before metadata writes.
_Avoid_: Cross-library merge, filename matching, automatic import

**Pending Metadata Mapping**:
An unmatched or ambiguous portability record awaiting explicit mapping, exclusion or refreshed target evidence without creating a metadata-only asset.
_Avoid_: Placeholder asset, failed import, inferred match

**Metadata Portability Value Conflict**:
A semantic field/result disagreement between one mapped portability record and its target Design Asset requiring a type- and provenance-aware reviewed choice.
_Avoid_: Full-backup Import Conflict, Last Writer Wins, mapping failure

**Add Missing Imported Set Values**:
The default portability choice that preserves the current compatible set and adds only absent imported members whose object identities are already resolved.
_Avoid_: Replace set, match by label, create missing concepts

**Metadata Portability Import Item**:
One mapped Design Asset plus all reviewed fields, relationships and compatible results that must revalidate and commit atomically within a portability import.
_Avoid_: Import field write, whole import transaction, source package record

**Metadata Portability Import Result**:
The persisted per-item and per-value outcome summary for one portability import, separating imported, unchanged, conflicting, failed, excluded and cancelled work.
_Avoid_: Import plan, package manifest, success toast

**Metadata Import Effect Snapshot**:
The minimal short-lived prior values and exact created-effect identities needed to safely undo one committed Metadata Portability Import Item.
_Avoid_: Asset version, source package copy, complete metadata snapshot

**Import Undo Conflict**:
A state where later edits or ownership changes prevent one import item's exact effects from being reversed without overwriting newer intent.
_Avoid_: Import failure, value conflict, force restore

**Metadata Import Session**:
An explicitly saved, library-owned set of normalized unresolved portability records, choices and path-free source identity evidence that can resume mapping without retaining the source package.
_Avoid_: Import history, recent file, package copy

**Metadata Import Review Cache**:
Bounded device-local non-authoritative thumbnails or rendered media used only to assist visual import mapping and removable without losing the saved task.
_Avoid_: Metadata Import Session, Required Preview, backup content

**Portability Shared Object Review**:
The pre-asset import review that reuses, explicitly creates or excludes referenced Tag Concepts and collection objects without matching them by names or labels.
_Avoid_: Asset mapping, automatic tag merge, collection-name import

**Portability Object Mapping**:
A stable library-owned mapping from one exact source-lineage object identity and type to its reviewed target-library Tag Concept or collection identity.
_Avoid_: Label alias, database row mapping, cross-library synchronization

**Portability Shared Object Commit Unit**:
One reviewed target Tag Concept or collection object plus its source mapping that revalidates and commits atomically before dependent import relationships.
_Avoid_: Asset import item, whole shared-object transaction, name-based creation

**Portability Shared Object Naming Conflict**:
A target naming/scope constraint requiring explicit mapping, user-confirmed renaming or exclusion without automatic merging or suffixing.
_Avoid_: Duplicate proof, automatic unique name, asset conflict

**Metadata Import Draft**:
A versioned host-validated data-only representation of typed records, provenance and unsupported-field evidence produced before the normal metadata import pipeline.
_Avoid_: Database write plan, plugin payload, source-file copy

**Field Mapping Import**:
The reviewed conversion of user-selected third-party JSON paths or CSV columns into supported Metadata Import Draft fields without claiming a native schema.
_Avoid_: Native portability import, spreadsheet upload, arbitrary object preservation

**Import Mapping Preset**:
A user-named reusable set of field/type/conversion rules and non-content source-shape evidence containing no imported values or source location.
_Avoid_: Import session, source template file, automatic schema trust

**Metadata Import Adapter**:
An isolated versioned extension contribution that transforms one explicitly selected staged source into a candidate Metadata Import Draft without library write authority.
_Avoid_: Capture producer, database plugin, import executor

**Metadata Portability JSON**:
A documented human-readable structured export for selected metadata and provenance that can be represented safely without opaque binary encoding.
_Avoid_: Package manifest only, private object dump, base64 vector export

**Metadata Portability CSV**:
A documented one-row-per-asset flat export for explicitly supported scalar fields that makes no round-trip promise for structured or binary evidence.
_Avoid_: JSON in cells, vector table, lossless metadata package

**Metadata Writeback Conflict**:
A field-level conflict where a selected Writeback-Eligible Metadata Value differs from the freshly read value already stored in its exact original-file target field.
_Avoid_: Concurrent library edit, unsupported mapping, Source Content Generation conflict

**Keep Original Metadata Value**:
The default scalar writeback-conflict choice that leaves the original-file field and library value unchanged and excludes that field from the current writeback.
_Avoid_: Import file value, resolve future writebacks, clear library value

**Use Library Metadata Value**:
An explicit scalar writeback-conflict choice that replaces only the reviewed original-file target field with the selected library value through protected source mutation.
_Avoid_: Last writer wins, automatic overwrite, keyword merge

**Edit Shared Metadata Value**:
An explicit scalar conflict choice proposing one new supported value for both the library field and original-file target, with the library edit committed only after source write success.
_Avoid_: Writeback-only scratch value, pre-write library edit, lossy coercion

**Append Library Keywords**:
The recommended keyword-conflict choice that preserves existing original-file keywords and appends selected reviewed tag labels after only format-declared exact deduplication.
_Avoid_: Fuzzy tag merge, translated deduplication, replace keyword set

**Replace Original Keywords**:
An explicit keyword-conflict choice that replaces the complete reviewed original-file keyword set with the selected library tag labels.
_Avoid_: Default merge, clear Tag Concepts, apply to scalar fields

**Original Metadata Writeback Batch**:
A reviewed coordinator that applies one semantic Metadata Writeback Field Set to selected Design Assets while each complete Original Asset resolves and commits independently.
_Avoid_: Metadata batch edit, shared file transaction, Metadata Portability Export

**Metadata Writeback Field Set**:
The user-selected semantic field classes for one writeback batch, resolved separately into each item's supported format-specific targets and values.
_Avoid_: Common XMP namespace, field-value template, writeback preset

**Metadata Writeback Batch Item**:
One Design Asset, current Source Content Generation, complete Original Asset and resolved set of supported source-field mutations inside an Original Metadata Writeback Batch.
_Avoid_: Per-field write task, Compound Original member row, shared batch staging

**Metadata Writeback Batch Result**:
A truthful per-asset grouping of written, byte-identical, excluded, conflict-review, failed, recovery and cancelled writeback outcomes without whole-batch rollback.
_Avoid_: Aggregate-only success, metadata edit result, hidden partial generation

**Retry Failed Metadata Writebacks**:
An explicit fresh-plan action for eligible failed or stale writeback items that never reruns successful, byte-identical or recovery-bound items.
_Avoid_: Automatic source retry, replay batch, repeat ambiguous publication

**Mixed-Ownership Metadata Writeback Plan**:
A read-only planning container that applies one semantic field selection to Managed and Referenced Assets while separating them into ownership-specific writeback sub-batches.
_Avoid_: Mixed executable batch, ownership conversion, shared source authorization

**Managed Metadata Writeback Sub-Batch**:
The separately confirmed part of a mixed-ownership plan whose source-mutation authority is limited to library-owned Original Assets.
_Avoid_: Referenced writeback authorization, mixed ownership batch, managed metadata edit

**Referenced Metadata Writeback Sub-Batch**:
The separately confirmed part of a mixed-ownership plan whose source-mutation authority is limited to the disclosed user-owned external Original Assets.
_Avoid_: Managed writeback authorization, external metadata sync, shared source authorization

**Writeback Ownership Confirmation**:
An explicit source-modification authorization bound to exactly one ownership-specific metadata writeback sub-batch.
_Avoid_: Selection consent, combined confirmation, remembered writeback permission

**Managed Metadata Writeback Recovery Basis**:
The exact recoverable pre-write generation evidence required before metadata writeback may materially replace a Managed Asset's Original Asset, supplied by either a validated recovery copy or a qualifying Full Library Backup.
_Avoid_: Best-effort backup, transaction staging, Referenced source receipt

**Managed Metadata Writeback Recovery Copy**:
A complete library-owned copy of the exact managed Original Asset generation displaced by metadata writeback, retained as recovery data outside current-source and cache lifecycles.
_Avoid_: Revision history, preview cache, duplicate Design Asset

**Managed Writeback Recovery Point Review**:
A required decision over existing and newly required local recovery generations before another Managed metadata writeback may add, preserve in backup or replace recovery data.
_Avoid_: Automatic version retention, cache quota prompt, writeback conflict review

**Preserve Prior Writeback Recovery Point In Backup**:
An explicit choice that makes a verified Full Library Backup the recovery basis for one exact prior managed writeback generation before its local recovery copy may be cleaned up.
_Avoid_: Ordinary current-only backup, upload recovery copy, automatic archival

**Replace Prior Managed Writeback Recovery Point**:
An explicit loss-of-recovery-point choice that retires selected older local writeback recovery data so a newly required current-generation recovery basis can be established.
_Avoid_: Automatic pruning, overwrite recovery copy, latest-only history

**Export Managed Writeback Recovery Copy**:
An explicit verified copy of one complete managed writeback recovery generation to a user-owned external destination without changing the Design Asset or consuming the recovery point.
_Avoid_: Restore current version, ownership conversion, relink exported file

**Use Managed Writeback Recovery Point As Current**:
A protected managed-source replacement that makes selected prior bytes current as a new Source Content Generation while preserving the Design Asset and Managed ownership.
_Avoid_: Undo writeback, reactivate old generation, database rollback

**Managed Writeback Recovery Replacement Review**:
A comparison of one selected recovery generation, the current complete Original Asset and the recovery protection required for the current bytes before prior content may return as a new current generation.
_Avoid_: Recovery-point export, restore confirmation, metadata conflict review

**Local Recovery Point Use Disposition**:
The required choice to consume or independently retain a local managed writeback recovery point when its bytes materially return as the current generation.
_Avoid_: Cleanup confirmation, automatic latest-version policy, backup retention

**Consume Managed Writeback Recovery Point Into Current**:
The storage-efficient use-as-current outcome that ends a local point's separate recovery role only when its exact bytes safely become the proven new current generation.
_Avoid_: Delete before restore, rollback generation, consume backup point

**Keep Managed Writeback Recovery Point After Use**:
The use-as-current outcome that retains the selected local point as independent recovery data while a separately staged copy becomes the new current generation.
_Avoid_: Implicit duplicate, backup preservation, default retention

**Clean Up Managed Writeback Recovery Point**:
A separately confirmed complete-set action that removes one local managed writeback recovery point from library recovery storage through operating-system trash.
_Avoid_: Permanent delete, cache cleanup, consume into current

**Managed Writeback Recovery Point Cleanup Recovery**:
A point-scoped state where cleanup has not proven that either every recovery member remains in library storage or the complete set reached operating-system trash.
_Avoid_: Partial cleanup success, automatic retry, current-source recovery

**Managed Writeback Recovery Point Trash Receipt Set**:
Device-local recovery evidence for every member of one complete managed writeback recovery point moved to operating-system trash.
_Avoid_: Current-source receipt, conversion-residue receipt, portable backup

**Restore Cleaned Managed Writeback Recovery Point**:
A receipt-scoped complete-set restoration into safe library-managed recovery storage that reinstates only the recovery-point role.
_Avoid_: Make current, restore generation history, relink source

**Managed Writeback Recovery Cleanup Batch**:
A reviewed coordinator that cleans selected local managed writeback recovery points while each complete point commits or recovers independently.
_Avoid_: Bulk permanent delete, one trash transaction, cache cleanup

**Managed Writeback Recovery Cleanup Batch Item**:
One complete single-file or Compound Original writeback recovery point and its independently committed cleanup evidence inside a cleanup batch.
_Avoid_: Recovery member row, Design Asset deletion, shared batch receipt

**Retry Failed Managed Writeback Recovery Cleanups**:
An explicit fresh-plan action for selected currently eligible failed or pre-boundary cancelled cleanup items that never repeats success or ambiguous trash calls.
_Avoid_: Automatic delete retry, replay cleanup batch, resume cleanup recovery

**Managed Recovery Storage**:
The unified Storage Management view of library-owned recovery payloads whose distinct recovery classes retain separate cleanup and restore authority.
_Avoid_: Recovery cache, revision history, operating-system trash

**Mixed Managed Recovery Storage Cleanup Plan**:
A read-only plan that groups one mixed recovery-storage selection into separately confirmed type-specific cleanup sub-batches.
_Avoid_: Mixed delete batch, shared cleanup permission, storage-pressure eviction

**Writeback Recovery Cleanup Sub-Batch**:
The separately confirmed portion of a mixed recovery-storage plan limited to Managed Metadata Writeback Recovery Points.
_Avoid_: Conversion residue cleanup, combined recovery delete, cache batch

**Ownership Conversion Residue Cleanup Sub-Batch**:
The separately confirmed portion of a mixed recovery-storage plan limited to Managed Ownership Conversion Residue sets.
_Avoid_: Writeback recovery cleanup, ownership conversion batch, combined recovery delete

**Backup-Protected Managed Writeback Recovery Point**:
An exact prior managed generation preserved inside a verified Full Library Backup and indexed as externally stored recovery with zero local recovery-storage bytes.
_Avoid_: Local recovery copy, backup cache, restored current generation

**Forget Backup Recovery Association**:
An explicit removal of the library's active recovery index and device-local location evidence for backup-protected points without modifying their Full Library Backup.
_Avoid_: Delete backup, clean local recovery, forget Design Asset

**Rediscover Backup-Protected Recovery Points**:
An explicit authenticated reconstruction of exact recovery-point associations from a reselected Full Library Backup manifest.
_Avoid_: Automatic disk scan, metadata import, infer from backup filename

**Passive Backup Recovery Availability**:
A content-free hint derived only from saved device-local handles and operating-system events that an associated backup may be present.
_Avoid_: Backup verification, disk scan, automatic mount

**Backup Recovery Manifest Verification**:
Authentication of one associated archive's identity, lineage and recovery manifest without reading every declared recovery payload.
_Avoid_: Full backup restore, selected payload verification, background scan

**Selected Backup Recovery Payload Verification**:
Fresh proof of every member, byte digest, real format and relationship in the exact backup-protected recovery point selected for an operation.
_Avoid_: Manifest-only verification, verify whole archive content, remembered backup health

**Asset Ownership Conversion Recovery**:
An item-scoped state where an ownership transition cannot yet prove either its pre-commit ownership or its fully committed new ownership and residue/source consequences.
_Avoid_: Dual ownership, automatic rollback, new Design Asset

**Managed Asset**:
A Design Asset whose Original Asset bytes are owned by the library and follow its managed storage, trash, backup, and permanent-deletion lifecycle.
_Avoid_: Referenced asset, normalized image, imported metadata only

**Referenced Asset**:
A Design Asset whose single-file or compound Original Asset remains user-owned at its source location or locations while the library stores its relationships, metadata, and derived media and may perform explicit user-requested source operations.
_Avoid_: Managed asset, copied import, library-owned original

**Referenced Compound Original**:
A Compound Original whose primary and companion bytes remain user-owned at explicit source locations while one Referenced Asset stores their declared roles and relationships without copying them.
_Avoid_: Managed compound original, folder import, multiple referenced assets

**Referenced Compound Member Relationship**:
The library relationship binding one declared member role of a Referenced Compound Original to one validated user-owned source without granting file ownership or independent asset identity.
_Avoid_: Original Storage Object Identity, source-folder ownership, independent Referenced Asset

**Referenced Compound Original Recovery**:
A group-scoped reference recovery state entered when a Referenced Compound Original's primary, required member, identity, or declared relationship is unavailable or invalid, preserving the Design Asset while requiring explicit member-set relink rather than managed copy-back.
_Avoid_: Managed Original Recovery, primary-only relink, independent member recovery

**Referenced Compound Membership Conflict Review**:
A blocking review where one physical source would otherwise become both standalone and compound, fill multiple roles, or belong to multiple Compound Originals in the same library.
_Avoid_: Duplicate warning, automatic first match, shared companion

**Add Assets**:
The neutral active-library workflow that requires an explicit Reference in Place or Copy Into Library ownership mode before selected local files or folders are admitted.
_Avoid_: Import, capture, silent ownership inference, Library Start

**Reference in Place**:
An Add Assets ownership mode that creates fully manageable single-file or Referenced Compound Originals without copying or taking ownership of selected originals during admission.
_Avoid_: Read-only catalog entry, copied import, In-Place Reference Library

**Referenced Source Operation**:
An explicit user-requested operation that changes the path or bytes of a user-owned referenced original through the application without transferring its ownership to the library.
_Avoid_: Collection edit, Source Tree rearrangement, background synchronization, ownership conversion

**Rewrite Referenced Source**:
An explicit Referenced Source Operation that replaces a user-owned original with completely staged and validated capability-supported bytes while preserving its Design Asset and referenced ownership and creating a new Source Content Generation for material change.
_Avoid_: Compatible Export, metadata edit, external save reconciliation

**Rewrite Referenced Compound Source**:
An explicit group-level Referenced Source Operation that may replace capability-approved members in place while preserving one Referenced Compound Original and committing material member changes as one Source Content Generation.
_Avoid_: Rewrite primary only, batch companion rewrites, cross-format conversion

**Referenced Compound Source Rewrite Plan**:
A reviewed same-format plan that gives every current compound member an explicit Keep Current or Rewrite outcome and exposes all capability-required cross-member effects.
_Avoid_: Primary rewrite dialog, hidden sidecar update, member checklist

**Referenced Compound Source Rewrite Staging Set**:
The complete set of verified operation-owned candidate outputs for every member marked Rewrite, evaluated together with unchanged current members before any source is replaced.
_Avoid_: Source backup, independent rewrite staging, active compound generation

**Referenced Compound Source Rewrite Destructive Boundary**:
The first operating-system trash request for any old member in a confirmed compound rewrite, after which cancellation cannot claim the complete prior group remains unchanged.
_Avoid_: Staging completion, group generation commit, rewrite undo point

**Referenced Compound Source Rewrite Publication Recovery**:
The group-scoped state entered after the compound rewrite destructive boundary when complete intended member publication and one Source Content Generation commit are not both proven.
_Avoid_: Independent member recovery, partial rewrite success, automatic rollback

**Compound Rewritten Old Source Recovery Receipt Set**:
Device-local recovery evidence grouping the exact pre-rewrite source receipt for every materially replaced compound member without creating portable revision history or member-level undo.
_Avoid_: Referenced Compound Source Trash Receipt Set, source backup, active prior generation

**Source Rewrite Plan**:
A user-confirmed set of same-format content-property rules whose fields default to Keep Current and resolve separately for each selected source's real format and required professional structure.
_Avoid_: Compatible Export preset, extension conversion, hidden rewrite defaults

**Source Rewrite Preset**:
A named reusable Source Rewrite Plan intent that stores no prior item resolution, capability proof or destructive confirmation and always reopens full review when applied.
_Avoid_: Automatic rewrite rule, trusted encoder snapshot, preauthorized source replacement

**Personal Source Rewrite Preset**:
A device-local Source Rewrite Preset available across libraries on that device without becoming portable library state.
_Avoid_: Library Source Rewrite Preset, cloud preset, globally synchronized rewrite rule

**Library Source Rewrite Preset**:
A portable Source Rewrite Preset owned by one library and protected by that library's Full Library Backup without carrying installed capability state.
_Avoid_: Personal Source Rewrite Preset, plugin bundle, cross-library shared mutation

**Referenced Source Rewrite Batch**:
A reviewed coordination of independent single-file Rewrite Referenced Source or whole Rewrite Referenced Compound Source items under one Source Rewrite Plan, with Design-Asset-scoped capability, commit and recovery boundaries.
_Avoid_: Folder conversion, atomic multi-file rewrite, batch export

**Referenced Source Rewrite Batch Result**:
A result surface grouping per-item rewrite outcomes without implying that one failure rolled back other successfully rewritten sources.
_Avoid_: Success toast, atomic batch result, generic encoder error list

**Referenced Source Rewrite Automatic Retry**:
A system-initiated full re-encode after a classified transient read, encoder, staging-write or verification failure before the Referenced Source Rewrite Destructive Boundary.
_Avoid_: Resume unverified staging, publication retry, recovery continuation

**Referenced Source Rewrite Automatic Retry Budget**:
The maximum of two Referenced Source Rewrite Automatic Retry attempts after one initial item attempt before explicit user action is required.
_Avoid_: Unlimited encoder restart, budget reset on restart, manual retry count

**Retry Failed Referenced Source Rewrites**:
An explicit batch-result action that fully revalidates and re-encodes only selected failed rewrite items that remain safely before their destructive boundary.
_Avoid_: Retry whole batch, repeat successful rewrites, retry publication recovery

**Referenced Source Rewrite Review**:
A pre-commit comparison of current source evidence and proposed rewrite output, including format, dimensions, color, bit depth, quality and preserved or lost professional structure.
_Avoid_: Generic confirmation dialog, Compatible Export review, hidden conversion

**Referenced Source Rewrite Staging**:
A complete capability-produced candidate rewrite on the source volume that is neither the active referenced source nor eligible for preview, analysis, backup or handoff before verified publication.
_Avoid_: Preview cache, Compatible Export, active source version

**Referenced Source Rewrite Destructive Boundary**:
The point where Rewrite Referenced Source begins its operating-system trash request for the exact old source, after which cancellation cannot claim the source remains unchanged.
_Avoid_: Publication point, rewrite undo point

**Referenced Source Rewrite Publication Recovery**:
The item-scoped state entered when the exact old source was proven moved to operating-system trash but verified rewrite staging was not proven published as the active source.
_Avoid_: Successful rewrite, generic encoder failure, automatic retry

**Referenced Source Rewrite Recovery Review**:
A dedicated visual surface for reconciling the exact old source, verified rewrite staging and current source-path evidence when automatic rewrite rollback cannot complete safely.
_Avoid_: Local File Recovery, generic encoder error, automatic overwrite

**Referenced Compound Source Path Operation**:
An explicit group-level Referenced Source Operation that coordinates every included member's unchanged path, same-volume relocation or cross-volume transfer and commits the Referenced Compound Original only after the complete target relationship validates.
_Avoid_: Primary-only move, companion batch, source-folder synchronization

**Referenced Compound Source Path Plan**:
A reviewed mapping from every current Referenced Compound Member Relationship to one explicit path outcome, with capability-derived targets distinguished from user-mapped targets before any member path changes.
_Avoid_: Filename inference, single destination picker, hidden companion move

**Referenced Compound Source Path Conflict Review**:
A group-scoped visual decision surface that resolves every occupied or incompatible planned member destination before a Referenced Compound Source Path Operation may continue.
_Avoid_: Per-member error dialog, automatic overwrite, silent unique naming

**Referenced Compound Source Path Recovery**:
The group-scoped state entered when a started Referenced Compound Source Path Operation cannot prove the complete planned physical layout and one authoritative relationship commit.
_Avoid_: Automatic rollback, independent member recovery, successful partial move

**Referenced Source Path Batch**:
A user-selected coordination of independent single-file path operations or whole Referenced Compound Source Path Operation items, each retaining its own asset-level commit, conflict and recovery boundary.
_Avoid_: Filesystem transaction, folder synchronization, atomic batch move

**Referenced Source Path Batch Result**:
A batch result surface grouping item-committed source-path outcomes into succeeded, conflict review, failed, recovery and cancelled states without implying batch rollback.
_Avoid_: Success toast, atomic result, generic error list

**Referenced Source Path Batch Undo**:
A 30-second batch-result affordance that requests freshly validated reverse relocation only for successful simple same-volume items still eligible for Referenced Source Relocation Undo.
_Avoid_: Atomic batch rollback, cross-volume transfer undo, conflict recovery

**Referenced Source Path Batch Cancellation**:
A user-requested batch boundary that stops unstarted source-path items and may halt an in-progress cross-volume copy only at a safe pre-publication checkpoint without undoing committed outcomes or closing attention items.
_Avoid_: Batch rollback, forced filesystem interruption, dismiss conflict

**Referenced Source Volume Lane**:
The Referenced Source Operation participation in the shared Physical Volume File Lane, retaining its source guards and destructive boundaries.
_Avoid_: Separate rewrite scheduler, user-selected concurrency, path conflict guard

**Physical Volume File Lane**:
A shared exclusive application scheduling boundary that permits at most one active lane-governed file operation to involve a stable physical volume while disjoint volume sets may proceed independently.
_Avoid_: Path-string lock, operating-system lock, export-only queue

**Referenced Source Path Automatic Retry**:
A system-initiated replay of unchanged pre-publication read, copy or verification work after a classified transient Referenced Source path failure.
_Avoid_: Destructive call retry, restart reconciliation, conflict resolution

**Referenced Source Path Automatic Retry Budget**:
The maximum of two Referenced Source Path Automatic Retry attempts after one initial item attempt before explicit user action is required.
_Avoid_: Unlimited retry loop, three retries after initial failure, manual retry limit

**Retry Failed Source Path Items**:
An explicit batch-result action that freshly revalidates and retries only currently failed Referenced Source path items still proven safe to execute.
_Avoid_: Retry whole batch, repeat successful items, bypass conflict or recovery

**Relocate Referenced Source**:
A path-only Referenced Source Operation that moves or renames a referenced original on the same verified physical volume while preserving its Design Asset and Source Content Generation.
_Avoid_: Source Tree rearrangement, cross-volume transfer, content rewrite

**Referenced Source Relocation Undo**:
A 30-second post-success affordance that requests a freshly validated reverse Relocate Referenced Source for a simple same-volume move that displaced no other file.
_Avoid_: Filesystem rollback guarantee, replacement recovery, cross-volume transfer undo

**Referenced Source Relocation Conflict Review**:
A dedicated visual decision surface that compares a same-volume relocation source with its occupied destination and requires an explicit safe path outcome without cross-volume staging.
_Avoid_: Referenced Source Transfer Conflict Review, automatic overwrite, generic rename error

**Use Existing Identical Relocation Destination**:
An explicit relocation-conflict choice that adopts a completely verified byte-identical destination occupant as the Referenced Asset's source before separately cleaning up the prior source.
_Avoid_: Filename match, automatic deduplication, overwrite destination

**Relocate Source With Unique Name**:
An explicit relocation-conflict choice that atomically moves the source to a reviewed safe unoccupied name on the same physical volume.
_Avoid_: Silent suffix, copy transfer, duplicate Design Asset

**Replace Relocation Destination**:
A separately confirmed relocation-conflict choice that moves the exact destination occupant to operating-system trash and only then atomically moves the current source into that path.
_Avoid_: Permanent overwrite, unlink destination, cross-volume publication

**Relocation Destination Replacement Receipt**:
Minimal device-local evidence binding one exact app-trashed same-volume destination occupant to relocation-replacement recovery without creating portable deletion state or a system-trash index.
_Avoid_: Transfer Destination Replacement Receipt, Referenced Source Trash Receipt, relocation history

**Relocation Replacement Recovery**:
The item-scoped recovery state entered when a same-volume destination occupant was proven trashed but the source relocation was not proven committed.
_Avoid_: Completed relocation, generic rename failure, Asset Trash

**Relocation Replacement Recovery Review**:
A dedicated visual surface for restoring the exact relocation occupant or explicitly continuing the source move when automatic rollback cannot complete safely.
_Avoid_: Referenced Source Relocation Conflict Review, system trash browser, automatic retry

**Transfer Referenced Source Across Volumes**:
An explicitly confirmed Referenced Source Operation that copies an original to another physical volume, verifies the complete destination bytes, and only then requests moving the old source to operating-system trash.
_Avoid_: Filesystem rename, Copy Into Library, ownership conversion

**Referenced Source Transfer Staging**:
An application-owned incomplete destination-volume artifact bound to one confirmed cross-volume source transfer and excluded from every asset, preview, search, analysis, backup and cache surface until verified final commit.
_Avoid_: Referenced source, destination file, preview cache, Managed Intake Artifact

**Referenced Source Transfer Checkpoint**:
Minimal durable operation and byte-progress evidence used to prove whether Referenced Source Transfer Staging can safely resume, restart, publish or be removed without treating partial bytes as a source file.
_Avoid_: Design Asset record, user file history, cache entry

**Referenced Source Transfer Conflict Review**:
A dedicated visual decision surface that compares a cross-volume transfer with the file occupying its intended destination and requires an explicit safe publication outcome.
_Avoid_: Automatic overwrite, generic error dialog, metadata Conflict Review Surface

**Use Existing Identical Destination**:
An explicit transfer-conflict choice that adopts a completely verified byte-identical destination occupant as the Referenced Asset's new source without publishing the duplicate staged bytes.
_Avoid_: Filename match, automatic deduplication, Use Existing File as Replacement

**Publish Transfer With Unique Name**:
An explicit transfer-conflict choice that publishes verified staging under a reviewed safe unoccupied name in the selected destination directory.
_Avoid_: Silent suffix, duplicate Design Asset, rename old source

**Replace Transfer Destination**:
A separately confirmed transfer-conflict choice that moves the current destination occupant to operating-system trash and publishes verified staging only after that move reports success.
_Avoid_: Permanent overwrite, Use Existing File as Replacement, automatic cleanup

**Transfer Destination Replacement Receipt**:
Minimal device-local evidence binding one exact app-trashed destination occupant to its transfer-replacement recovery lifecycle without creating portable deletion state or a system-trash index.
_Avoid_: Referenced Source Trash Receipt, Full Library Backup, trash search record

**Replacement Publication Recovery**:
The item-scoped recovery state entered when a destination occupant was proven trashed but verified transfer staging was not proven published.
_Avoid_: Completed replacement, generic transfer failure, Asset Trash

**Replacement Recovery Review**:
A dedicated visual surface for restoring the exact replaced occupant or explicitly continuing publication when automatic rollback of Replacement Publication Recovery cannot complete safely.
_Avoid_: Referenced Source Transfer Conflict Review, system trash browser, automatic retry

**Recover Replaced Destination File**:
An explicit receipt-scoped action that restores the exact file displaced by a successful source transfer or relocation replacement to a user-selected safe location without changing the active Referenced Asset.
_Avoid_: Undo source operation, restore Design Asset, overwrite new source

**Clear Replacement Recovery**:
An explicit device-local privacy action that retires selected transfer or relocation destination-replacement receipts without moving, deleting, restoring or emptying their operating-system trash items.
_Avoid_: Empty system trash, Permanent Asset Delete, cache cleanup

**Transferred Old Source Recovery Receipt**:
Minimal device-local evidence binding one exact old source trashed after a successful cross-volume transfer to independent external-file recovery without preserving a Design Asset source relationship.
_Avoid_: Referenced Source Trash Receipt, Transfer Destination Replacement Receipt, transfer undo

**Recover Transferred Old Source File**:
An explicit receipt-scoped action that restores the exact old source displaced by a successful cross-volume transfer as an ordinary untracked external file.
_Avoid_: Undo transfer, relink Referenced Asset, restore Design Asset

**Relocated Old Source Recovery Receipt**:
Minimal device-local evidence binding one exact prior source trashed after adopting an identical same-volume destination to independent external-file recovery.
_Avoid_: Transferred Old Source Recovery Receipt, Referenced Source Trash Receipt, relocation undo

**Recover Relocated Old Source File**:
An explicit receipt-scoped action that restores the exact prior source displaced by identical-destination relocation as an ordinary untracked external file.
_Avoid_: Undo relocation, relink Referenced Asset, restore Design Asset

**Rewritten Old Source Recovery Receipt**:
Minimal device-local evidence binding an exact pre-rewrite single-file source or materially replaced compound member to later external-file recovery without retaining it as the active Source Content Generation.
_Avoid_: Automatic revision history, Referenced Source Trash Receipt, rewrite undo

**Recover Rewritten Old Source File**:
An explicit receipt-scoped action that restores the exact pre-rewrite source to a user-selected safe empty location as an ordinary untracked external file.
_Avoid_: Undo rewrite, replace current source, restore Design Asset generation

**Use Recovered Rewrite Source as Current**:
An explicit new Rewrite Referenced Source request that uses a recovered old-source file as immutable input for a fully reviewed and protected current-source replacement.
_Avoid_: Reactivate old generation, one-click undo, relink without validation

**Transferred With Old Source Remaining**:
A partial-success state where a cross-volume transfer has committed the verified destination as the Referenced Asset's source but the old source could not be moved to operating-system trash.
_Avoid_: Failed transfer, second Design Asset, automatic cleanup

**Retry Old Source Cleanup**:
An explicit follow-up action that freshly verifies the exact old source left by a cross-volume transfer before making one new request to move it to operating-system trash.
_Avoid_: Automatic retry, delete by remembered path, undo transfer

**Keep Both After Source Transfer**:
An explicit resolution that keeps the Referenced Asset related only to its verified new destination and releases the old source as an ordinary untracked user file.
_Avoid_: Multi-source asset, duplicate Design Asset, Copy Into Library

**Copy Into Library**:
An Add Assets ownership mode that verifies and copies selected originals into library-owned storage while leaving the selected external sources untouched.
_Avoid_: Move import, Reference in Place, capture download

**Copy Into Library Plan**:
A read-only preflight of the selected external originals, estimated managed-storage demand, detected exclusions, and proposed copy scope shown before a Copy Into Library batch begins.
_Avoid_: Copy execution, Candidate Intake, Reference Adoption Scan Plan

**Copy Scope Exclusion**:
A selected or discovered entry that remains outside a Copy Into Library batch for one visible traversal, ownership-boundary, readability, safety, or capability reason.
_Avoid_: Silent ignore, failed Candidate, deleted source

**Copy Into Library Storage Shortfall**:
The assessed bytes still needed for a planned or paused Copy Into Library scope to preserve the destination volume's Storage Safety Reserve.
_Avoid_: File-size limit, automatic cleanup amount, free space on another volume

**Copy Intake Storage Pause**:
A non-terminal Copy Into Library batch state that retains committed results and stops remaining admissions because the destination volume cannot currently preserve its Storage Safety Reserve.
_Avoid_: Import failure, batch rollback, ownership conversion

**In-Place Reference Library**:
A portable library created by adopting an existing asset directory as Library Root while keeping its pre-existing originals as Referenced Assets instead of copying or moving them.
_Avoid_: Managed import, folder conversion, ordinary reference source

**Reference Adoption Scan Plan**:
A read-only preflight of the recursive source scope, estimated files and bytes, format distribution, exclusions, and exceptions proposed before adopting an existing directory.
_Avoid_: Import execution, background crawl, completed library index

**Progressive Reference Indexing**:
The resumable post-confirmation process that validates and admits eligible standalone files or capability-declared source-member groups as Referenced Assets incrementally without waiting for the entire adopted tree to finish.
_Avoid_: One blocking import, AI analysis queue, silent folder crawl

**Reference Scan Exception**:
A discovered source item that remains outside normal asset results because validation, readability, encryption, format capability, or another declared admission requirement is unresolved.
_Avoid_: Imported asset, ignored file, successful placeholder

**Library Start**:
The first-run or no-library surface for creating, adopting, opening, or restoring one active portable library before entering Asset Workspace.
_Avoid_: AI setup, hidden default library, account onboarding

**Legacy Application Library**:
An existing pre-portable DAM collection whose Design Asset records and Original relationships predate Library Root identity and explicit Asset File Ownership evidence.
_Avoid_: Active Library, In-Place Reference Library, corrupted library

**Legacy Application Library Migration**:
An explicit Material Library Migration that preserves existing Design Asset identities while copy-verifying available originals into managed storage and leaving migration source files untouched.
_Avoid_: Reimport, Candidate Promotion, automatic ownership inference, move import

**Library Open Inspection**:
The read-only pre-write validation that classifies an existing library's identity, compatibility, integrity, filesystem capability, migration need, and lock state before it can open normally.
_Avoid_: Database startup, source rescan, automatic repair

**Pre-Migration Recovery Snapshot**:
A verified local rollback snapshot created before a library schema upgrade without replacing the user's Full Library Backup policy.
_Avoid_: Full Library Backup, cache copy, unverified database duplicate

**Material Library Migration**:
A library upgrade that changes stored paths, file ownership, referenced-source relationships, or Library Control Directory layout and therefore requires a reviewed dry run and explicit confirmation.
_Avoid_: Metadata-only schema upgrade, cache rebuild, automatic compatibility fix

**Exclusive Library Lock**:
The evidence that exactly one application instance owns normal write access to one physical local library instance.
_Avoid_: Stale timestamp, cloud synchronization lock, permanent device ownership

**Library Recovery Mode**:
A restricted library state that blocks ordinary writes when authoritative state is damaged or uncertain while exposing bounded restore, repair, and diagnostic choices.
_Avoid_: Empty library recreation, normal read-write mode, cache rebuild

**Library Switch**:
An explicit transition that releases active write ownership from one Registered Library and activates another without merging them or writing both concurrently.
_Avoid_: Cross-Library Search, library merge, opening another writable window

**Library-Bound Work**:
An operation whose pending authoritative commit, durable checkpoint, or protected input belongs to one Local Library Instance.
_Avoid_: Read-only search, global package download, generic background task

**Library Quiescence**:
The proven Library Switch boundary where new Library-Bound Work is not admitted and every active write unit has committed, rolled back, or reached a durable resumable checkpoint.
_Avoid_: Application idle, force stop, task cancellation, elapsed timeout

**Offline Library Catalog**:
A bounded, device-local, rebuildable projection of a Registered Library's basic searchable metadata used while that library is unavailable.
_Avoid_: Library backup, full metadata replica, preview archive, AI search index

**Asset Collection**:
A user-facing organizational grouping for design assets or asset candidates; one design asset may belong to multiple asset collections without duplicating its original asset.
_Avoid_: Asset Category, physical folder, single category

**Search-First Organization**:
The product principle that technically admitted Design Assets become fully searchable without requiring complete collection, tag, rating, description, AI enrichment, or other classification work.
_Avoid_: Collection-first admission, mandatory curation queue, reusable-asset scoring

**Generic Organization Model**:
The core organization boundary in which client, project, campaign, theme, and working-set contexts are represented through ordinary collections, groups, tags, metadata, and filters rather than dedicated Client or Project entities.
_Avoid_: CRM record, project-management hierarchy, semantics inferred from names

**Custom Field Definition**:
A library-owned typed declaration for optional structured Candidate or Design Asset metadata that can participate in declared filtering and search without becoming a dedicated domain entity.
_Avoid_: Plugin-private field, application-global setting, inferred project schema

**Custom Field Definition Proposal**:
A non-authoritative plugin/import proposal for one declared Custom Field Definition that can become core library schema only after trusted host validation and explicit user mapping, creation, or exclusion.
_Avoid_: Schema migration, plugin-owned field, automatic definition creation

**Custom Field Display Name**:
The mutable user-facing name of one Custom Field Definition, preserving the user's spelling while remaining unique among active definitions in the same library under the portable Custom Field Name Comparison Policy and without serving as the field's identity.
_Avoid_: Custom Field Definition identity, import mapping key, field type

**Custom Field Name Comparison Policy**:
The portable, versioned and locale-independent rule that decides whether two Custom Field Display Names or two sibling Select-option labels conflict while preserving user-facing spelling.
_Avoid_: Operating-system locale comparison, filesystem comparison, plugin-defined comparison

**Rename Custom Field**:
A user-owned definition change that replaces only its Custom Field Display Name while preserving the same identity, values, settings and dependency references.
_Avoid_: Create replacement field, type migration, remap dependencies

**Custom Field Restore Name Conflict**:
The blocking conflict where an archived Custom Field Definition cannot become active because its display name is already used by an active definition in the same library.
_Avoid_: Automatic suffix, duplicate-field merge, Missing Custom Field Reference

**Custom Field Type**:
One portable core value contract from the initial Text, Number, Date, DateTime, Boolean, Single Select, Multi Select, or URL set, with type-specific validation and filtering.
_Avoid_: UI widget, arbitrary JSON, plugin-defined opaque payload

**Boolean Custom Field State**:
The explicit distinction among present True, present False and Missing, where
Missing remains value absence rather than a third Boolean value.
_Avoid_: Tri-state Boolean value, unchecked means Missing, implicit False

**Static Custom Field Default**:
An optional portable type-valid definition value applied once to an eligible
future new owner without overriding explicit, imported or transferred state.
_Avoid_: Dynamic expression, existing-value backfill, device-local default

**Ineligible Static Custom Field Default**:
A retained Static Custom Field Default that cannot currently produce a valid
new value and is therefore preserved but suspended pending explicit repair.
_Avoid_: Out-of-Constraint current value, automatic fallback, deleted default

**Default Needs Attention**:
The definition-level repair state exposing one Ineligible Static Custom Field
Default without turning affected new owners into per-item Review Signals.
_Avoid_: Asset validation failure, capture retry, default backfill queue

**Missing Custom Field Initialization Plan**:
A reviewed frozen batch intent that assigns exact values only to proven Missing
fields across an explicit Candidate/Design Asset owner set.
_Avoid_: Default backfill, overwrite existing values, schema migration

**Library-Bound Missing Initialization Operation**:
A durable Missing initialization plan and effect record bound to one exact
Local Library Instance so a compatible exclusive device may explicitly
reconcile and continue it.
_Avoid_: Device-local Undo journal, copied-library replay, automatic resume

**Missing Initialization Owner Scope**:
The frozen set of current Active Candidates and non-deleted Design Assets in
one active library selected by current selection, one stable filter generation
or explicit library-wide enumeration.
_Avoid_: Cross-library write scope, Candidate History, Asset Trash backfill

**Retry Missing Initialization Failure**:
A manual reattempt of explicitly selected owner groups whose prior failure is
proven transient and wholly uncommitted while their complete frozen plan
remains current.
_Avoid_: Retry All, automatic retry, conflict override

**Missing Initialization Undo Direction**:
The irreversible result state entered when trusted Undo admission closes every
remaining forward retry before reversing still-current successful effects.
_Avoid_: Retry/Undo toggle, Redo, concurrent forward and reverse writes

**Missing Initialization Action Window**:
The single bounded period starting at first terminal reconciliation during
which one Missing initialization result retains detailed Retry and Undo
authority.
_Avoid_: Per-device window, retry extension, permanent value history

**Boolean Custom Field Default**:
The True-or-False specialization of a Static Custom Field Default.
_Avoid_: Implicit False, existing-value backfill, Promotion reinitialization

**Custom Field Edit Draft**:
A non-authoritative typed manual-edit candidate bound to one exact library,
owner, Custom Field Definition and current value/definition revisions.
_Avoid_: Custom Field Value, auto-saved metadata, untyped form state

**Stale Custom Field Edit Draft**:
A Custom Field Edit Draft whose bound owner, definition, rule or value revision
is no longer current and therefore requires field-aware review.
_Avoid_: Last Writer Wins, invalid input, automatically rebased draft

**Unsaved Custom Field Changes Gate**:
The shared Save, Discard or Stay decision required before a context transition
may leave one or more pending Custom Field Edit Drafts.
_Avoid_: Type-specific modal, automatic navigation save, silent draft discard

**Custom Field Draft Resolution Plan**:
An ephemeral reviewed transition plan assigning an explicit Save or Discard
disposition and frozen execution order to every affected typed draft.
_Avoid_: Batch edit plan, autosave queue, durable pending operation

**Custom Field Draft Resolution Result**:
A transition-scoped truthful projection of resolved, failed and remaining
draft-owner groups after a multi-draft resolution attempt.
_Avoid_: Batch Activity, Custom Field history, successful navigation

**Protected Custom Field Draft Recovery Journal**:
Device-local operating-system-protected recovery infrastructure for qualifying
typed Custom Field Edit Drafts after unexpected termination.
_Avoid_: Portable draft state, plaintext cache, Custom Field Value history

**Recovered Custom Field Edit Draft**:
A typed Custom Field Edit Draft rediscovered from protected device-local state
and awaiting current identity, parsing, validation and revision checks.
_Avoid_: Auto-saved value, restored Custom Field Value, startup auto-commit

**Custom Field Edit Undo Step**:
One session-only reversible record for an exact successful single-field commit
or atomic same-owner field group and its typed previous value-or-Missing state.
_Avoid_: Draft keystroke, batch Undo item, Custom Field Value history

**Compound Custom Field Edit Undo Step**:
A Custom Field Edit Undo Step whose indivisible Undo/Redo unit contains every
typed field delta from one atomic multi-field owner commit.
_Avoid_: Per-field Undo list, Batch Undo, cross-owner transaction

**Unavailable Custom Field Edit Undo Step**:
The newest manual Undo entry whose exact current evidence prevents execution
and therefore blocks older entries until eligibility returns or it is removed.
_Avoid_: Skipped Undo, partially eligible step, expired history

**Unavailable Undo Step Review**:
The contextual decision surface for keeping or permanently removing one
Unavailable Custom Field Edit Undo Step without changing metadata.
_Avoid_: Conflict Resolution, Undo execution, clear-all history

**Custom Field Edit Undo Budget**:
The device-local pair of maximum complete steps and estimated retained memory
governing one active library session's manual Custom Field Undo stack.
_Avoid_: Portable retention policy, disk cache quota, guaranteed reserved memory

**Oversized Manual Undo Review**:
The pre-commit decision required when one prospective complete manual Undo step
cannot fit inside the current Custom Field Edit Undo Budget by itself.
_Avoid_: Post-save warning, split compound Undo, storage-pressure cleanup

**Manual Undo History Boundary**:
The point after a proven manual save without Undo beyond which no earlier
manual Custom Field Undo or Redo opportunity remains observable or executable.
_Avoid_: Skippable barrier, persistent history marker, operation-scoped Undo reset

**Critical-Pressure Manual Undo Reclamation**:
Last-resort loss of oldest complete manual Undo/Redo evidence when proven
Critical system memory pressure remains after safer disposable releases.
_Avoid_: Normal budget eviction, cache cleanup, configurable memory reservation

**Custom Field Edit Undo Stack**:
The single chronological memory-bounded sequence of manual typed Custom Field
Edit Undo Steps for one active library session.
_Avoid_: Per-type global stack, automatic unavailable-step skip, portable undo log

**Canonical Custom Field Text**:
The authoritative Unicode NFC form of one Text Custom Field Value that otherwise preserves the user's casing, whitespace and line breaks independently of editor presentation or derived search tokens.
_Avoid_: Trimmed text, search-normalized token, rich document

**Default Text Editor Presentation**:
The portable Text Custom Field Definition preference for a Compact or Expanded
editor layout, defaulting to Compact without changing Text value or validation
semantics.
_Avoid_: Single-line Text type, line-break constraint, current editor height

**Temporary Text Editor Expansion**:
The session-only Inspector state that opens one Compact-default Text field as
Expanded for full-value viewing or editing without changing its definition.
_Avoid_: Default Text Editor Presentation change, field migration, multiline type

**Text Edit Draft**:
A Text-typed Custom Field Edit Draft preserving the complete pending Unicode
candidate and Text-specific editor state.
_Avoid_: Custom Field Value, auto-saved metadata, AI Value Suggestion

**Plain Text Transfer Input**:
An explicitly declared Unicode plain-text clipboard or drag representation
accepted into a Text draft or Batch Text parameter without deriving content
from rich markup, files, images or asset objects.
_Avoid_: Rich-text paste, HTML extraction, file-path drop

**Plain Text Clipboard Output**:
Safe selected or complete Text written by an explicit Copy/Cut action as one
Unicode plain-text representation without rich formatting or object meaning.
_Avoid_: Rich-text copy, rendered Inspector text, clipboard history

**Copy Full Text**:
An explicit field action that copies the complete current draft when one exists
or otherwise the complete authoritative Text value, never a rendered summary.
_Avoid_: Copy selection, copy Compact preview, automatic clipboard sync

**Text Writing Assistance**:
Non-authoritative spelling, grammar or rewriting help that reports issues or
proposes range-bound changes for an active Text Edit Draft without validation,
commit or metadata authority.
_Avoid_: AI Value Suggestion, Custom Field validation, automatic metadata rewrite

**Writing Language Preference**:
A device-local choice of languages and proven-local editor checking behavior
that never becomes portable field schema or a declaration of content language.
_Avoid_: Custom Field language, Portable Text Pattern locale, language classification

**External Writing Assistance Request**:
A user-invoked reviewed request that sends one disclosed Text selection or
complete current draft to one disclosed remote-capable provider.
_Avoid_: Continuous cloud checking, provider configuration, External Analysis Grant

**Stale Text Edit Draft**:
A Text Edit Draft in the shared Stale Custom Field Edit Draft state.
_Avoid_: Last Writer Wins, invalid Text value, automatically rebased draft

**Unsaved Text Changes Gate**:
A Text-specific projection inside the shared Unsaved Custom Field Changes Gate,
not an independent navigation decision.
_Avoid_: Automatic save on navigation, silent draft discard, validation dialog

**Protected Text Draft Recovery Journal**:
A Text record class within the Protected Custom Field Draft Recovery Journal.
_Avoid_: Custom Field Value history, Library Control Directory, plaintext draft cache

**Recovered Text Edit Draft**:
A Text-typed Recovered Custom Field Edit Draft awaiting current Text validation
and explicit user action.
_Avoid_: Auto-saved value, restored Custom Field Value, startup auto-commit

**Text Edit Undo Step**:
A single-field Text-typed Custom Field Edit Undo Step in the shared
active-library session stack; a cross-type compound step is not split into
separate Text and non-Text steps.
_Avoid_: Keystroke history, Conflict Resolution Undo, Custom Field Value revision

**Text Edit Undo Stack**:
The Text-filtered view of the shared Custom Field Edit Undo Stack, never a
parallel global stack.
_Avoid_: Separate Text shortcut owner, portable undo log, metadata version history

**Batch Text Edit Plan**:
A reviewed frozen multi-selection plan binding one Text field, exact owners,
action parameters, rule revision and per-owner base revisions before per-owner
execution.
_Avoid_: Live selection edit, schema migration, renderer-side value loop

**Exact Literal Text Replacement**:
A case-sensitive replacement of every non-overlapping authoritative NFC
substring match from left to right, without regex, folding or normalization
comparison semantics.
_Avoid_: Portable Text Pattern Rule, normalized find, fuzzy replacement

**Treat Missing Text As Empty**:
An explicit Batch Text Edit Plan option that permits a deterministic
transformation to derive a result from Missing without storing an empty Text
sentinel.
_Avoid_: Default batch behavior, required value, implicit Missing conversion

**Batch Text Edit Operation Record**:
A durable library-bound active record of one frozen Batch Text Edit Plan,
member checkpoints and commit-effect identities without previous Text values.
_Avoid_: Text value history, portable batch backup, renderer task state

**Batch Text Undo Journal**:
Operating-system-protected device-local evidence containing the exact
before/after states and revisions required for operation-scoped Batch Text Undo.
_Avoid_: Custom Field Value history, portable undo log, ordinary cache

**Batch Text Terminal Marker**:
A value-free library-bound marker connecting one terminal Batch Text Edit to
the initiating device's outstanding journal disposition without granting Undo.
_Avoid_: Batch Text Edit Result, activity history, portable Undo evidence

**Keep Batch Text Recovery**:
The recommended Forget Library Registration choice that retains eligible Batch
Text Undo Journals as Dormant Batch Text Recovery without keeping registration.
_Avoid_: Keep library registered, portable recovery, continue batch

**Batch Text Edit Result**:
The lightweight terminal aggregate of one Batch Text Edit, separated from its
temporary device-local item detail and executable Undo evidence.
_Avoid_: Active operation record, previous-value snapshot, manual Text Undo step

**Clear Batch Text Edit Result And End Undo**:
An explicit terminal action that discloses remaining eligible Batch Text Undo,
then removes detailed result and device-local Undo evidence without changing a
current Custom Field Value.
_Avoid_: Clear cache, cancel remaining work, automatic retention expiry

**Execute Batch Text Edit Without Undo**:
A separately confirmed high-risk execution mode available after protected Undo
storage preflight blocks, with no recovery path for previous Text values.
_Avoid_: Silent fallback, remembered preference, automatic low-storage mode

**Custom Field Text Length Limit**:
The user-owned maximum number of Unicode extended grapheme clusters accepted by one Text Custom Field Definition under a portable versioned Unicode-data policy.
_Avoid_: Byte limit, UTF-16 code-unit limit, editor line count

**Custom Field Text Minimum Length**:
An optional lower bound on extended grapheme clusters for a present Text Custom Field Value that never turns a Missing value into invalid or required metadata.
_Avoid_: Required field, byte minimum, automatic padding

**Portable Text Pattern Rule**:
An optional library-owned Text validation expression with versioned Unicode semantics and guaranteed linear-time evaluation independent of operating-system or plugin regex engines.
_Avoid_: Native regex string, search query, executable script

**Text Pattern Match Mode**:
The explicit choice to apply one Portable Text Pattern Rule to the Entire Value or to accept a matching contained substring.
_Avoid_: Implicit anchoring, locale preference, search mode

**Portable Text Pattern Options**:
The stored case-sensitivity, multiline-anchor and dot-all choices that complete one Portable Text Pattern Rule without inheriting ambient regex defaults.
_Avoid_: Device regex flags, plugin preference, display setting

**Case-Insensitive Pattern Matching**:
The locale-independent Unicode simple-case-folding option for a Portable Text Pattern Rule, distinct from full-folding name-collision comparison.
_Avoid_: Operating-system locale casing, Custom Field Name Comparison Policy, stored-text rewrite

**Duplicate Text Value Finding**:
A dynamic advisory filter grouping of current Candidate or Design Asset Text values that share one derived key for an exact Custom Field Definition and selected query scope, without a Review Signal resolution lifecycle.
_Avoid_: Unique constraint, Duplicate Signal, ignored duplicate state

**Duplicate Text Comparison Mode**:
The user-selected Exact, Case-Insensitive or Normalized policy used only to derive Duplicate Text Value Finding groups without rewriting authoritative values.
_Avoid_: Custom Field Validation Rule, search ranking, automatic normalization

**Duplicate Text Comparison Key**:
A rebuildable version-bound derived form used to group present Text values under one Duplicate Text Comparison Mode without replacing or validating the authoritative value.
_Avoid_: Stored Text value, uniqueness index, lexical search token

**Case-Insensitive Duplicate Text Comparison**:
The duplicate-grouping mode that applies locale-independent Unicode full case folding plus NFC while preserving whitespace, diacritics and valid formatting in the comparison input.
_Avoid_: Pattern simple folding, name edge trimming, stored lowercase value

**Normalized Duplicate Text Comparison**:
The duplicate-grouping mode that applies versioned Unicode compatibility case folding plus edge-trimmed collapsed Unicode whitespace without additionally stripping diacritics or punctuation.
_Avoid_: Search normalization, automatic metadata cleanup, fuzzy similarity

**Duplicate Text Evaluation Scope**:
The explicit query, owner-type and lifecycle population filtered before present Text values are grouped, defaulting library-wide to Active Candidates and non-deleted Design Assets.
_Avoid_: Global uniqueness scope, Candidate History, implicit Include Deleted

**Duplicate Text Comparison Panel**:
A read-only cross-owner view of every current in-scope occurrence and original form in one Duplicate Text Value Finding without combining Candidate and Design Asset actions or identities.
_Avoid_: Merge dialog, cross-lifecycle batch editor, uniqueness conflict

**Duplicate Text Finding Session**:
A bounded open Duplicate Text Value Finding view bound to one complete result generation while later library changes remain available only through explicit refresh.
_Avoid_: Live-mutating group, saved result snapshot, durable duplicate membership

**Missing Custom Field Value State**:
The absence of a current value for one Custom Field Definition on an Asset Candidate or Design Asset, including after a Text field is cleared or normalizes to zero length, without making the owner incomplete.
_Avoid_: Stored empty string, Out-of-Constraint value, field deletion

**Whitespace-Only Custom Field Text**:
A present non-empty Text Custom Field Value containing preserved whitespace or line breaks but no non-whitespace content, kept distinct from Missing even when it produces no lexical search token.
_Avoid_: Empty string, trimmed value, Missing Custom Field Value State

**Text Custom Field Filter Operator**:
One explicit presence, content-comparison, grapheme-length, portable-pattern, validation-state or duplicate-grouping condition applied to an exact Text Custom Field Definition.
_Avoid_: Lexical search token, implicit database comparison, field validation rule

**Text Filter Comparison Mode**:
The explicit Exact, Case-Insensitive or Normalized transform policy used by an ordinary Text filter condition without creating a Duplicate Text Comparison Key or rewriting authoritative Text.
_Avoid_: Duplicate Text Comparison Mode, search normalization, operating-system collation

**Text Custom Field Sort**:
An explicit ordering of owners by one exact Text Custom Field Definition, direction and versioned Natural or Exact Unicode mode without changing result membership.
_Avoid_: Search rank, lexical token order, validation priority

**Natural Text Sort**:
A numeric-aware Unicode ordering bound to one explicit language/tailoring and policy version so human-readable sequences remain reproducible across supported devices.
_Avoid_: Current operating-system collation, filename natural sort, normalized filter equality

**Distinct Text Value Browser**:
An on-demand generation-bound view of complete paged comparison groups and original Text forms for one exact field and query scope, used only to create ordinary filter conditions.
_Avoid_: Automatic full facet, Select option editor, saved value snapshot

**Interoperability-Unsafe Text Code Point**:
An ill-formed or prohibited control value that cannot enter a new Text Custom Field Value because it can disrupt portable storage, display or interchange.
_Avoid_: Valid invisible formatting, ordinary whitespace, search stop word

**Invisible Text Format Warning**:
A non-blocking disclosure that a Text Custom Field Value contains preserved valid Unicode formatting or zero-width content that the editor can reveal without rewriting it.
_Avoid_: Validation failure, automatic cleanup, unsafe-control error

**Custom Field Validation Rule**:
A user-owned constraint on values accepted by one Custom Field Definition without granting authority to rewrite retained values when the rule changes.
_Avoid_: Custom Field Type, display preference, automatic cleanup rule

**Restrictive Custom Field Validation Change**:
A proposed rule change that may reject a current value or unresolved suggestion and therefore requires impact review before becoming active.
_Avoid_: Proven rule relaxation, type migration, silent schema edit

**Out-of-Constraint Custom Field Value**:
A preserved authoritative value that was valid when committed but does not satisfy its definition's current validation rule, remaining searchable, filterable and exportable with a visible marker.
_Avoid_: Corrupted value, missing value, Unconvertible Custom Field Value

**Custom Field Constraint Revalidation Task**:
A durable library-bound progressive classification of retained values, suggestions and affected mappings against one exact active validation-rule revision.
_Avoid_: Value migration, automatic repair, interactive single-value validation

**Partial Custom Field Constraint Validation Coverage**:
The truthful state while a restrictive rule's retained scope is not fully revalidated, distinguishing completed valid/out-of-constraint outcomes from unchecked Unknown owners.
_Avoid_: All values valid, migration coverage, hidden background status

**Promotion Custom Field Revalidation**:
The synchronous pre-commit check of each Candidate Custom Field Value against the current definition identity, type and validation-rule revision without depending on background coverage.
_Avoid_: Constraint revalidation task, automatic value repair, stale preview validation

**Exact Custom Field Number**:
A finite base-10 Number value in the portable Decimal128-equivalent domain, preserving up to 34 significant digits for exact equality, ordering, ranges and round-trip behavior.
_Avoid_: Binary floating-point value, formatted number string, approximate measurement

**Custom Field Number Range Constraint**:
An optional inclusive exact minimum and/or maximum that a Number value must satisfy in addition to the portable Number domain.
_Avoid_: Display slider range, silent clamp, unit conversion

**Custom Field Number Display Precision**:
A portable field-level choice of Automatic Exact, Fixed Decimal Places or
Significant Digits for rendering without reducing or rewriting stored precision.
_Avoid_: Stored scale, rounding permission, numeric identity

**Custom Field Number Grouping Display**:
A portable Auto, On or Off preference for locale-appropriate ordinary-decimal
digit grouping without storing separators or changing numeric identity.
_Avoid_: Number Input Locale, stored formatting, thousands-unit conversion

**Custom Field Number Unit Label**:
Optional presentation metadata shown beside Number values without defining conversion, measurement-system or automatic reinterpretation behavior.
_Avoid_: Unit-conversion rule, source metadata mapping, separate Number type

**Number Input Locale**:
The visible device-local parsing context for manual Number entry, selecting
numeric digits and separators without becoming portable field or value meaning.
_Avoid_: Display locale, import conversion rule, Custom Field Number Unit Label

**Number Edit Draft**:
A Number-typed Custom Field Edit Draft preserving its original literal, input
locale and invalid, ambiguous or uniquely parsed exact-value status.
_Avoid_: Exact Custom Field Number, formatted display string, binary-float input

**Ambiguous Number Input**:
A Number Edit Draft whose literal has multiple valid locale/canonical parses
that yield different exact values and therefore cannot commit until corrected.
_Avoid_: Best-effort locale guess, first successful parse, Number type conversion

**Formatted Number Approximation**:
A `≈`-marked Number rendering whose exact-decimal display rounding differs
numerically from the authoritative Exact Custom Field Number.
_Avoid_: Rounded stored value, exact Number display, implicit precision loss

**Scientific Number Display Fallback**:
A visibly identified bounded scientific rendering of the current Number
display result used when its requested inline formatting cannot fit.
_Avoid_: Scientific field setting, changed Number value, silent truncation

**Number Display Detail**:
A read-only review showing both the complete requested Number formatting and
the authoritative Exact Custom Field Number when inline presentation is bounded.
_Avoid_: Number editor, formatted-value history, rounded stored value

**Known-Instant Custom Field DateTime**:
A DateTime value with preserved local calendar/clock components, explicit UTC offset, resolved UTC instant and an optional portable IANA time-zone identifier.
_Avoid_: Unzoned local time, current-device time, formatted timestamp string

**Unzoned Custom Field DateTime**:
A DateTime value whose local calendar/clock components are known but whose offset and absolute instant are explicitly unknown.
_Avoid_: UTC value, device-local instant, Date-only value

**Custom Field DateTime Comparison Mode**:
The explicit query choice between UTC-instant comparison for Known-Instant values and local-component comparison for Unzoned values without silently mixing both onto one timeline.
_Avoid_: Automatic timezone assumption, formatted-text sorting, cross-state implicit range

**Assign Time Zone To Custom Field DateTime**:
An explicit edit or reviewed conversion that resolves an Unzoned DateTime through a declared UTC offset or IANA zone, including exact daylight-saving ambiguity resolution when required.
_Avoid_: Display-zone change, device-zone default, DateTime formatting

**Custom Field DateTime Fractional Precision**:
The declared count of zero through nine source-significant fractional-second digits retained for DateTime display and evidence while temporal comparison uses the exact nanosecond value.
_Avoid_: Display-only decimal places, invented trailing zeros, timezone precision

**Custom Field DateTime Precision Conflict**:
The blocking state for a DateTime source above nine fractional-second digits until a reviewed rounding or truncation rule produces a valid nanosecond-precision value.
_Avoid_: Automatic shortening, display rounding, timezone conflict

**Custom Field Select Option**:
A library-owned stable-identity child of one Single Select or Multi Select Custom Field Definition whose label and order are presentation rather than value identity and whose active label is unique only among options of that definition.
_Avoid_: Option label string, tag, Custom Field Definition

**Custom Field Option Restore Label Conflict**:
The blocking conflict where an archived Select option cannot become active because another active option in the same Custom Field Definition has a colliding label under the portable name comparison policy.
_Avoid_: Automatic suffix, name-based merge, cross-field option conflict

**Archive Custom Field Select Option**:
The reversible removal path that blocks new assignment while retaining the option identity on existing values, suggestions, queries and portable library state.
_Avoid_: Permanent option delete, rename option, clear existing values

**Permanent Delete Custom Field Select Option**:
The impact-reviewed irreversible removal of one Select option identity from its definition, current values, unresolved suggestions and executable projections without deleting the owning field.
_Avoid_: Archive option, delete Custom Field, merge option

**Custom Field Option Dependency Reference**:
A durable reference from a Select criterion or mapping to the exact Custom Field Definition and Select option identities instead of their display labels.
_Avoid_: Option-label match, field-only reference, copied option text

**Missing Custom Field Option Reference**:
The dependency placeholder left after permanent option deletion that preserves which exact option identity is unavailable and blocks the affected criterion or mapping until explicit repair.
_Avoid_: Archived option, empty-value condition, automatic label remap

**Custom Field Option Merge**:
An explicitly reviewed consolidation from one Select option identity to another active option in the same definition across values, suggestions and compatible dependencies, with per-owner results and no label-based inference.
_Avoid_: Rename option, automatic deduplication, cross-field mapping

**Custom Field Option Maintenance Task**:
A durable library-bound execution of one confirmed Select-option merge or permanent-deletion plan through independent owner and dependency outcomes.
_Avoid_: Instant schema edit, type migration, temporary impact preview

**Custom Field Option Deletion In Progress**:
The non-cancellable state after one permanent option deletion has made its first irreversible removal but before all retained references are resolved and the option identity can be finalized as deleted.
_Avoid_: Archived option, completed deletion, cancellable preview

**Custom Field Option Merge Undo Window**:
The user-configurable period, 30 days by default after explicit merge-result review and source-lifecycle confirmation, during which unchanged merge effects remain eligible for bounded Undo with their complete result evidence.
_Avoid_: Permanent history, reverse name match, deletion Undo

**Undo Custom Field Option Merge**:
A bounded reversal that restores only unchanged option-identity replacements and eligible source lifecycle without deleting the target option or overwriting later edits.
_Avoid_: Rename option, restore permanent deletion, whole-library rollback

**Empty Custom Field Definition**:
An active Custom Field Definition with no current Candidate or Design Asset values, unresolved AI suggestions, or Custom Field Dependency References, making an identity-preserving type change possible without reinterpreting existing use.
_Avoid_: Field with only missing values, archived field, unused display name

**Custom Field Type Migration**:
A user-reviewed transition that creates a new target Custom Field Definition identity, converts only proven compatible values and normally archives the used source field instead of retyping it in place.
_Avoid_: Rename Custom Field, in-place coercion, automatic remapping

**Custom Field Type Migration Preview**:
A pre-commit comparison of convertible and unconvertible source values plus dependent Saved Searches, User Smart Filters and Import Mapping Presets requiring explicit repair for one Custom Field Type Migration.
_Avoid_: Import preview, migration success result, automatic conversion

**Lossless Custom Field Conversion**:
A Custom Field Type Migration conversion with one unique valid target value that preserves the complete source meaning without format, precision, timezone or option-choice assumptions.
_Avoid_: Best-effort parsing, display-string conversion, lossy coercion

**Rule-Governed Custom Field Conversion**:
A potentially lossy or interpretive Custom Field Type Migration conversion allowed only after the user selects an explicit rule and reviews its before/after examples and impact.
_Avoid_: Operating-system default, implicit locale parsing, automatic fallback

**Unconvertible Custom Field Value**:
A source value that is ambiguous, violates the selected conversion rule or cannot form a valid target value and therefore remains preserved on the source field.
_Avoid_: Missing value, cleared value, default target value

**Complete Custom Field Conversion Matrix**:
The target capability in which every one of the 56 directed source-to-different-target pairs among the eight core Custom Field Types has a lossless, rule-governed or manual validated migration path.
_Avoid_: Initial-release subset, implicit Text bridge, forced automatic conversion

**Manual Custom Field Conversion Mapping**:
A host-validated Custom Field Type Migration path that assigns explicit target values through structured batch conditions, distinct-value mappings and per-item overrides when no adequate general conversion rule exists.
_Avoid_: Formula field, plugin code, best-effort parser

**Distinct-Value Mapping**:
One explicit migration mapping from a distinct source Custom Field Value to a target-type-valid value for every matching item without a Per-Item Conversion Override.
_Avoid_: Display-label guess, global field mapping, Per-Item Conversion Override

**Per-Item Conversion Override**:
An explicit migration target value for one Candidate or Design Asset that takes precedence over a broader conversion rule or Distinct-Value Mapping without changing the source value.
_Avoid_: Current Custom Field Value edit, automatic exception, reusable formula

**Custom Field Conversion Preset**:
A named library-owned portable intent for one source/target Custom Field Type pair that retains explicitly selected semantic rules and opted-in Distinct-Value Mappings without field identity, item scope, Per-Item Conversion Overrides or execution authority.
_Avoid_: Saved migration task, personal preset, automatic conversion rule

**Custom Field Migration Task**:
A durable library-bound execution of one confirmed Custom Field Type Migration plan across its requested Candidate and Design Asset owners through independent item commits.
_Avoid_: Schema edit transaction, import task, temporary preview

**Custom Field Schema Maintenance Task**:
A Custom Field Migration Task, Custom Field Option Maintenance Task or Custom Field Constraint Revalidation Task admitted through the library's shared schema-maintenance scheduling and safety boundary.
_Avoid_: Interactive field edit, AI analysis task, asset-file operation

**Custom Field Schema Maintenance Lane**:
The single cooperative per-library admission lane that runs at most one Custom Field Schema Maintenance Task and serializes its item writes while yielding between atomic boundaries to interactive work and safety pressure.
_Avoid_: Whole-library transaction, concurrent schema-maintenance writers, foreground lock

**Custom Field Maintenance Performance Profile**:
The device-local foreground/background admission preference for Custom Field Schema Maintenance preparation and future item work, subordinate to interaction responsiveness and every hard resource or correctness guard.
_Avoid_: Guaranteed CPU percentage, task order, database transaction size

**Custom Field Maintenance Safe Capacity**:
The current host-proven upper bound on parallel task-appropriate preparation after resource and responsiveness evidence, without increasing the single serialized item-write lane.
_Avoid_: CPU percentage, database writer count, guaranteed throughput

**Custom Field Maintenance Memory Reserve**:
The device-local physical-memory headroom percentage preserved by Full Speed maintenance admission, defaulting to 20% within a validated 10%–50% user range while remaining subordinate to live pressure.
_Avoid_: Fixed RAM allocation, cache quota, correctness override

**Custom Field Maintenance Responsiveness Guard**:
The fixed cross-platform interaction, grid-frame, freeze and pause-feedback acceptance boundary that reduces future schema-maintenance admission before throughput can make the application unresponsive.
_Avoid_: Completion-time promise, user performance preference, forced task termination

**Custom Field Maintenance Performance Reference Device**:
A standardized non-minimum macOS or Windows hardware profile used to validate 100,000-owner schema-maintenance responsiveness separately from supported-system requirements.
_Avoid_: Minimum supported device, recommended workstation, throughput guarantee

**Pause Custom Field Schema Maintenance Task**:
The task-scoped request that makes one maintenance task ineligible after its current item settles while allowing the next eligible queued task to use the maintenance lane.
_Avoid_: Pause all maintenance, cancel task, force-stop item commit

**Pause All Custom Field Schema Maintenance**:
The library-lane request that stops all future Custom Field Schema Maintenance Task item admission after the current item settles without changing each task's individual paused state.
_Avoid_: Pause one task, background performance profile, cancel queue

**Custom Field Migration Item Commit**:
The atomic owner-scoped boundary that persists one validated migrated target value when one exists and that item's truthful task outcome together.
_Avoid_: Whole-library transaction, preview result, batch overwrite

**Custom Field Migration In Progress**:
The truthful target-field state while at least one requested item remains non-terminal, while still showing current committed, failed, conflicting, unconvertible and remaining counts.
_Avoid_: Completed migration, partially hidden field, background progress only

**Partial Custom Field Migration Coverage**:
The truthful query state of a target Custom Field Definition while its migration still has a non-terminal requested item, exposing that only committed target values participate and that other requested owners are not represented by inferred values.
_Avoid_: Complete result set, source-field fallback, query-time conversion

**Custom Field Migration Conflict Review**:
The item-scoped review for source evidence or target value changed after migration preview, preserving the newer state instead of overwriting it with the planned conversion.
_Avoid_: Conversion failure, Last Writer Wins, automatic retry

**Custom Field Migration Result**:
The terminal summary of converted, retained-unconvertible, conflicting and failed requested items shown before any confirmed source-field archive decision.
_Avoid_: Migration preview, progress counter, automatic archive

**Custom Field Migration Result Acknowledgement**:
The explicit completion of terminal result review through a user choice to archive the source field or keep it active, starting the shared result-retention and Undo window without implying every exception was repaired.
_Avoid_: Open result detail, task completion, dismiss notification

**Custom Field Migration Undo Window**:
The user-configurable period, 30 days by default after Custom Field Migration Result Acknowledgement, during which unchanged migration-created target values remain eligible for bounded Undo together with the complete result evidence.
_Avoid_: Permanent version history, reverse migration, activity attention

**Undo Custom Field Migration**:
A bounded reversal that removes only unchanged migration-created target values and restores the source field's prior lifecycle state without deleting later edits or the target definition.
_Avoid_: Reverse conversion, delete target field, restore overwritten value

**Custom Field Value**:
A value attached to an Asset Candidate or Design Asset that conforms to one Custom Field Definition and remains authoritative portable library metadata.
_Avoid_: AI suggestion, source-file metadata, device-only cache

**AI Value Suggestions**:
A default-off user-owned Custom Field Definition setting that permits admitted AI/analysis providers to propose values for that exact field without granting confirmation, overwrite, backfill, provider or schema authority.
_Avoid_: Automatic field population, model permission, auto-confirm rule

**Custom Field Value Suggestion**:
A non-authoritative type-valid proposed value bound to one Candidate/Design Asset, Custom Field Definition, source generation and provider/model/recipe provenance until explicitly accepted, edited, rejected or deleted.
_Avoid_: Custom Field Value, field definition proposal, automatic metadata write

**Archive Custom Field**:
The ordinary reversible removal of a Custom Field Definition from active input and discovery surfaces while retaining its identity, values and unresolved suggestions as portable library state.
_Avoid_: Hide field, delete field data, disable plugin

**Permanent Delete Custom Field**:
The separately confirmed irreversible removal of one Custom Field Definition, all of its Candidate/Design Asset values and unresolved suggestions, and its active search projections after impact review.
_Avoid_: Archive Custom Field, delete asset, clear one value

**Custom Field Deletion Impact Review**:
A trusted pre-delete summary of the Candidates, Design Assets, current values and unresolved suggestions affected by permanently deleting one Custom Field Definition.
_Avoid_: Generic confirmation dialog, asset deletion review, automatic cleanup

**Custom Field Dependency Reference**:
A durable reference from a Saved Search, User Smart Filter, or Import Mapping Preset to the stable identity of one exact Custom Field Definition rather than its display name.
_Avoid_: Field-name lookup, copied field definition, inferred mapping

**Archived Custom Field Reference**:
A preserved Custom Field Dependency Reference whose exact definition still exists but is archived, keeping its dependent object inactive until that identity is restored or explicitly repaired.
_Avoid_: Missing Custom Field Reference, active filter criterion, deleted dependency

**Missing Custom Field Reference**:
A non-schema placeholder showing that a Custom Field Dependency Reference no longer resolves after permanent deletion and requires explicit removal or compatible remapping.
_Avoid_: Archived Custom Field Reference, recovered field definition, automatic name match

**Custom Field Value Transfer**:
The transactional reassociation of current conforming or Out-of-Constraint Custom Field Values from an Asset Candidate to the resulting Design Asset during Candidate Promotion without keeping two current owners.
_Avoid_: New metadata assignment, Candidate History snapshot, automatic type conversion

**System Collection**:
A built-in asset collection owned by the application for product workflows and protected from normal deletion while still presenting as a collection to the user.
_Avoid_: Locked folder, hidden folder, special case

**Collection Suggestion**:
A proposed target asset collection for candidate promotion, derived from capture context, source, rules, or user workspace context.
_Avoid_: Auto folder, category prediction, forced collection

**Unsorted Collection**:
The neutral fallback asset collection for valid Design Assets when no explicit, suggested, mapped, or rule-assigned Collection Membership is available, without creating review attention or a filing obligation.
_Avoid_: Misc folder, uncategorized files, orphan assets, mandatory backlog

**Collection Group**:
A user-facing grouping used to organize asset collections in navigation or hierarchy.
_Avoid_: Asset Category, physical folder, tag group

**Collection Membership**:
The relationship that places an asset candidate or design asset in an asset collection.
_Avoid_: File copy, file placement, category selection

**Collection Board**:
A visual presentation of an asset collection for project review, moodboards, inspiration boards, and creative comparison.
_Avoid_: Asset Library, physical folder, collection database

**Asset Source**:
The origin context of a design asset, such as a referenced source tree, source site, source page, original URL, or browser page title.
_Avoid_: Referrer, import note

**Source Tree**:
The non-mutating navigation projection of a referenced source's current folder hierarchy, placing a Referenced Compound Original once at its primary member location for provenance and browsing without becoming Collection Membership.
_Avoid_: Collection tree, file-operation gesture, live collection synchronization

**Source Scope**:
The visible current Asset Grid scope selected from one referenced source or Source Tree node without creating a Collection Membership or saved filter.
_Avoid_: Asset Collection, Smart Filter, hidden path filter

**Folder Collection Mapping**:
An explicit one-time translation of a reviewed source-folder scope into proposed or committed Collection Groups, Asset Collections, and Collection Memberships.
_Avoid_: Two-way folder sync, automatic folder ownership, permanent directory binding

**Folder Collection Mapping Intent**:
A candidate-bound collection target proposed from a confirmed Copy Into Library folder mapping and materialized only when a corresponding Candidate is promoted.
_Avoid_: Existing Collection Membership, physical folder mirror, empty collection precreation

**Folder Mapping Conflict Review**:
A reviewed resolution of a proposed folder-derived collection node against current library organization through explicit reuse, an explicit unique name, or skipping the affected mapping.
_Avoid_: Automatic name merge, silent suffix, Copy Into Library failure

**Source Site**:
A configured website or service from which assets can be searched, browsed, captured, or downloaded.
_Avoid_: Provider, platform, domain

**Capture Method**:
The way an asset entered the library, such as browser capture, direct save, or download workflow.
_Avoid_: Import type, acquisition mode

**Asset Candidate**:
A captured item held in the capture inbox before the user confirms it into the asset library.
_Avoid_: Temporary file, pending download, uncommitted asset

**Active Candidate**:
An Asset Candidate that remains available in active Capture Inbox review workflows.
_Avoid_: Promoted candidate record, design asset, download item

**Candidate Artifact**:
The source-preserving single original or Compound Original held for an Asset Candidate before Candidate Promotion or cleanup.
_Avoid_: Design asset file, metadata record, thumbnail

**Candidate Identity**:
The review identity of an Asset Candidate while it belongs to Capture Inbox workflows.
_Avoid_: Design asset identity, file identity, temporary filename

**Candidate Record**:
The durable domain record that carries Candidate Identity and review lifecycle independently from its Candidate Artifact and Download Task.
_Avoid_: Download record, temporary asset row, cache entry

**Candidate Intake**:
The persisted pre-activation state that begins when Capture Gateway accepts a Capture Envelope and creates Candidate Identity, while the original Candidate Artifact is still being acquired or validated.
_Avoid_: Active candidate, Capture Inbox card, pending download identity

**Candidate Activation**:
The lifecycle transition that occurs after the complete Candidate Artifact is safely committed and passes basic validation, making the record an Active Candidate, exposing it in Capture Inbox, and starting Candidate Retention Policy timing.
_Avoid_: Candidate identity creation, download completion alone, candidate promotion

**Acquisition Failure**:
A pre-activation outcome that preserves Candidate Identity and the artifact-acquisition failure reason for retry or recovery without exposing a broken candidate in the Capture Inbox main grid or starting retention.
_Avoid_: Rejected candidate, expired candidate, broken asset card

**Design Asset Identity**:
The library identity of a confirmed Design Asset after Candidate Promotion.
_Avoid_: Candidate identity, source URL, file identity

**Asset File Ownership**:
The lifecycle responsibility for an Original Asset: library-managed for a Candidate Artifact or Managed Asset, or user-managed at an external source for a Referenced Asset.
_Avoid_: Trace metadata, collection membership, source URL, filesystem possession alone

**Candidate Promotion**:
The user-confirmed transition that turns an asset candidate into a design asset while preserving the captured original, analysis output, source context, tag state, and chosen collection memberships.
_Avoid_: Re-download, re-import, final download

**Promotion Link**:
The trace relationship connecting a promoted Design Asset to its original Asset Candidate, Asset Source, and Capture Batch.
_Avoid_: Shared identity, duplicate record, file path link

**Trace Metadata**:
The non-file evidence that preserves where a candidate or design asset came from, how it was captured, and how it was promoted.
_Avoid_: Candidate artifact, duplicate file copy, original asset

**Promoted Candidate Record**:
The historical candidate record left after Candidate Promotion for traceability without remaining active review work.
_Avoid_: Active candidate, duplicate design asset, hidden candidate

**Candidate History**:
A history access surface for past candidate states after candidates leave active Capture Inbox review.
_Avoid_: Capture Inbox, activity feed, current review queue

**Required Review**:
An unresolved candidate condition that prevents Quick Promote until the user explicitly reviews it, such as a proven active-library identity conflict, an explicit target-collection conflict, or an ownership/integrity conflict. Generic Duplicate Signals, low-confidence or unavailable AI suggestions, and the absence of a more specific collection target are non-blocking by themselves.
_Avoid_: Error, warning badge, blocked download

**Promotion Blocking Conflict**:
An unresolved Metadata Conflict that prevents Quick Promote or default Batch Promotion because it affects promotion correctness.
_Avoid_: Non-blocking conflict, low-risk metadata conflict, conflict badge

**Non-Blocking Conflict**:
An unresolved Metadata Conflict that can remain attached after promotion without making the confirmed Design Asset unsafe.
_Avoid_: Promotion blocking conflict, ignored conflict, resolved conflict

**Promotion Readiness**:
The candidate state that determines whether Quick Promote or Batch Promotion can proceed.
_Avoid_: Download readiness, review status, batch eligibility

**Post-Promotion Conflict Carryover**:
The continuation of Non-Blocking Conflict attention from an Asset Candidate to its promoted Design Asset.
_Avoid_: Conflict resolution, promotion failure, hidden conflict

**Asset Conflict Carryover Badge**:
A lightweight Design Asset marker showing unresolved Non-Blocking Conflict carried over from Candidate Promotion.
_Avoid_: Candidate state badge, activity attention badge, duplicate signal

**Asset Inspector Conflict Section**:
The Asset Inspector area for reviewing and resolving carried-over asset metadata conflicts.
_Avoid_: Candidate review page, batch result detail, audit log

**Library Conflict Smart Filter**:
A System Smart Filter for Design Assets with unresolved Post-Promotion Conflict Carryover.
_Avoid_: User smart filter, capture inbox activity panel, conflict history

**Carryover Resolution**:
The asset-level flow for resolving a Non-Blocking Conflict after Candidate Promotion.
_Avoid_: Candidate promotion, conflict reopen, batch retry

**Carryover Resolution Link**:
A trace link from a Carryover Resolution on a Design Asset back to the original Candidate History.
_Avoid_: Metadata copy, promotion link replacement, asset version

**Candidate Trace Update**:
A lightweight Candidate History note that a carried-over conflict was resolved from the promoted Design Asset.
_Avoid_: Asset metadata update, full conflict history, version record

**Asset-Only Resolution**:
A Carryover Resolution that changes only the Design Asset's current metadata while leaving Candidate History as trace evidence.
_Avoid_: Candidate rewrite, promotion reversal, duplicate metadata

**Trace Consistency**:
The product rule that Candidate History and Design Asset history can explain how a carried-over conflict was resolved without duplicating current metadata.
_Avoid_: Full audit trail, metadata mirroring, version history

**Promotion Sheet**:
A candidate-level confirmation surface for resolving Required Review and final promotion details before Candidate Promotion.
_Avoid_: Import dialog, metadata modal, folder picker

**Quick Promote**:
A Candidate Promotion that uses confirmed or default candidate details without opening the Promotion Sheet.
_Avoid_: Auto import, silent save, force promote

**Promotion Feedback**:
A post-promotion confirmation state that reports promoted candidates, target collections, and follow-up actions without forcing navigation away from review.
_Avoid_: Success toast, notification, auto-open library

**Reveal in Library**:
A Promotion Feedback action that opens or locates a promoted design asset in its target Asset Collection.
_Avoid_: Forced navigation, open folder, locate file

**Undo Promote**:
A short-lived post-promotion action that reverses a recent Candidate Promotion and returns the promoted item to Capture Inbox review.
_Avoid_: Restore, reject, hard delete

**Promotion Reversal**:
The candidate-level outcome of Undo Promote, returning a recently promoted design asset back to Capture Inbox review.
_Avoid_: Asset deletion, version rollback, restore from cleanup

**Promotion Snapshot**:
The promotion-time candidate context used to support short-lived Promotion Reversal without turning Candidate Promotion into long-term version history.
_Avoid_: Version history, backup copy, audit log

**Stay-in-Review Flow**:
A promotion workflow where Candidate Review Page remains active after Candidate Promotion so the user can continue reviewing candidates.
_Avoid_: Auto-open library, forced navigation, capture exit

**Thumbnail**:
A lightweight preview representation of a design asset used for browsing and selection.
_Avoid_: Preview file, card image

**Normalized Image**:
An image variant prepared for consistent downstream display or analysis while preserving the original asset separately.
_Avoid_: Converted image, processed image

**Original Asset**:
The source-preserving single file, Compound Original, or one-or-more referenced source relationships for an asset before normalization.
_Avoid_: Raw file, input file

**Compound Original**:
An Original Asset formed from one primary visual member and explicitly capability-declared companion members that share one asset ownership, content-generation, backup, and lifecycle boundary.
_Avoid_: Folder import, arbitrary adjacent files, multiple Design Assets

**Degraded Compound Original**:
A Compound Original whose primary and required members remain valid but an included optional companion is unavailable or invalid, permitting only capability-proven independent operations while complete Original Handoff remains unavailable.
_Avoid_: Complete original, Compound Original Recovery, silently removed companion

**Companion Original Member**:
A required or optional non-primary file whose role in a Compound Original is explicitly declared and validated by the primary format capability.
_Avoid_: Independent Asset Candidate, guessed sidecar, app-authored metadata

**Companion Attachment Candidate**:
A non-authoritative proposal that one explicitly identified file may fill a capability-declared companion role for an existing Original Asset.
_Avoid_: Automatically attached sidecar, filename match, current original member

**Attach Companion**:
An explicit capability-validated action that adds one Companion Attachment Candidate to an existing Original Asset's authoritative member manifest while keeping the same Design Asset.
_Avoid_: Automatic grouping, import as another asset, source-format conversion

**Remove Optional Companion**:
An explicit capability-validated action that removes one optional role from a Compound Original's authoritative member manifest while retaining the Design Asset and applying the ownership-specific disposition of the former member file.
_Avoid_: Remove required member, ignore sidecar, delete arbitrary file

**Keep Detached Copy**:
The default managed-companion removal disposition that byte-verifies an exact user-owned external copy before the library-owned member crosses its physical removal boundary.
_Avoid_: Compatible Export, backup, leave managed residue

**Optional Companion Removal Recovery**:
A group-scoped state entered when a managed optional companion has crossed its physical removal boundary but the remaining member manifest and new Source Content Generation are not yet proven committed or the prior group restored.
_Avoid_: Successful removal, automatic rollback, independent member recovery

**Source Content Generation**:
The validated current content identity of one Original Asset within a stable Design Asset; a material byte or authoritative member-manifest change creates a new generation without creating a new asset.
_Avoid_: File timestamp version, duplicate asset, automatic full-file history

**External Open Preference**:
A device-local choice of preferred external application for an Original Asset format, with the operating-system association as its fallback.
_Avoid_: Library setting, embedded editor, automatic best-app choice

**Original Handoff**:
An ordinary external reuse action that hands off the source-preserving Original Asset rather than a thumbnail, preview, or converted substitute; for a Compound Original it defaults to the complete member set with its declared layout intact.
_Avoid_: Preview drag, automatic export, compatible copy

**Asset Export Review**:
The pre-write review selecting Design Assets, one external destination and one source-exact or compatible export mode with truthful eligibility and size consequences.
_Avoid_: Original Handoff, Metadata Portability Export, Full Library Backup

**Original Asset Export**:
A destination-planned persistent copy of the exact current Original Asset bytes, including the complete declared Compound Original member set and layout.
_Avoid_: Original Handoff, primary-only copy, compatible conversion

**Asset Export Mode**:
The one task-wide semantic choice between source-exact Original Asset Export and rendered/converted Compatible Export.
_Avoid_: Per-item fallback, file extension choice, mixed fidelity task

**Compatible Export Metadata Policy**:
The one task-wide choice between Essential Technical Metadata, Preserve Compatible Source Metadata and Custom Compatible Export Metadata, resolved truthfully against each output capability.
_Avoid_: Original metadata writeback, preserve-all toggle, per-item silent fallback

**Essential Technical Metadata**:
The default minimum truthful color-profile, orientation, dimensions, resolution, bit-depth, alpha and format information required to interpret a compatible output correctly without descriptive or privacy-sensitive payloads.
_Avoid_: Metadata-free file, fabricated DPI, source metadata copy

**Custom Compatible Export Metadata**:
An explicit field/value selection for supported descriptive metadata written only into newly generated compatible outputs.
_Avoid_: Metadata writeback preset, automatic AI export, hidden private namespace

**Sensitive Source Metadata**:
GPS, device serial identifiers, face regions and similarly privacy-sensitive source values that always require separately visible export selection.
_Avoid_: Preserve-all implication, essential technical metadata, internal library identity

**Compatible Export Metadata Gap**:
A reviewed mismatch where a selected descriptive field cannot be faithfully embedded in the exact compatible target and must be removed, routed to a supported XMP companion or resolved by changing the target recipe.
_Avoid_: Silent metadata loss, encoder warning, technical-profile fallback

**Compatible Export XMP Companion**:
An explicitly selected standards-mapped user-owned XMP output carrying reviewed compatible metadata that the target media cannot embed faithfully.
_Avoid_: Companion Original Member, Metadata Portability Export, private application manifest

**XMP-Backed Compatible Export Unit**:
One complete multi-file compatible result whose reviewed media and XMP companions stage, validate and publish together.
_Avoid_: Independent sidecar export, Compound Original, single-file Save As

**Embedded-First Compatible Metadata Routing**:
The default placement rule that keeps essential technical information in compatible media, writes each supported descriptive field to the media only, and uses explicit XMP solely for remaining faithfully mapped gaps.
_Avoid_: Metadata mirror, sidecar-first export, duplicate-by-default

**Full XMP Metadata Mirror**:
An explicit advanced compatible-export choice that gives XMP the complete selected compatible descriptive set while duplicating media-embeddable fields from the same reviewed values.
_Avoid_: Copy all source metadata, metadata backup, maintained synchronization

**Compatible Export Preset**:
A named reusable Compatible Export recipe intent that stores no destination, item resolution, capability proof, sensitive-metadata consent or destination-mutation authority and always reopens full review.
_Avoid_: Saved export task, Source Rewrite Preset, preauthorized conversion

**Personal Compatible Export Preset**:
A device-local Compatible Export Preset available across libraries on that device without becoming portable library state.
_Avoid_: Library Compatible Export Preset, cloud preset, built-in preset

**Library Compatible Export Preset**:
A portable Compatible Export Preset owned by one library and protected by that library's Full Library Backup without carrying installed capability state.
_Avoid_: Personal Compatible Export Preset, plugin bundle, cross-library global preset

**Built-In Compatible Export Preset**:
An immutable product-provided Compatible Export Preset that must be copied into personal or library scope before user editing.
_Avoid_: Locked user preset, automatic export policy, mutable default

**Compatible Export Variant**:
One explicitly named compatible-output recipe independently resolved for every selected Design Asset without acting as a fallback for another recipe.
_Avoid_: Encoder fallback, format alias, source version

**Duplicate Compatible Export Recipe**:
A non-blocking review signal that two distinctly named Compatible Export Variants currently have semantically equivalent complete recipe intents while remaining independent outputs.
_Avoid_: Variant-name collision, byte-identity proof, automatic deduplication

**Intentional Duplicate Recipe Group**:
A composition- or task-local acknowledgement that one current group of equivalent Compatible Export recipes is deliberately kept as distinct variants without hiding output consequences or granting execution authority.
_Avoid_: Global duplicate ignore, deduplication exception, byte-identity promise

**Compatible Export Variant Set**:
The ordered task-wide collection of explicitly selected Compatible Export Variants reviewed as one asset-by-variant matrix.
_Avoid_: Preset, fallback chain, automatically inferred formats

**Compatible Export Planning Scale**:
The complete derived scope of asset-variant cells, placements, physical outputs and estimated bytes that governs planning safety instead of a simple variant-count limit.
_Avoid_: Fixed variant cap, visible-row count, sampled task size

**Progressive Compatible Export Planning**:
A cancellable pre-confirmation enumeration and review of complete Compatible Export Planning Scale in bounded increments without turning incomplete progress into execution authority.
_Avoid_: Sampled confirmation, streaming execution, hidden matrix tail

**Compatible Export Planning Evidence Drift**:
A source, recipe, capability or destination fact change that invalidates only the planning evidence dependent on that fact while leaving unrelated proven cells intact.
_Avoid_: Whole-plan restart, confirmed-task drift, stale-plan acceptance

**Compatible Export Planning Performance Reference Device**:
A standardized non-minimum hardware profile used to judge large-scale planning acceptance targets separately from supported-system requirements.
_Avoid_: Minimum supported device, installation requirement, consumer hardware recommendation

**Compatible Export Matrix Resolution**:
The task-local determination that every asset-variant is currently executable or explicitly excluded before Compatible Export confirmation.
_Avoid_: Silent unsupported skip, remembered exception rule, preset mutation

**Pre-Execution Compatible Export Exclusion**:
A reviewed task-local disposition that removes one asset-variant from the confirmed executable plan until explicit reinclusion while preserving its count and reason in the task summary.
_Avoid_: Export failure, unresolved unsupported cell, retry candidate

**Reinclude Compatible Export Exclusions**:
An explicit review action that removes selected currently supported pre-execution exclusions only after previewing the resulting output, capacity and conflict changes.
_Avoid_: Automatic capability reaction, include unsupported, preset edit

**Compatible Export Variant Priority**:
The stable visible order within a Compatible Export Variant Set that guides admission among currently eligible work without guaranteeing dispatch or completion sequence.
_Avoid_: Strict execution order, fallback order, collision winner

**Compatible Export Variant Set Preset**:
A named reusable flat ordered composition that owns snapshots of Compatible Export Variant recipe intents without live links or operation authority.
_Avoid_: Active Variant Set, nested composition, preset folder, fallback bundle

**Personal Compatible Export Variant Set Preset**:
A device-local Compatible Export Variant Set Preset available across libraries on that device without becoming portable library state.
_Avoid_: Library Variant Set Preset, synchronized composition, export history

**Library Compatible Export Variant Set Preset**:
A portable Compatible Export Variant Set Preset owned and backed up by one library without carrying current capability or execution evidence.
_Avoid_: Personal Variant Set Preset, plugin bundle, cross-library global composition

**Partial Variant Success**:
An aggregate Compatible Export outcome where at least one confirmed executable variant of a Design Asset succeeded and at least one other confirmed executable variant did not.
_Avoid_: Partial Placement Success, incomplete variant output, whole-asset success

**Skip Compatible Export Variant**:
An explicit conflict or eligibility outcome that excludes one Design Asset's complete selected variant and all of its placements without excluding that asset's other variants.
_Avoid_: Skip variant member, skip Design Asset, silent unsupported output

**Export Set Directory**:
A user-named, user-owned destination directory that has received at least one published result from a multi-file Asset Export task.
_Avoid_: Managed library directory, source-tree mirror, cache, backup

**Provisional Export Set Directory**:
An exclusively task-created empty export container that may be safely reclaimed only before any output is published and before it becomes an Export Set Directory.
_Avoid_: User-selected existing directory, staging directory, empty user folder

**Export Set Ownership Boundary**:
The first proven placement publication that permanently changes a Provisional Export Set Directory into an ordinary user-owned Export Set Directory.
_Avoid_: Directory creation, task completion, application uninstall

**Empty Export Set Directory Retained**:
A non-destructive result stating that an unused provisional root could not be proven safely removable and was therefore left at its location.
_Avoid_: Export success, cleanup retry, publication recovery

**Flat Asset Export Layout**:
The default shallow Export Set Directory layout that places single-file asset results at its root and gives Compound Originals or other multi-output assets dedicated subdirectories.
_Avoid_: Source-tree reconstruction, one folder per selected asset, collection projection

**Collection Asset Export Layout**:
An optional output layout projected from one explicitly selected Collection Group or Asset Collection scope without inventing primary membership or changing library organization.
_Avoid_: Automatic primary collection, synchronized collection folder, source hierarchy

**Asset Export Output Name**:
The final user-reviewed destination name of an exported file or containing asset directory, derived from mode-appropriate human provenance without becoming asset identity.
_Avoid_: Managed storage name, database identity, invisible final path

**Compatible Export Name**:
A human-readable output name derived from the Design Asset title or readable source fallback plus every required variant/visual-unit qualifier and the verified target extension.
_Avoid_: Original filename guarantee, database identifier, unqualified variant or unit label

**Export Name Normalization**:
A visible destination-safety transformation that preserves safe Unicode, discloses every changed proposed name and never independently renames a Compound Original member.
_Avoid_: Silent sanitization, collision suffix, transliteration

**Asset Export Destination Conflict Review**:
A visual pre-write decision surface for resolving occupied, same-plan, type or directory conflicts without silently overwriting, suffixing or merging outputs.
_Avoid_: Generic error dialog, last writer wins, automatic folder merge

**Publish Asset Export With Unique Name**:
The recommended non-destructive conflict outcome that publishes one complete affected Original asset or Compatible asset-variant result under a user-reviewed safe vacant name.
_Avoid_: Silent suffix, remembered naming rule, duplicate Design Asset

**Asset Export Unique Name**:
A user-reviewed conflict name formed by appending the smallest safe available parenthesized integer from 2 to an ordinary output stem or multi-file result's outer directory.
_Avoid_: Timestamp name, random identifier, silent suffix

**Skip Asset Export Item**:
An explicit conflict outcome that excludes one Design Asset's complete logical export result rather than publishing only some of its files, members or placements.
_Avoid_: Skip compound member, partial multi-unit export, export failure

**Replace Asset Export Destination**:
A separately confirmed ordinary-file conflict outcome that moves the exact destination occupant to operating-system trash before publishing a completely staged and verified export output.
_Avoid_: Overwrite, replace directory, automatic replacement

**Asset Export Replacement Recovery**:
The item-scoped state entered when an export destination occupant was proven moved to operating-system trash but the replacement output was not proven published.
_Avoid_: Successful export, automatic overwrite retry, Asset Trash

**Asset Export Operational State**:
Durable authority for an active, paused, conflict-blocked or recovery-required export that remains outside ordinary activity-history expiry until safely resolved.
_Avoid_: Export Activity Record, audit history, output manifest

**Asset Export Activity Record**:
A minimal device-local summary of one resolved Asset Export task, retained by outcome importance without containing source paths, content snapshots or exported files.
_Avoid_: Operational checkpoint, full audit log, replacement recovery receipt

**Asset Export Destination Locator**:
An expiring device-local reveal capability for a recorded export destination that is neither portable nor a promise to track externally moved output.
_Avoid_: Source path, library relationship, recovery receipt

**Asset Export Destination Replacement Receipt**:
Device-local Local File Recovery authority for the exact ordinary file displaced by a successful Replace Asset Export Destination action.
_Avoid_: Export Activity Record, system-trash index, exported-file backup

**Export Activity**:
The contextual Asset Workspace surface for recent and attention-requiring Asset Export results without becoming a permanent audit center.
_Avoid_: Local File Recovery, global log, output folder

**Asset Export Placement**:
One reviewed physical destination placement of a complete Original Asset Export result or Compatible Export asset-variant result, independently committed when Copy Per Membership explicitly requests several copies.
_Avoid_: Collection Membership, partial Compound output, duplicate Design Asset

**Asset Export Commit Unit**:
One complete Original asset placement or Compatible asset-variant placement that becomes ordinary user-owned output independently of later units.
_Avoid_: Whole Export Set transaction, individual Compound member, staging file

**Asset Export Staging**:
An attempt-owned destination-volume file or complete directory that is not an export result until fully validated and safely published to its reviewed final path.
_Avoid_: Preview cache, user output, source original

**Partial Placement Success**:
An aggregate Asset Export outcome where at least one explicitly requested placement of one Original asset or Compatible asset-variant succeeded and at least one other placement did not.
_Avoid_: Partial Compound Original, complete asset success, automatic rollback

**Pause Asset Export**:
An explicit safe-boundary request that stops new export placements while retaining only proven resumable staging for later reviewed continuation.
_Avoid_: Cancel remaining, background resume, rollback published output

**Cancel Remaining Asset Export**:
An explicit safe-boundary request that cancels unstarted placements and ends cancellable pre-publication work without reversing published outputs or dismissing recovery.
_Avoid_: Pause export, batch rollback, force-stop publication

**Asset Export Automatic Retry**:
At most two non-blocking delayed retries after the initial attempt for a classified transient, evidence-stable pre-publication failure of one placement without reserving execution capacity during backoff.
_Avoid_: Replacement retry, deterministic encode loop, retry after publication

**Media Processing Resource Gate**:
The host-owned admission and pressure boundary for compatible rendering/encoding work, separate from model execution while coordinated with shared system resources.
_Avoid_: Local AI Resource Governor, encoder-local concurrency, model installer

**Asset Export Concurrency Ceiling**:
The device-local Auto or manual upper bound on simultaneous Asset Export work, subordinate to current volume lanes, media-resource evidence and safe application responsiveness.
_Avoid_: Forced worker count, guaranteed parallelism, task priority

**Asset Export Responsiveness Guard**:
The measured interaction and rendering boundary that makes the backend reduce new export admission before foreground Asset Export work makes the application unresponsive.
_Avoid_: Subjective smoothness, export throughput target, forced task termination

**Background Asset Export Profile**:
The device-local Pause, Energy Saver, Balanced or Full Speed admission policy applied after the application remains outside the foreground, without overriding export safety gates.
_Avoid_: Forced CPU percentage, foreground concurrency ceiling, task priority

**Continue Asset Export After Closing The Window**:
A default-off device preference allowing already confirmed exports to continue under the selected Background Asset Export Profile while a discoverable application process remains active.
_Avoid_: Hidden daemon, explicit Quit override, launch-at-login permission

**Application Status Center**:
The single compact path-free status card anchored to the application's macOS menu-bar or Windows notification-area item, with independently controlled sections for active or attention-requiring long-running subsystems.
_Avoid_: Per-subsystem tray icons, system notification, miniature main window

**Safe Stop And Quit**:
The explicit application-wide quit action that stops new work admission, brings active units to governed safe boundaries, preserves reconciliation evidence and exits within a normal maximum total shutdown period of 30 seconds.
_Avoid_: Force quit control, finish entire queue, hidden post-quit worker

**Startup Reconciliation Isolation**:
The recovery boundary that keeps unaffected libraries and work available while holding only work that conflicts with an unresolved unit through a shared source, destination, physical-volume publication boundary or model runtime.
_Avoid_: Whole-application recovery lock, automatic rerun, guessed terminal outcome

**Startup Recovery Attention**:
The durable user-visible state for startup reconciliation that still requires acknowledgment or an owning recovery decision after automatic evidence checks finish.
_Avoid_: Startup modal, generic failure, authority to choose an unproven outcome

**Defer Startup Recovery Review**:
The presentation-only choice that closes or collapses startup recovery for the current session without resolving its attention, releasing its conflict isolation or changing its evidence.
_Avoid_: Ignore recovery, cancel affected work, clear recovery record

**Waiting For Recovery Evidence**:
The non-terminal recovery state used while an exact external volume, governed runtime or other required evidence source remains unavailable, preserving attention and isolation without treating absence as failure.
_Avoid_: Offline failure, expired recovery, assumed non-commit

**Startup Recovery Evidence**:
The minimal durable journal, receipt and necessary operation-owned staging that must remain available to reconcile an interrupted unit and is neither cache nor ordinary activity history.
_Avoid_: Preview cache, user backup, disposable temporary output

**Release Safely Rebuildable Recovery Staging**:
The explicit item-scoped storage action that removes only freshly proven unpublished, operation-owned and outcome-unnecessary staging while retaining reconciliation evidence and leaving the work safely paused for full reprocessing.
_Avoid_: Cache cleanup, abandon recovery, delete published output

**Recovery Staging Release Batch**:
The explicitly confirmed non-atomic coordination of selected independently eligible Release Safely Rebuildable Recovery Staging items, with fresh per-item validation and commit.
_Avoid_: Clean all recovery, atomic rollback batch, remembered cleanup policy

**Cancel Remaining Recovery Staging Releases**:
The in-flight batch intent that stops dispatch of unstarted staging releases while allowing the current item to settle, retaining completed releases and every untouched item's original recovery state.
_Avoid_: Undo released staging, pause batch, cancel affected recovery work

**Staging Release Reconciliation Required**:
The non-terminal state for an interrupted multi-member staging removal whose expected members are neither proven all removed nor proven wholly intact and unchanged.
_Avoid_: Partial release success, reusable partial staging, automatic cleanup continuation

**Staging Release Reconciliation View**:
The grouped filterable and sortable projection of staging-release reconciliation items whose evidence and recovery actions remain strictly item-scoped.
_Avoid_: Recovery release batch, select all, shared recovery authorization

**Complete Remaining Recovery Staging Release**:
The explicit item-scoped recovery action that removes only freshly proven remaining operation-owned members after a partial staging release without restoring absent members or resuming the original work.
_Avoid_: Retry whole batch, reconstruct deleted staging, continue partial encode, multi-select recovery

**Complete Remaining Staging Release Review**:
The single-item confirmation showing proven remaining scope, bytes and full-reprocessing consequence before current evidence may authorize Complete Remaining Recovery Staging Release.
_Avoid_: Typed-name challenge, password prompt, remembered confirmation

**Released After Reconciliation**:
The resolved staging-release outcome proving remaining members were explicitly released after an interruption while preserving that interruption in result history.
_Avoid_: Ordinary Released, automatic cleanup completion, erased recovery history

**Recovery Staging Release Result Merge**:
The rule that updates the original batch item and attention counts with Released After Reconciliation without creating another activity record, notification or retry attempt.
_Avoid_: New batch history, retry result, overwrite original interruption

**Recovery Staging Completion Attempt**:
One explicitly confirmed Complete Remaining Recovery Staging Release attempt recorded inside the same recovery item with time, outcome, current member counts and typed reason.
_Avoid_: Batch retry attempt, automatic retry, separate activity record

**Try Complete Remaining Staging Release Again**:
The explicit item action available only after a new read-only proof re-establishes eligibility following a failed Recovery Staging Completion Attempt.
_Avoid_: Retry Failed Staging Releases, remembered confirmation, automatic continuation

**Recovery Staging Attempt Compaction**:
The history rule preserving every state-changing completion attempt while coalescing only consecutive identical no-change failures into count plus first/latest time and latest typed reason.
_Avoid_: Fixed attempt truncation, changed-state coalescing, raw error history

**Recovery Staging Terminal Marker**:
The non-user-facing terminal evidence retaining only opaque operation/item identity, terminal result class, final evidence generation and completion time while a live reference or replay-prevention need remains.
_Avoid_: Activity history, permanent audit record, recovery receipt

**Recovery Staging Terminal Evidence Unverifiable**:
The safety state entered when a live reference finds its terminal marker missing, damaged or contradictory and the terminal outcome cannot be uniquely reconstructed from authoritative recovery evidence.
_Avoid_: Never executed, global library lock, permission to retry release

**Claim-Scoped Recovery Evidence Authority**:
The rule assigning proof authority by the fact being established: recovery journals and receipts prove committed intent and boundaries, matching current-member evidence proves physical state, and task state is a projection rather than an override.
_Avoid_: Fixed source priority, latest timestamp wins, database truth overrides evidence

**Retire Unverifiable Recovery**:
The explicit user decision ending active recovery governance when required evidence is not expected to return, without changing files, asserting a physical outcome or permitting the old operation to resume.
_Avoid_: Mark Successful, automatic timeout, discard and retry

**Retire Unverifiable Recovery Review**:
The item-scoped two-step review requiring acknowledgment of the unknown physical outcome, irreversible end of old recovery and fresh-preflight requirement before Retire Unverifiable Recovery may be confirmed.
_Avoid_: Batch retirement, remembered consent, typed-name challenge

**Recovery Retired — Outcome Unknown**:
The terminal task state recording that active recovery was intentionally ended without proving whether the governed physical operation completed.
_Avoid_: Released, Release Failed, evidence-proven completion

**Recovery Anti-Replay Tombstone**:
The minimal non-user-facing evidence preventing a Recovery Retired — Outcome Unknown operation from being resumed or treated as never executed while its library or operation identity remains.
_Avoid_: Activity history, recovery receipt, permanent user-visible warning

**Returned Retired Recovery Evidence Check**:
The bounded read-only assessment of newly returned evidence for a Recovery Retired — Outcome Unknown operation that may settle its tombstone or expose a current exact conflict without reviving the old operation.
_Avoid_: Automatic resume, repeated polling, terminal system notification

**Review Returned Recovery Conflict**:
The read-only item route presenting a current conflict proven by returned retired-recovery evidence and allowing only deferral or creation of a new current-evidence recovery plan.
_Avoid_: Continue old task, mark successful, repeat old release

**Returned-Evidence Recovery Plan**:
A new operation-specific recovery intent with its own identity, current evidence and authorization, created to address a conflict found after the original recovery was retired.
_Avoid_: Resumed old operation, inherited consent, tombstone-authorized mutation

**Safely Release Returned Recovery Staging**:
The newly confirmed removal of a complete current remaining staging set proven application-owned, unpublished, outside destructive publication boundaries and safely rebuildable.
_Avoid_: Continue old release, delete ambiguous member, automatic cleanup

**Preserve Returned Recovery Staging**:
The verified copy of a complete identified remaining staging set to a user-owned local destination outside application data while leaving the governed staging unchanged.
_Avoid_: Release staging, Export Managed Writeback Recovery Copy, ownership conversion

**Preserved — Staging Retained**:
The settled returned-recovery state in which a complete external preservation copy is verified and inert application-owned staging is intentionally kept without active conflict attention.
_Avoid_: Recovery resolved by deletion, staging released, cache retained

**Protected Preserved Recovery Staging**:
The non-cache Storage Management class for inert application-owned staging intentionally retained after verified preservation and excluded from automatic or generic cleanup.
_Avoid_: Managed Recovery Storage, cache, active outcome evidence

**Recovery Staging Release Batch Result**:
The truthful Complete, Partial, None Released or Cancelled batch outcome separating Released, Proven Already Absent, Cancelled Before Release, Staging Release Reconciliation Required, Excluded After Evidence Change and Release Failed items while reporting only actual proven reclaimed bytes.
_Avoid_: Planned bytes released, all-or-nothing cleanup, excluded-item retry

**Recovery Staging Release Batch Activity Record**:
The 30-day-default lightweight Reviewed Batch Action history for a Recovery Staging Release Batch Result, kept separate from the affected work's recovery authority and attention.
_Avoid_: Startup Recovery Evidence, recovery-resolution record, cleanup authorization

**Long-Running Recovery Staging Release**:
A user-confirmed Recovery Staging Release Batch whose execution outlives the foreground context and may project one aggregate terminal notification under every represented owning-operation preference.
_Avoid_: Startup reconciliation, read-only recheck, per-item cleanup notification

**Asset Export Task Fair Rotation**:
The non-preemptive admission policy that alternates eligible confirmed Asset Export tasks while allowing the only eligible task to use safe available capacity.
_Avoid_: Drain-one-task FIFO, new-task preemption, draggable priority queue

**Heavy Compatible Export**:
A Compatible Export whose capability and current evidence require conservative exclusive admission because of material memory, accelerator or processing demand.
_Avoid_: File-extension guess, AI model execution, user-selected concurrency

**Retry Asset Export Placements**:
An explicit result action that freshly preflights selected safe failed or cancelled placements and gives them task-local waiting priority without regenerating successful outputs, erasing attempt history or creating cross-task preemption.
_Avoid_: Retry whole Export Set, reset retry budget, bypass recovery

**Rendered Image Copy**:
An explicit clipboard image rendered from the current validated visual unit or visible composition without representing the complete Original Asset.
_Avoid_: Copy file, original handoff, preview-file export

**Compatible Export**:
One or more explicit source-separated output variants generated under user-selected format, dimensions, color gamut and visual-unit choices for use by another application without changing the current original relationship.
_Avoid_: Original handoff, silent conversion, source rewrite, current-source replacement

**Asset Inspector**:
The UI workspace for inspecting an individual asset's preview, metadata, tags, captions, AI outputs, and analysis panels.
_Avoid_: Detail drawer, preview modal

**Asset Preview**:
A focused viewing state for inspecting a selected asset at a larger size without moving metadata editing out of the Asset Inspector.
_Avoid_: Preview modal, lightbox, viewer page

**Compare View**:
A transient multi-asset preview state for side-by-side visual and metadata comparison without owning assets or creating an Asset Collection or Collection Board.
_Avoid_: Comparison collection, moodboard, Batch Inspector

**Batch Inspector**:
The right-side inspector mode for multiple selected Design Assets or Asset Candidates, showing shared fields, mixed-value states, batch-safe actions, and aggregate information.
_Avoid_: Bulk edit panel, multi-select drawer, batch modal

**Shared Metadata Summary**:
A Batch Inspector summary of metadata values shared by every selected Design Asset or Asset Candidate.
_Avoid_: Single asset details, inferred defaults, batch suggestion

**Mixed Value**:
A Batch Inspector field state showing that selected items do not share the same metadata value.
_Avoid_: Empty value, validation error, missing metadata

**Batch Action Bar**:
The Batch Inspector action surface for batch-safe actions such as confirming, rejecting, tagging, assigning collections, or extending retention.
_Avoid_: Single asset toolbar, context menu, global toolbar

**Asset Workspace**:
The primary product surface for browsing, selecting, organizing, filtering, inspecting, and acting on design assets.
_Avoid_: Browser shell, asset overlay, material page

**Workspace Toolbar**:
The context-specific action surface for the currently active workspace or content view.
_Avoid_: Global topbar, app menu, universal toolbar

**Quick Filter**:
A high-frequency filter surfaced directly in the Workspace Toolbar for narrowing the active asset or candidate set.
_Avoid_: Toolbar toggle, simple filter, shortcut filter

**Temporary Filter**:
An unsaved filter state that narrows the current workspace without creating a Workspace Navigation entry.
_Avoid_: Unsaved Smart Filter, navigation filter, saved view

**Contextual Search**:
A search interaction whose results are scoped to the currently active workspace or content view.
_Avoid_: Global search, universal search, fuzzy everything

**Searchable Library Object**:
A user-visible Design Asset, Asset Candidate, Asset Collection, Tag, Asset Source, or Smart Filter including Saved Search that is eligible for Search Palette under its own visibility policy.
_Avoid_: Background task, error record, model, plugin, setting, application command

**Current-Library Global Search**:
A global search interaction that searches Searchable Library Objects within the active library.
_Avoid_: Cross-library search, current page search, omnibox, AI search

**Cross-Library Search**:
A read-only discovery search for Searchable Library Objects across eligible Registered Libraries that preserves each result's library identity without filtering it by immediate reuse availability or activating or merging those libraries.
_Avoid_: Current-Library Global Search, simultaneous writable libraries, library merge

**Offline Library Search Result**:
A Cross-Library Search result backed by an Offline Library Catalog that requires the matching library instance to reconnect before original access or editing.
_Avoid_: Live library result, embedded original, restored asset

**Search Scope**:
The explicit Search Palette boundary selecting all Registered Libraries or the current library without changing the query itself.
_Avoid_: Contextual Search, hidden library filter, search mode

**Search Palette**:
A transient keyboard-first overlay shared by Current-Library Global Search and Cross-Library Search that appears above the current workspace without replacing it.
_Avoid_: Search page, toolbar search, global menu

**Search Result Group**:
A typed section of Search Palette results, such as design assets, asset candidates, asset collections, tags, asset sources, or smart filters.
_Avoid_: Search category, result tab, mixed list

**Cross-Library Rank Fusion**:
A versioned ordering that combines each Registered Library's internal ranks within one Search Result Group without comparing incompatible raw scores.
_Avoid_: Global relevance score, raw cosine merge, library-priority sort

**Exact-Content Result Cluster**:
A transient Search Palette presentation that folds independently owned results with verified byte-identical current content while preserving every object's library identity and metadata.
_Avoid_: Merged asset, duplicate deletion, similarity group, shared object identity

**Search Focus View**:
A transient Asset Workspace state that focuses a Search Palette result and its search context without creating a collection, Smart Filter, or durable search record.
_Avoid_: Search page, temporary collection, saved search

**Workspace Navigation**:
The navigation structure that lets users move between asset workspaces, asset collections, referenced sources, and smart filters.
_Avoid_: Sidebar menu, route list, page nav

**Sources Section**:
The Workspace Navigation section that lists referenced source roots and their Source Trees separately from Asset Collections.
_Avoid_: Collection tree, filesystem manager, import queue

**Navigation Rail**:
The compact form of workspace navigation that uses icons, active state, and badges for primary navigation access.
_Avoid_: Mini sidebar, icon menu, collapsed sidebar

**Navigation Panel**:
The expanded form of workspace navigation that shows section labels, workspace entries, collection hierarchy, source hierarchy, smart filters, and badge details.
_Avoid_: Full sidebar, drawer menu, route panel

**Workspace Entry**:
A top-level workspace destination for a core product workflow, such as asset browsing, capture review, or web capture.
_Avoid_: Menu item, tab, overlay route

**Asset Grid**:
A dense browsing presentation for scanning, selecting, sorting, filtering, and comparing many design assets in the asset workspace.
_Avoid_: Gallery, masonry page, image wall

**Smart Filter**:
A saved dynamic filter view, labeled 智能筛选 in Chinese product UI, for reusable asset or candidate sets. It is library-wide by default, does not own, copy, or move assets, and only shows items matching its criteria.
_Avoid_: Smart folder, smart collection, search shortcut, filter button

**System Smart Filter**:
A built-in Smart Filter owned by the application for a stable review or informational workflow; its criteria are read-only, and it may be hidden or restored by the user but not deleted as user content. Review-focused filters use Review Signal semantics, while informational views such as Recent Captures use Match Count and create no attention merely from membership.
_Avoid_: Default folder, locked filter, undeletable saved search

**Review Signal**:
A workflow signal that an asset or asset candidate needs user attention, such as a duplicate signal, unresolved tag suggestion, retention warning, or required integrity/ownership conflict.
_Avoid_: Notification, alert, hidden filter count

**Review Signal Action**:
A user action applied to a specific Review Signal without changing the asset candidate lifecycle by itself.
_Avoid_: Candidate-level action, reject candidate, cleanup action

**Resolved Review Signal**:
A Review Signal that no longer requires current user attention because it was accepted, rejected, dismissed, expired, or otherwise handled.
_Avoid_: Hidden signal, deleted signal, inactive alert

**Review History**:
A trace of resolved review decisions that explains why an asset or asset candidate no longer appears in a review-focused System Smart Filter.
_Avoid_: Activity log, changelog, deleted task list

**Review Signal Dismissal**:
A user decision that resolves a Review Signal because the user decides it does not need further action.
_Avoid_: Snooze, hide, delete signal

**Review Signal Snooze**:
A time-bound deferral that temporarily removes a Review Signal from active review queues until its return time.
_Avoid_: Dismiss, hide, resolve later

**Snooze Return Time**:
The time when a snoozed Review Signal should return to active unresolved review queues if it is still relevant.
_Avoid_: Expiration time, retention extension, reminder label

**Review Signal Count**:
The number of unresolved Review Signals represented by a review-focused System Smart Filter.
_Avoid_: Total matches, badge number, asset count

**Match Count**:
The number of items currently matching a filter's criteria, regardless of whether they need user review.
_Avoid_: Review count, unresolved count, task count

**Conflict Count Update**:
The count update for unresolved carried-over conflicts represented by Library Conflict Smart Filter after Carryover Resolution.
_Avoid_: Match count update, review signal count update, total asset count

**Optimistic Count Update**:
A temporary UI count change shown before the underlying resolution write has been confirmed.
_Avoid_: Confirmed count, final badge count, saved result

**Confirmed Count Update**:
A count change applied after the underlying resolution write has been persisted.
_Avoid_: Optimistic count, pending count, local-only count

**Count Reconciliation**:
The correction step that restores or adjusts a count when a temporary count update disagrees with persisted conflict state.
_Avoid_: Silent correction, recount everything, hidden failure

**Smart Filter Result Group**:
A typed section within a Smart Filter result set that keeps design assets and asset candidates in their own workflow contexts.
_Avoid_: Mixed grid, combined result list, filter tab

**User Smart Filter**:
A Smart Filter created by the user from saved criteria and controlled as user content; it may be named, edited, saved, duplicated, deleted, and reordered.
_Avoid_: Custom smart folder, personal folder, query preset

**Advanced Filter Panel**:
An expandable filtering workspace for composing multiple filter criteria and saving reusable Smart Filters.
_Avoid_: Filter drawer, query builder, hidden settings

**Masonry Grid**:
An asset-grid layout that preserves varied asset aspect ratios for dense visual scanning.
_Avoid_: Waterfall page, Pinterest clone, masonry page

**Uniform Grid**:
An asset-grid layout with equal-sized tiles for direct comparison of similar assets, UI screenshots, icons, or component references.
_Avoid_: File manager, table view, fixed gallery

**Asset Category**:
A broad visual classification for an asset, such as UI, design, document, anime, illustration, photo, product, mixed, or unknown.
_Avoid_: Folder, tag group, file type

**Custom Category**:
A user override for the broad asset category.
_Avoid_: Manual label, user type

### Tags

**Tag**:
A reusable semantic label attached to assets for search, classification, or organization.
_Avoid_: Keyword, label, badge

**System Tag**:
A built-in tag owned by the application and protected from casual user redefinition.
_Avoid_: Default tag, locked label

**Custom Tag**:
A user-created or user-managed tag.
_Avoid_: Manual tag, private tag

**AI Tag**:
A tag proposed or attached by an AI or algorithmic source.
_Avoid_: Generated label, model tag

**Asset Tag**:
The relationship between a design asset and a tag, including source, confidence, and confirmation status.
_Avoid_: Tag assignment, label link

**Tag Suggestion**:
A pending AI or algorithmic proposal that the user can confirm or reject.
_Avoid_: Prediction, recommendation

**Tag Status**:
The confirmation state of a tag suggestion or asset tag: pending, confirmed, or rejected.
_Avoid_: Task status, review state

**Tag Alias**:
An alternate spelling or synonym that resolves to a canonical tag.
_Avoid_: Nickname, duplicate tag

**Tag Relation**:
A relationship between tags, such as parent-child structure or synonym linkage.
_Avoid_: Tag tree edge, hierarchy row

**Tag Group**:
A curated grouping of tags for organization and display.
_Avoid_: Category, collection

**Normalized Tag Name**:
The canonical comparison form of a tag name used to prevent duplicate meanings.
_Avoid_: Slug, lowercase label

**Raw Tag Value**:
The uncleaned model output or source value from which a canonical tag may be derived.
_Avoid_: Original tag, prediction text

**Design Tag Dictionary**:
The domain vocabulary used to translate raw visual signals into professional design tags.
_Avoid_: Keyword map, translation table

**Tag Fusion**:
The process of combining multiple tag sources into one cleaned, deduplicated tag set.
_Avoid_: Merge, aggregation

**Tag Localization**:
The process of converting model or dictionary tags into product-facing Chinese design language.
_Avoid_: Translation, rename

### Capture And Downloads

**Embedded Browser**:
The retired in-app browsing surface formerly used to visit source sites and capture asset candidates; retained as a historical term.
_Avoid_: Webview, crawler, browser tab

**Web Capture Entry**:
A historical acquisition term covering the retired embedded surface and possible future external browser handoff; it does not denote a current in-app browser route.
_Avoid_: Main browser, browser-first shell, web workspace

**Capture Producer**:
A source that submits capture intent, such as Copy Into Library file import, direct-image download intake, clipboard capture or a future external browser/local integration.
_Avoid_: Downloader, asset creator, capture workspace

**Trusted Internal Capture Adapter**:
An allowlisted preload and IPC adapter used by built-in capture surfaces without issuing an external producer token.
_Avoid_: Unrestricted renderer IPC, local API client, paired extension

**External Capture Producer**:
A browser extension or independent local tool that must pair explicitly before submitting capture intent through Local Capture API.
_Avoid_: Built-in capture adapter, plugin host, trusted localhost process

**Capture Pairing**:
An explicit user-approved flow that registers one External Capture Producer and grants its narrow capture capabilities.
_Avoid_: Website login, browser authorization, automatic localhost trust

**Scoped Capture Token**:
A producer-specific revocable credential stored through operating-system secure storage and limited to approved capture submission and producer-owned status reads.
_Avoid_: Website credential, global API key, browser cookie

**Local Capture API**:
A future loopback-bound adapter through which paired External Capture Producers submit Capture Envelopes and read minimal state for their own requests.
_Avoid_: LAN service, library administration API, AI Worker API

**External Capture Integrations**:
The user-controlled capability that permits Local Capture API to run with the desktop application; it is disabled by default and does not expose a service while the app is closed.
_Avoid_: Plugin system, embedded browser toggle, AI service setting

**Pairing Window**:
A short-lived state opened by explicit user action during which one new External Capture Producer may request Capture Pairing.
_Avoid_: Permanently discoverable pairing endpoint, login window, browser popup

**External Capture Suspension**:
The state produced by disabling External Capture Integrations, stopping external capture connections without deleting existing producer pairings or revoking their tokens.
_Avoid_: Producer revocation, candidate intake cancellation, app shutdown history

**Capture Wake Request**:
An application-protocol request issued only by an explicit user-triggered extension capture when Local Capture API is unavailable because the desktop app is not running.
_Avoid_: Background auto-launch, capture envelope transport, pairing request

**Capture Wake Nonce**:
A one-time non-sensitive handshake value that correlates one Capture Wake Request with the authenticated Local Capture API connection after startup.
_Avoid_: Scoped capture token, capture request identity, source URL

**Pending Extension Capture**:
A Capture Envelope and artifact intent held only in volatile extension memory while waiting for an explicitly awakened desktop app, without being reported as successfully accepted.
_Avoid_: Durable offline queue, candidate intake, completed capture

**Producer Access Management**:
The settings surface that shows paired producer identity, granted scope, last-used time, and immediate revocation controls.
_Avoid_: Password manager, website account list, plugin marketplace

**Capture Envelope**:
A transport-neutral description of one capture intent, including its source, method, artifact locator, metadata intent, and Capture Request Identity.
_Avoid_: IPC payload, Download Task, asset row

**Artifact Transfer Mode**:
The declared capture path that chooses Gateway Artifact Fetch for a stable public original or Producer Artifact Upload for browser-context-dependent original bytes.
_Avoid_: Capture method, file format, download status

**Gateway Artifact Fetch**:
Capture Gateway acquisition of a stable public HTTPS original without receiving browser cookies, authentication headers, or site credentials.
_Avoid_: Browser-session fetch, producer upload, web scraping

**Producer Artifact Upload**:
Streaming binary or multipart transfer of original bytes read by a paired producer inside its browser context when Gateway Artifact Fetch cannot access the resource safely.
_Avoid_: Base64 JSON payload, cookie forwarding, screenshot fallback

**Screenshot Capture**:
An explicit Capture Method that creates a screenshot artifact and remains distinct from original-quality web artifact capture.
_Avoid_: Silent fallback, original image, thumbnail capture

**Initial Capture Format Set**:
The first-phase web capture allowlist of JPEG/JFIF, PNG, WebP, and GIF originals that pass file-signature, MIME, and real decode validation on both supported desktop platforms.
_Avoid_: Extension-only allowlist, all browser-displayable formats, future format roadmap

**Animated Source Preview**:
A derived preview for an animated original such as GIF that may be static in the first phase but must be labeled as animated while preserving the original Candidate Artifact unchanged.
_Avoid_: Original animation, silent flattening, screenshot

**Capture Format Capability**:
The cross-platform evidence that a format has safe decode, metadata, thumbnail, and preview behavior before it joins the supported capture set.
_Avoid_: File extension match, browser support, producer claim

**Capacity-Aware Artifact Admission**:
Streaming acceptance of an original Candidate Artifact without a fixed byte-size cap while continuously protecting available storage and avoiding whole-file memory buffering.
_Avoid_: Unlimited memory upload, fixed file-size ceiling, preview decode

**Storage Safety Reserve**:
A dynamic per-volume amount of free storage that governed admissions and cache budgets preserve so application work cannot exhaust the volume needed by the application or operating system.
_Avoid_: File-size limit, fixed storage quota, free space on another volume

**Derived Media Budget**:
An isolated memory, time, and decoder-work budget for metadata, thumbnail, and preview generation that does not redefine whether a safely stored original file is valid.
_Avoid_: Original file-size cap, acquisition timeout, AI inference budget

**Preview Deferred**:
A temporary progressive candidate state used while the backend is still generating the required System Preview for an intact supported original.
_Avoid_: Permanent preview failure, acquisition failure, unsupported format

**Preview Placeholder**:
A temporary Candidate Grid representation that uses verified format, filename, size, source, and processing state while automatic System Preview generation is still running.
_Avoid_: Permanent no-preview card, fake thumbnail, promotion override

**Transient Preview Deferral**:
A Preview Deferred cause produced by temporary CPU, memory, or system pressure that may succeed when derived-media work runs later under sufficient resources.
_Avoid_: Missing decoder, corrupt original, acquisition failure

**Idle Preview Retry**:
The first low-priority automatic retry of Transient Preview Deferral when the application has sufficient idle resources, after which backend recovery or capability repair remains responsible for resolution.
_Avoid_: Acquisition retry, user-owned workaround, permanent preview failure

**Preview Unavailable**:
A compatibility state for formats not declared supported; it is not an acceptable terminal state for a supported-format candidate.
_Avoid_: Supported-format failure, preview deferred, promotion-ready candidate

**Manual Preview Retry**:
A diagnostic or support-triggered regeneration attempt after backend capability changes, not the primary resolution for supported-format preview failure.
_Avoid_: User workaround requirement, candidate recapture, promotion override

**System Preview**:
The faithful backend preview capability required for every supported format, represented by a persistent overview and, where needed, a validated on-demand render path with replaceable derived media separate from the original.
_Avoid_: User cover, original file only, browser thumbnail

**System Preview Ready**:
The state in which a validated persistent overview and any required artifact-specific On-Demand Render Manifest exist so the candidate may pass the preview portion of Promotion Readiness.
_Avoid_: Preview deferred, preview placeholder, original validation only

**Preview Generation Failure**:
A deterministic failure to render System Preview for a declared supported format, treated as a backend capability defect that blocks Candidate Promotion.
_Avoid_: Tolerated no-preview state, acquisition failure, user error

**Preview Working Raster**:
A bounded ephemeral full-composition or regional raster produced inside an isolated format worker to derive an overview, quick preview, tile, or AI input without requiring a permanent full-size JPEG or PNG.
_Avoid_: Flattened original, permanent master preview, renderer-side decode

**Opportunistic Quick Preview**:
An evictable approximately 2048-pixel preview admitted only from validated embedded data or an already-required working raster without starting a separate professional-format render.
_Avoid_: Import requirement, persistent master preview, unconditional 2048px conversion

**Grid Thumbnail**:
A lightweight System Preview derivative at approximately 512 pixels for dense Asset Grid and Candidate Grid rendering.
_Avoid_: Original image, quick preview derivative, browser source thumbnail

**On-Demand Render Manifest**:
Artifact-specific evidence that a format worker validated dimensions, composition, visual units, tile/region access, color, alpha, and decoder capability for lazy full-detail preview.
_Avoid_: Format support claim only, embedded thumbnail, full-size preview file

**Preview Tile Cache**:
A bounded cache of only requested region, scale, visual-unit, and destination-gamut tiles used for full-detail pan and zoom.
_Avoid_: Complete precomputed pyramid, analysis proxy cache, permanent full-size preview

**Preview Viewport Generation**:
The immutable asset, unit, region, scale, gamut, render-generation, and display-evidence identity against which arriving preview tiles must match before painting.
_Avoid_: Window id only, mutable request, stale tile acceptance

**Preview Detail Degraded**:
A localized non-blank preview state in which the overview or lower-resolution tile remains visible while a deterministic detail-tile failure is recorded for retry and backend repair.
_Avoid_: Full preview unavailable, white screen, user file error

**Primary Asset Overview**:
The one persistent approximately 512-pixel visual-unit overview representing a structured asset in grids, search, collections, and immediate preview entry.
_Avoid_: Every-page thumbnails, full analysis coverage, permanent full-size preview

**Unit Navigation Thumbnail**:
An evictable thumbnail generated only for a visible or adjacent page, artboard, frame, or other declared visual unit in Asset Preview navigation.
_Avoid_: Import-time all-unit render, primary overview, AI analysis tile

**Asset Cover Selection**:
A reversible library-sidecar choice of one validated visual unit as Primary Asset Overview without modifying the original or analysis coverage.
_Avoid_: Original poster rewrite, AI-inferred cover, page reorder

**Cover Selection Stale**:
The state in which a Source Content Generation no longer contains the selected cover unit, requiring validated deterministic fallback rather than a wrong or blank overview.
_Avoid_: Asset missing, preview cache eviction, automatic semantic replacement

**Extension Library**:
The dedicated in-app catalog and lifecycle page for verified optional Format Capability Packs and permission-declared Feature Plugins.
_Avoid_: AI model list, arbitrary package URL, AI Console section

**Format Capability Pack**:
A platform/architecture-specific verified package that adds declared isolated preview or processing worker capability without arbitrary renderer or library access.
_Avoid_: Model weights, unrestricted plugin, bundled core worker

**Feature Plugin**:
An optional application extension whose declared UI, command, data, network and worker scope is enforced by the trusted host and execution boundary; its manifest describes requested rights rather than granting them.
_Avoid_: Native delegate by implication, model artifact, undeclared script

**Model Library**:
The dedicated in-app catalog and lifecycle page for local AI model discovery, user-triggered installation, verification, selection, update, and removal.
_Avoid_: AI runtime console, external provider configuration, automatic model download

**Local AI Starter Setup Plan**:
A reviewable hardware-evidence-based first-use plan that assigns exact verified local artifacts and dependencies to the four baseline analysis capabilities before one explicit install-and-enable consent.
_Avoid_: Silent model selection, install-everything bundle, automatic library backfill

**Starter Capability Assignment**:
One exact model artifact and verified dependency chain displayed for a baseline capability inside a Local AI Starter Setup Plan; one artifact may serve multiple declared capabilities.
_Avoid_: Mutable model path, hidden fallback, inferred capability

**Partial Local AI Setup**:
An honest setup outcome in which independent verified packages may remain installed but only capabilities with complete verified dependency chains become active.
_Avoid_: Whole-plan success, rollback of unrelated installs, automatic substitute

**Local AI Setup Preference Profile**:
A Resource Saver, Balanced or Quality First recommendation intent that ranks only safe eligible Starter Setup plans and never changes active models by itself.
_Avoid_: Fixed model bundle, hardware tier, automatic optimization

**Plan Estimate Evidence**:
A versioned Local Measured, Catalog Estimate, Derived Estimate or Not Assessed label attached to a setup plan's quality, speed, memory, storage or energy comparison.
_Avoid_: Unlabelled exact number, parameter-count quality claim, current-free-memory guarantee

**Catalog Benchmark Evidence**:
Signed reproducible model-catalog quality or performance evidence bound to an exact artifact, capability, recipe, runtime matrix, dataset, metric and evaluation protocol.
_Avoid_: Marketing score, parameter-count proxy, readiness probe

**Local Calibration Evidence**:
On-device operational measurements for one exact verified artifact/runtime using only a versioned non-user Calibration Fixture Pack.
_Avoid_: User-asset sampling, broad quality claim, uploaded telemetry

**Calibration Fixture Pack**:
A minimal digest-verified redistributable set of deterministic non-user inputs used only for bounded local performance and resource calibration.
_Avoid_: Evaluation dataset download, user library sample, quality benchmark by implication

**Local AI Resource Governor**:
The host-owned cross-runtime admission, priority, residency and pressure controller for all local analysis and calibration work.
_Avoid_: Worker-local queue, generic app concurrency, model recommendation

**Heavy Model Execution**:
A resource-classified local inference that may not overlap another heavy inference under the default global safety policy.
_Avoid_: Installed model size alone, resident-idle model, external provider call

**Small Model Co-residency**:
Conditional simultaneous residency or execution of small verified models only when combined peak evidence plus the platform safety reserve fits.
_Avoid_: Unbounded parallelism, guessed free memory, user concurrency override

**Idle Model Residency**:
A bounded reclaimable post-job period that keeps an unpinned verified model loaded to reduce reload cost while resource conditions remain safe.
_Avoid_: Installed artifact cache, permanent pin, active execution

**Continue Analysis After Closing The Window**:
A default-off preference allowing local background analysis with no visible main window only while a discoverable tray/menu-bar application process remains active.
_Avoid_: Hidden daemon, explicit Quit override, launch-at-login permission

**No-Window Analysis Status**:
The local-analysis section of Application Status Center, showing aggregate state and scoped pause/resume or idle-model controls without private content.
_Avoid_: Separate AI tray icon, asset content notification, full AI Console

**Launch At Login**:
A separate default-off operating-system integration permission that never implies no-window analysis or model installation.
_Avoid_: Continue-after-close toggle, service installation, automatic backfill

**Bounded AI Shutdown**:
The Local AI participation in Safe Stop And Quit, committing only complete units and preserving restart-reconcilable intents before governed runtime termination.
_Avoid_: Finish entire queue, partial result commit, hidden post-quit worker

**Long-Running Application Operation**:
A user-initiated export, AI, download, installation or reviewed recovery-storage task whose terminal result may be useful after the owning surface leaves the foreground.
_Avoid_: Automatic indexing, routine progress event, background resource wait

**Aggregate Operation System Notification**:
A background-only deduplicated terminal projection containing operation kind, minimal counts/status and no private content.
_Avoid_: Per-item alert, progress notification, durable activity record

**Long-Running AI Operation**:
A Local AI subtype of Long-Running Application Operation covering setup, install, calibration, backfill or explicit batch analysis.
_Avoid_: Automatic per-asset intent, transient retry, model residency event

**Aggregate AI System Notification**:
A Local AI Aggregate Operation System Notification additionally governed by AI operation and trust-attention rules.
_Avoid_: Per-asset alert, content preview, durable activity record

**Notification Navigation Intent**:
A validated opaque operation reference that opens the current in-app result surface without private URL, command-line or query data.
_Avoid_: Asset path deep link, notification body payload, direct renderer route trust

**Background AI Power Policy**:
The global External Power, Light Baseline Only battery, low-power and thermal admission rules applied before local background AI starts.
_Avoid_: Generic app concurrency, power-save blocker, foreground consent

**Light Baseline Execution**:
A baseline capability artifact/runtime/recipe envelope verified to fit the battery resource and energy policy; it is not inferred from model size or name.
_Avoid_: Any small file, heavy backfill, Idle Extended Analysis

**Allow Heavy And Extended Background AI On Battery**:
A default-off override permitting heavy/background extended classes to seek normal admission on a healthy battery without bypassing other gates.
_Avoid_: Run guarantee, low-power override, no-window permission

**Power Waiting Reason**:
A typed non-failure state such as Waiting for External Power, Low Power Mode to End or Thermal Recovery.
_Avoid_: Analysis failure, generic queued, device telemetry dump

**Governed Package Payload Download**:
A host-admitted model, runtime, capability-pack or plugin payload transfer governed across separate trusted installers.
_Avoid_: Catalog metadata refresh, captured asset download, external AI request

**Network Cost Evidence**:
A fresh platform-sourced Unmetered, Metered, Roaming, Offline or Unknown state used for package-payload admission.
_Avoid_: Worker health, guessed Wi-Fi cost, network identifier

**Package Download Network Exception**:
A transaction-scoped user consent to continue one exact reviewed package plan on Metered, Roaming or Unknown network evidence.
_Avoid_: Future update permission, global roaming allowance, asset-download consent

**Catalog Metadata Byte Budget**:
A strict small-transfer limit allowing signed path-free catalog/trust metadata refresh without becoming a hidden package download.
_Avoid_: Repository snapshot, benchmark dataset, model artifact

**OCR Source Text**:
Recognized visible Unicode text preserved in its source writing system with region, reading-order, model/recipe and language-evidence provenance. Dedicated recognition observations remain distinct from text inferred by a general visual model; an empty successful observation is not an execution failure.
_Avoid_: Automatic translation, normalized-only text, application-locale guess

**OCR Correction**:
User-authored text that supersedes a compatible recognition result for display and search while retaining the recognized source text. Re-recognition does not replace the user's correction.
_Avoid_: Model rerun, automatic translation, corrected original image

**Metadata Language**:
The explicit target language for future generated Short Descriptions, initialized from but thereafter independent of application display language.
_Avoid_: OCR source language, UI locale rewrite, tag-vocabulary locale

**OCR Language Coverage**:
The user-reviewed set of recognition languages/scripts and verified local model or language-pack dependencies available to OCR.
_Avoid_: Detected asset language, filename inference, implicit all-language support

**Script/Language Detection Evidence**:
Per-span or unit Known, Mixed or Language Undetermined evidence that keeps writing-system recognition separate from language identification.
_Avoid_: Han-means-Chinese inference, locale default, unsupported-is-no-text

**Target-Language Description**:
A Short Description carrying an explicit language tag and direct-generation or translation provenance without overwriting other language versions.
_Avoid_: Generic fallback caption, unlabeled translation, manual-description replacement

**Tag Concept**:
A stable opaque semantic identity linked to assets independently of mutable language-specific display labels.
_Avoid_: Normalized tag string, translated word, suggestion text

**Tag Label**:
A preserved language-tagged preferred name or alias for one Tag Concept with source and trust provenance.
_Avoid_: Concept identity, unlabelled lowercase key, runtime translation

**Raw Tag Suggestion**:
The attributed model term and language/scope evidence retained before or after concept mapping and user confirmation.
_Avoid_: Confirmed tag, canonical label, auto-created concept

**Unmapped Tag Suggestion**:
A Raw Tag Suggestion whose evidence does not uniquely support an existing Tag Concept and therefore requires user review.
_Avoid_: Nearest spelling match, automatic new tag, analysis failure

**Concept Redirect**:
An opaque tombstone from an explicitly merged/deprecated Tag Concept to its reviewed target, preserving reference integrity without retaining a duplicate active concept.
_Avoid_: Silent catalog merge, display alias, deleted-reference failure

**Tag Auto-Confirmation Rule**:
An explicit user policy bound to exact model/recipe/vocabulary/mapping/calibration versions, concept scope and separate confidence thresholds.
_Avoid_: Trust-all switch, provider permission, global confidence number

**Auto-Confirmation Rule Preview**:
A no-analysis dry run showing exact bindings, thresholds, scope and would-confirm/pending/conflict counts before rule activation or expansion.
_Avoid_: Library backfill, silent threshold change, confirmation result

**Auto-Confirmation Decision Record**:
Minimal path-free provenance tying one automatic confirmation to its rule version, suggestion, concept, mapping and evaluated confidences.
_Avoid_: Raw asset content, rewritten confidence, audit-log snapshot

**Stale And Paused Tag Rule**:
A rule that cannot confirm new suggestions after a bound artifact, recipe, vocabulary, mapping, calibration or confidence-semantic change until reviewed.
_Avoid_: Deleted rule, failed analysis, automatic reapproval

**Hybrid Asset Search Plan**:
A local query plan combining hard filters, lexical retrieval and compatible semantic lanes while remaining complete for assets without vectors.
_Avoid_: Web source search, embedding-only search, raw-score addition

**Lexical Retrieval Lane**:
An indexed title/filename, user metadata, confirmed concept label/alias, OCR or description retrieval channel with language-aware evidence.
_Avoid_: Visual embedding, pending tag by default, external crawler

**Semantic Retrieval Lane**:
A model-space-bound text/image or example-image similarity channel whose absence never removes lexical candidates.
_Avoid_: Universal cosine score, model auto-download, cross-space comparison

**Search Match Explanation**:
A bounded local result explanation naming the lexical, tag, OCR, description or visual-similarity evidence contributing to rank.
_Avoid_: Universal relevance percentage, notification content, private log payload

**Include Pending Suggestions**:
An explicit search option adding marked low-trust pending concept/raw-suggestion evidence without confirming it or altering ordinary facets.
_Avoid_: Default tag filter, ambiguous concept match, auto-accept rule

**Search By Image Query**:
A foreground local visual-similarity search using one explicit library scope or one trusted external file without importing or uploading it.
_Avoid_: Automatic asset analysis, web image search, directory scan

**Query Visual Scope**:
The stable overview, page, artboard, frame, declared view or explicit viewport/crop used to embed a Search By Image query.
_Avoid_: Every layer, guessed important page, hidden crop

**Trusted Query File Grant**:
A one-file one-session read authorization from a picker or explicit Search By Image drop target with no sibling/directory access.
_Avoid_: Persistent folder permission, recent-file crawl, asset import

**Ephemeral Query Visual Source**:
A Preview Broker-validated one-session pixel source and optional managed temporary render used only to compute a query embedding.
_Avoid_: Persistent preview, copied original, Analysis Proxy Cache entry

**Transient Query Embedding**:
A session-only vector in the exact Active Embedding Space that is released after search and is not an asset analysis result.
_Avoid_: Indexed asset vector, cross-space projection, stored search history

**Canonical Embedding Result**:
A durable finite vector plus exact owner/scope, model-space, recipe, dimension, numeric encoding, normalization and distance provenance needed to rebuild search without inference.
_Avoid_: ANN node, query vector, image-input cache

**Search Baseline Embedding**:
The single canonical Primary Asset Overview vector generated by the default Embedding capability for one Source Content Generation.
_Avoid_: Every page/layer vector, transient query, index encoding

**Unit Embedding**:
An explicit or extended-analysis canonical vector for one page, artboard, frame, crop or other stable structured Analysis Unit.
_Avoid_: Automatic all-unit baseline, hidden viewport, asset overview by implication

**ANN Search Index**:
A versioned rebuildable single-model-space acceleration structure derived from canonical embeddings for nearest-neighbor retrieval.
_Avoid_: Canonical result, mixed embedding spaces, permanent opaque cache

**Derived Search Index Cleanup**:
A separate action that may remove/rebuild ANN data while preserving canonical vectors and clearly reporting temporary semantic-search unavailability.
_Avoid_: Clean Analysis Cache, embedding deletion, model rerun

**Ephemeral Search Session**:
A bounded in-memory query/result navigation state bound to one stable result generation, cleared on session end or application exit, and never persisted as recent history. Explicit refresh may replace its result generation.
_Avoid_: Saved Search, localStorage query, result snapshot

**Saved Search**:
An explicitly named user Smart Filter storing a versioned query plan, criteria, mode and stable managed scope without scores, results or external query content.
_Avoid_: Recent query, result collection, imported image by implication

**Saved Image Query Source**:
An opaque stable reference to an already managed library asset and Query Visual Scope used by an explicit Saved Search.
_Avoid_: External path, stored query vector, hidden image copy

**Full Library Backup**:
A versioned portable consistent snapshot of authoritative originals, persistent required previews, user metadata and durable analysis results with declared derivative exclusions.
_Avoid_: Managed-root byte copy, cache archive, settings-only backup

**Backup Dependency Inventory**:
A path-free list of exact model/runtime/capability/extension/vocabulary/recipe identities needed to interpret results or restore future capabilities without bundling payloads or grants.
_Avoid_: Automatic installer, credential export, raw download URL

**Backup Manifest**:
A digested archive description of format/schema, object classes/counts, sizes, hashes, dependencies and exclusions for one consistent snapshot generation.
_Avoid_: Private path list, result snapshot UI, migration journal

**Rebuildable Backup Exclusion**:
A declared omitted ANN, preview/proxy/runtime/model cache, package payload or temporary class that can be rebuilt/reinstalled through normal governed flows.
_Avoid_: Original asset, canonical embedding, user metadata

**Portable Passphrase Encryption**:
The default device-independent Full Library Backup protection using a user passphrase, memory-hard KDF and authenticated streaming cipher.
_Avoid_: OS-login-derived key, archive-stored password, plaintext fallback

**Backup Encryption Suite**:
A versioned allowlisted Argon2id plus chunked XChaCha20-Poly1305 envelope with bounded KDF parameters, random salt and authenticated finalization.
_Avoid_: Ad-hoc crypto, unauthenticated ZIP password, implicit algorithm upgrade

**Encrypted Backup Header**:
The minimal clear format/encryption/KDF framing needed for restore while manifest, names, counts, hashes and payload remain encrypted.
_Avoid_: Private path list, dependency inventory, asset metadata

**Remember Backup Passphrase On This Device**:
An optional OS-vault convenience that never becomes required for portable restore and has no plaintext fallback.
_Avoid_: Archive credential, vendor escrow, cross-device identity

**New Library Restore**:
The default Full Library Backup recovery path that validates and stages a newly created library without mutating the current library.
_Avoid_: Import, overwrite current library, in-place restore

**Merge Dry Run**:
A side-effect-free Full Library Backup merge plan classifying new, identical, storage-deduplicated and conflicting objects before confirmation.
_Avoid_: Restore preview, automatic merge, partial import

**Portable Object Identity**:
A stable backup identity composed from the source library namespace and object identity, verified with content or record digests rather than inferred from names or paths.
_Avoid_: Filename identity, content similarity, local database row id alone

**Import Conflict**:
A persistent field/result-class disagreement found while merging a Full Library Backup that requires an explicit Keep Current, Use Imported or valid Keep Both decision.
_Avoid_: Last writer wins, duplicate signal, restore error

**Replace Current Library**:
A separate destructive restore workflow requiring a verified current-library backup, staged replacement, explicit confirmation and rollback.
_Avoid_: Merge option, overwrite checkbox, delete then restore

**Custom Starter Assignment**:
A user-selected compatible capability assignment pinned across draft profile recomputation until explicitly reset to the profile recommendation.
_Avoid_: Hidden override, automatic replacement, active model change

**Model Catalog Metadata Refresh**:
A bounded automatic or manual retrieval and verification of signed path-free model catalog, manifest and trust metadata without downloading or activating model artifacts.
_Avoid_: Model update, repository snapshot, readiness probe

**Trust Catalog Refresh Policy**:
The shared stale-driven rule for signed model/runtime trust metadata: automatic attempts occur only when never verified or older than 24 hours, at most once per trust root/channel per rolling day while the app is active, with jitter, debounce, manual refresh and no payload-download authority.
_Avoid_: Background update service, model download schedule, always-online requirement

**Trust Metadata Freshness**:
The per trust-root/channel age and verification classification derived from the last successfully signature- and sequence-verified catalog state, not from transport success or the wall clock alone.
_Avoid_: Last request time, internet availability, trusted forever

**Fresh Trust Install Admission**:
The online model/runtime preflight requiring a relevant signed trust state verified within the 24-hour freshness window before new payload transfer or promotion.
_Avoid_: Package consent, background download, model activation

**Waiting For Fresh Trust Metadata**:
The non-destructive online install/update state used when trust metadata is stale or not assessed and a bounded refresh has not succeeded.
_Avoid_: Download failed, package revoked, offline package blocked

**Dated Offline Trust Evidence**:
A signed manifest-bound trust snapshot carried by an official offline package, visibly identified by issue time and reconciled monotonically without claiming a latest-online check.
_Avoid_: Current online trust, detached checksum, package filename date

**Offline Evidence Validity Decision**:
The typed new-install decision derived from exact signature/trust-chain, signed validity-window, compatibility and known revocation evidence without imposing an age-only expiration.
_Avoid_: Package age warning, newer version available, online freshness check

**Evidence Age**:
The displayed elapsed time since signed offline evidence was issued; informative and distinct from cryptographic/semantic Evidence Validity.
_Avoid_: Expiration, revocation, last download time

**Trusted Current Time Assessment**:
The host decision establishing whether trustworthy platform/authenticated current-time evidence can evaluate a signed offline-package installation window.
_Avoid_: System clock value, package timestamp, time-zone setting

**Verified Time High-Water Mark**:
The tamper-resistant latest trustworthy time floor retained from accepted evidence so clock rollback cannot revive expired or not-yet-valid package state.
_Avoid_: Last app launch, raw wall clock maximum, file modification time

**Time Not Assessable**:
The blocking state for a new explicitly time-bounded offline installation when trustworthy current time cannot be established; it does not affect packages without such a boundary or existing installations.
_Avoid_: Offline, package expired, incorrect time assumed

**Catalog-Bound Authenticated Time Evidence**:
A replay-resistant, time-only signed freshness envelope delivered inside an already eligible Trust Catalog Metadata Refresh without adding an independent time endpoint or package authority.
_Avoid_: HTTP Date, release timestamp, NTP response, catalog issue date

**Time-Only Signing Delegation**:
An official narrowly scoped signing authority permitted to attest catalog-response time/freshness but not packages, manifests, trust decisions, publishers or application updates.
_Avoid_: Catalog root key, package signing key, general timestamp server

**Trusted Time Skew Tolerance**:
The fixed five-minute maximum separation between acceptable UTC-normalized current-time evidence intervals before they become conflicting; it grants no extra package validity.
_Avoid_: Timezone offset, user preference, expiration grace period

**Trusted Time Conflict**:
The blocking current-time assessment when independently acceptable sources still differ by more than five minutes after UTC normalization, without choosing either source or changing the high-water mark.
_Avoid_: Different timezone, daylight-saving change, package expired

**Validity Boundary Not Proven**:
The new-install blocking state where corroborated trusted-time uncertainty crosses a signed package `notBefore` or `validUntil` boundary even though the sources are not in conflict.
_Avoid_: Trusted Time Conflict, package signature failure, expiration grace

**Single-Source Trusted Time Assessment**:
An assessable time-bounded offline-install decision based on one independently acceptable OS or catalog source that is fresh, UTC-normalized, high-water-safe and wholly inside the signed validity window.
_Avoid_: Editable system clock, reduced-security override, mandatory online check

**Time-Bounded Official Offline Package**:
An exceptional official test/preview, legal/license-window or security-incident transition package carrying a signed current-time installation window and complete disclosure, distinct from Stable Offline releases.
_Avoid_: Old stable package, automatic expiration, forced update package

**Offline Package Time-Bound Justification**:
Signed manifest-bound evidence stating the permitted exceptional reason, exact window, affected scope, before/after behavior and recovery/replacement route for a time-bounded official offline package.
_Avoid_: Release-note warning, unsigned expiry date, generic end of support

**Time-Bounded Offline Release Request**:
The complete immutable candidate proposal binding exact time-window reason, scope, manifests/digests, targets, disclosure and recovery evidence before human approval.
_Avoid_: Draft package, reusable exception, publish approval

**Time-Bounded Offline Release Approval**:
An authenticated single-candidate decision by an authorized official human maintainer distinct from the proposer/author, required in addition to ordinary release/signing/publish gates.
_Avoid_: CI pass, package signature, author self-approval

**Install Window Ended**:
The expected post-`validUntil` state that removes a time-bounded official offline package from default install discovery while preserving searchable history and installed provenance without implying revocation.
_Avoid_: Package revoked, catalog delisted, installed package expired

**Install Window Not Started**:
The pre-`notBefore` state that keeps a time-bounded official offline package out of default install discovery and managed storage while permitting explicit upcoming metadata and bounded read-only external-file verification.
_Avoid_: Preinstalled, staged for activation, package unavailable

**External User-Owned Package**:
An explicitly selected offline package that remains outside managed ownership until a valid confirmed transaction copies verified bytes into governed staging; trust blocking grants no deletion or persistent-access authority.
_Avoid_: Managed package, quarantine file, application cache

**External Package Installation Blocked**:
The path-free foreground inspection result when an external package matches applicable accepted revocation/suspension evidence, preventing import/install while leaving the source file untouched.
_Avoid_: File deleted, package quarantined, installed runtime revoked

**External Package Inspection Session**:
The main-process-owned, native-picker-bound foreground state for one selected external package; before installation confirmation, leaving the inspection surface releases its grant and transient evidence instead of creating durable selection history.
_Avoid_: Recent package, persistent import record, reusable source bookmark

**External Package Identity Card**:
A session-bound read-only evidence surface separating selected basename/actual size from verified signed package name/version, publisher, trust-evidence freshness, targets, installation window and digest short code.
_Avoid_: File path panel, install confirmation, manifest dump

**Package Digest Short Code**:
An algorithm-labeled human-comparison abbreviation derived from a complete verified package digest; it never replaces full-digest matching or grants trust/install authority.
_Avoid_: Package identity proof, checksum verification, package id

**External Package Technical Details**:
A collapsed-by-default, session-bound disclosure for viewing and explicitly copying a complete package digest only after selected bytes match the signed manifest.
_Avoid_: Default metadata dump, install confirmation, persistent package report

**Canonical Package Digest Text**:
The exact single-line clipboard representation `algorithm:complete-normalized-digest`, containing no filename, path, package label or surrounding prose.
_Avoid_: Digest short code, copied package details, checksum screenshot

**Digest Mismatch Comparison**:
A session-bound technical-details view placing a verified signed expected digest beside the complete digest calculated from nonmatching selected bytes while keeping installation blocked.
_Avoid_: Partial match, trust override, editable checksum

**Signed Expected Digest**:
The complete algorithm/value from a successfully verified signed manifest for the exact artifact scope, independent from whether the selected bytes match it.
_Avoid_: Filename-derived checksum, website text, actual file digest

**Selected File Actual Digest**:
The complete algorithm/value calculated from all selected bytes; when it differs from Signed Expected Digest it remains explicitly unverified package identity.
_Avoid_: Trusted digest, replacement manifest value, accepted local package

**Digest Mismatch Recovery**:
The blocking recovery choice between explicitly selecting different local bytes and reviewing a new exact-candidate Official Package Reacquisition Plan.
_Avoid_: Continue anyway, repair selected file, accept actual digest

**Official Package Reacquisition Plan**:
A pre-transfer review for obtaining an exact signed Official Catalog candidate from its approved immutable sources, including trust, source, bytes, network, storage, license and lifecycle consequences.
_Avoid_: Automatic redownload, arbitrary URL, checksum repair

**Verified Managed Package Copy**:
Complete immutable package bytes owned by the application after signed-manifest/digest verification but before installation, activation or capability selection.
_Avoid_: Installed package, external offline file, temporary partial download

**Verified Package Decision Review**:
The post-verification surface offering Install Now, Keep Verified Copy For Later or Delete Managed Download Copy without choosing automatically.
_Avoid_: Download completion, automatic install, cache cleanup dialog

**Kept Verified Package Copy**:
A user-chosen retained Verified Managed Package Copy that remains non-executable and must pass all current admission gates before any later installation.
_Avoid_: Installed package, permanent compatibility promise, active runtime

**Delete Managed Download Copy**:
An explicit package-storage action that removes only the app-owned copy/reference and reclaims only bytes not shared or pinned by another declared owner.
_Avoid_: Delete external file, uninstall, clear trust state

**Pending Package Decision Retention**:
The seven-day default lifecycle for an unchosen Verified Managed Package Copy, starting at verified commit and ending in owner-safe application cleanup.
_Avoid_: Selection TTL, install window, license expiry

**Pending Package Decision Warning**:
The final 24-hour in-app-only state showing remaining time, storage and Install/Keep/Delete actions before an unchosen managed copy becomes reclaimable.
_Avoid_: OS notification, modal countdown, package revocation

**Pending Package Warning Opportunity**:
A normal usable main-window session in which the renderer confirms that the pending warning or accessible aggregate badge was projected, without tracking whether the user viewed or acknowledged it.
_Avoid_: Background process, app launch attempt, notification delivery receipt

**Missed Pending Package Warning Grace**:
One non-repeatable 24-hour extension granted at the first usable post-deadline projection when the app had no warning opportunity during the original final day.
_Avoid_: Install-window extension, repeated snooze, app-active-hours timer

**Kept Verified Package Copy Pin**:
The explicit user-controlled owner that removes a verified managed copy from seven-day/generic automatic cleanup while continuing to count its storage.
_Avoid_: Installed package, permanent install eligibility, invisible cache pin

**Keep Pin Admission**:
A fresh per-volume check that allows a pending managed package copy to become an indefinite Keep pin only when its newly protected physical bytes preserve the Storage Safety Reserve.
_Avoid_: New download, fixed package quota, permission to delete another copy

**Keep Pin Storage Shortfall**:
The physical bytes that must be released on the affected volume before a proposed Keep pin can commit, calculated from current availability, reserve and owner-aware reclaimability rather than logical package size.
_Avoid_: Package size limit, automatic cleanup target, cross-volume free space

**Pending Package Storage Resolution Hold**:
The explicit Clean Up And Keep active-operation pin that defers cleanup for one current usable renderer workflow and at most 30 elapsed minutes without changing retention or grace deadlines.
_Avoid_: Keep pin, retention extension, background cleanup service

**Pending Package Storage Resolution Budget**:
The one cumulative 30-minute allowance shared by all Clean Up And Keep holds in one pending-decision episode, persisted only as opaque episode identity, consumed duration and exhausted state.
_Avoid_: Per-entry refresh, attention history, new warning grace

**Storage Resolution Volume Slot**:
The host-owned exclusive lease allowing at most one Clean Up And Keep hold per stable affected physical volume across roots, windows and application processes.
_Avoid_: Display path lock, queued cleanup, global all-volume mutex

**Managed Package Copy Batch Delete**:
An irreversible reviewed operation deleting only user-selected eligible application-owned package-copy references, with no preselection and item-atomic owner revalidation.
_Avoid_: Automatic cache cleanup, uninstall batch, delete external files

**Owner-Aware Batch Reclaimable Bytes**:
The per-volume physical storage delta produced by removing the selected copy references while retaining every unselected installed, rollback, transaction and other owner, rather than summing logical sizes.
_Avoid_: Selected logical total, cross-volume total, guaranteed preview reclaim

**Independent Managed Copy Reclaimable Bytes**:
The physical storage delta if one managed package-copy reference alone were removed while every other candidate and owner remained, used for neutral initial ordering rather than recommendation.
_Avoid_: Logical package size, user-value score, guaranteed batch contribution

**Marginal Batch Reclaim Contribution**:
The non-additive change to the current combined physical reclaim projection if one row were added to or removed from the selected set.
_Avoid_: Summable row size, independent reclaim, final actual bytes

**Stable Cleanup Selection Order**:
The keyed managed-copy row order frozen when destructive selection begins so changing owner-aware values cannot move checkboxes automatically.
_Avoid_: Stale ownership, position-based identity, disabled explicit sort

**Keep Shortfall Coverage State**:
The per-volume comparison of selected owner-aware physical reclamation with the current Keep Pin Storage Shortfall, expressed as Not Yet Covered, Covered or Covered With Excess without triggering an action.
_Avoid_: Cross-volume offset, automatic minimum set, permission to Keep

**Partial Managed Copy Cleanup**:
An explicitly confirmed Not Yet Covered batch deletion of the currently selected eligible managed-copy references, showing the projected remaining shortfall without promising or automating Keep.
_Avoid_: Invalid batch, delete until enough, automatic candidate refill

**Cleanup Batch Drain Hold**:
The one non-renewable target pin replacing an expired interactive cleanup hold only for an already accepted running delete batch, ending at batch terminal or after five elapsed minutes with no new scope.
_Avoid_: Budget extension, new cleanup session, selected-item transaction pin

**Post-Cleanup Keep Decision Hold**:
The one non-renewable maximum-60-second target pin after a Covered batch result during drain, starting only when a usable renderer acknowledges the result and exposing one freshly checked explicit Keep Now request.
_Avoid_: Automatic Keep, new cleanup budget, hidden countdown

**Post-Cleanup Keep Confirmation**:
The compact final confirmation inside a Post-Cleanup Keep Decision Hold that shows exact target, newly protected/shared physical bytes and projected remaining reserve while the original deadline keeps running; only its host-accepted final request consumes the one attempt.
_Avoid_: Space reservation, paused countdown, attempt consumed on open

**Final Keep Commit Snapshot**:
The fresh atomic owner-and-volume evidence authoritative for a final Keep transition; it may differ from confirmation byte values without reconfirmation when target, ownership, integrity and volume identity remain valid and every Storage Safety Reserve still passes.
_Avoid_: Reserved confirmation bytes, exact snapshot equality, unsafe drift

**Keep Commit In Flight**:
The one non-renewable maximum-five-second transaction pin atomically replacing an on-time Post-Cleanup Keep Decision Hold after final confirmation, allowing only fresh admission and the pending-owner-to-Keep-owner commit or rollback.
_Avoid_: Decision extension, cancellable UI task, background Keep

**Recovered Keep Commit Result**:
The one path-free Storage Management result after startup reconciles an interrupted Keep commit as durably Kept or still Pending, retained until one usable viewing opportunity or 24 elapsed hours without retrying or pinning the copy.
_Avoid_: Keep retry, activity history, recovery retention extension

**Keep Recovery Safety Gate**:
The target-only owner-safety gate retaining an interrupted managed copy when local evidence cannot prove Kept or Pending, blocking its automatic deletion and owner mutation without creating a Keep pin, volume slot or retry.
_Avoid_: Assumed Keep, indefinite cleanup hold, cross-target lock

**Delete Recovery-Protected Managed Copy**:
The irreversible single-target escape from an unrecoverable Keep Recovery Safety Gate, enabled only after a fresh complete owner scan proves no declared owner remains and exact package-name confirmation succeeds.
_Avoid_: Force Keep, batch cleanup, missing-record means unowned

**Blocking Managed Owner**:
A path-free installed, rollback, active-transaction or other managed-copy owner that disables recovery-protected deletion and routes only to its own normal lifecycle surface without transferring action authority.
_Avoid_: Force-remove target, recovery-page uninstall, owner path disclosure

**Recovery Owner Changed**:
The recovery-protected state after any owner generation invalidates a prior no-owner scan, requiring a new explicit complete scan and newly typed package-name confirmation with no remembered delete intent.
_Avoid_: Auto-rescan, delete when free, reused confirmation

**Recovery Owner Scan Validity Window**:
The non-renewable five-minute maximum from host completion of a no-owner recovery scan during which its absence proof may authorize final advanced-delete acceptance, ending earlier on any owner-generation invalidation.
_Avoid_: Confirmation timer, auto-renewed scan, late renderer acceptance

**Recovery-Protected Reference Removal In Flight**:
The one non-renewable maximum-five-second transaction after timely advanced-delete acceptance that commits only the ambiguous managed-reference and safety-gate removal before physical cleanup completes or enters Physical Reclaim Pending.
_Avoid_: Extended owner scan, package uninstall, physical-cleanup deadline

**Interrupted Recovery Delete Reconciliation**:
The one idempotent next-startup check that determines whether an interrupted recovery-protected reference removal durably committed without retrying its scan, confirmation or destructive write.
_Avoid_: Delete retry, missing record means deleted, restarted transaction

**Recovered Protected-Copy Delete Result**:
The path-free one-viewing-or-24-hour explanation that an interrupted advanced delete was proven Recovered As Deleted or Recovered As Protected and was reconciled rather than retried.
_Avoid_: Startup warning, cleanup authorization, activity history

**Recovery Delete Reconciliation Not Assessable**:
The target-only state used when authoritative evidence cannot prove whether an interrupted advanced reference removal committed, without treating byte or row presence as the answer.
_Avoid_: Delete failed, delete succeeded, missing reference means deleted

**Recovery Delete Reconciliation Safety Gate**:
The neutral target-scoped gate that blocks owner mutation and physical reclamation while an interrupted delete boundary is unprovable, without creating a reference, owner or completed-delete claim.
_Avoid_: Keep pin, restored reference, force-cleanup lock

**Finalize Unassessable Recovery Delete**:
The separately authorized escape that uses a fresh complete no-owner scan, stable target evidence and newly typed exact package name to normalize an unrecoverable interrupted-delete target into terminal deletion.
_Avoid_: Retry old delete, Force Cleanup, choose old outcome

**Unassessable Delete Finalization Owner Scan**:
The fresh complete managed-owner scan whose non-renewable absence proof may authorize Finalize Unassessable Recovery Delete without inheriting any old delete evidence.
_Avoid_: Reconciliation retry, cached no-owner list, scan repair

**Unassessable Delete Finalization In Flight**:
The one non-renewable maximum-five-second transaction after timely finalization acceptance that normalizes the ambiguous target reference, recovery gates and old journal into terminal deletion before separate physical cleanup.
_Avoid_: Extended owner scan, old delete retry, physical-cleanup deadline

**Interrupted Unassessable Delete Finalization Reconciliation**:
The one idempotent next-startup check that proves terminal finalization commit or restores neutral target safety without retrying the scan, confirmation or normalization write.
_Avoid_: Finalization retry, missing gate means deleted, restarted transaction

**Recovered Unassessable Delete Finalization Result**:
The path-free one-viewing-or-24-hour explanation that interrupted finalization was proven Recovered Finalization As Deleted or Recovered Finalization As Gated.
_Avoid_: Startup warning, new finalization authority, activity history

**Fresh Finalization Review Required**:
The neutral-gated state after an uncommitted finalization attempt that requires current recheck/repair and the entire owner-scan/confirmation flow before another manual attempt.
_Avoid_: Retry available, reused confirmation, permanent lockout

**Physical Reclaim Pending**:
The post-reference-commit state in which only current-owner-proven unowned managed bytes remain for idempotent physical cleanup, without repeating or extending the user's delete decision.
_Avoid_: Delete retry, logical bytes freed, automatic cache cleanup

**Retry Physical Reclaim**:
The explicit Storage Management action that runs the same fresh owner, volume and byte-identity checks before retrying only pending managed-byte cleanup.
_Avoid_: Delete again, Force Remove, retry reference deletion

**Physical Reclaim Retry Backoff**:
The coalesced active-app retry ladder of 1 minute, 5 minutes, 30 minutes and then at most every 6 hours for transient no-progress physical cleanup failures.
_Avoid_: Cleanup expiry, catch-up queue, delete retry timer

**Physical Reclaim Completed**:
The atomic terminal state reached only when every scoped managed-byte object is authoritatively Removed Now or Already Absent, clearing its pending scheduler without changing reference deletion.
_Avoid_: Missing path means success, projected bytes reclaimed, delete completed again

**Physical Reclaim Completed Result**:
The path-free one-viewing-or-24-hour explanation of actual Removed Now and Already Absent physical cleanup outcomes after pending state clears.
_Avoid_: OS notification, activity history, cleanup authority

**Physical Reclaim Completed As Shared**:
The terminal end of one deleted target's reclaim responsibility when every still-present scoped byte has another authoritative owner, with shared bytes retained and zero freed.
_Avoid_: Shared bytes deleted, cleanup abandoned, target ownership transferred

**Terminal Package-Copy Deletion Evidence**:
The minimal device-local proof of a terminal managed-copy reference deletion retained only while transaction, recovery, reclaim or result consumers still require it.
_Avoid_: Deletion history, permanent tombstone, user asset record

**Deletion Evidence Closure Check**:
The later clean-startup verification that a completed deleted target remains absent, has no dependent recovery state and leaves the current owner graph consistent before its terminal evidence is pruned.
_Avoid_: Byte deletion, startup cleanup prompt, missing row means safe

**Physical Reclaim Completion Summary**:
The per-volume presentation that combines same-generation reclaim completions into counts and actual/absent/shared totals while preserving each target result's independent viewing and expiry.
_Avoid_: Cross-volume total, shared result deadline, batch delete result

**Physical Reclaim Summary Paging**:
The 50-row lazy detail projection for a large reclaim summary whose authoritative all-member totals and viewing acknowledgement remain in the header snapshot.
_Avoid_: Result truncation, page-by-page safety acknowledgement, client-summed totals

**Physical Reclaim Summary Disclosure**:
The explicit, session-only expansion of a completion summary that defaults to a complete collapsed header and never auto-opens for size or outcome class.
_Avoid_: Attention-driven auto-expand, persistent page position, details required for acknowledgement

**Physical Reclaim Summary Header**:
The complete two-line projection of target total, actual reclaimed bytes, four mutually exclusive outcome counts and shared-retained bytes, including explicit zero values.
_Avoid_: Hidden zero, sampled package identity, client-derived aggregate

**Storage Byte Display**:
The shared Storage Management presentation of raw integer bytes using 1024-based IEC units for compact values and locale-grouped exact bytes for hover, focus and accessibility.
_Avoid_: `KB` for 1024 bytes, rounded value as accounting evidence, positive bytes displayed as zero

**Physical Reclaim Volume Label**:
The ephemeral path-free OS display name, same-name disambiguation ordinal or unavailable-volume ordinal shown for a reclaim summary while its opaque volume identity remains host-only.
_Avoid_: Mount path, UUID suffix, capacity-based disambiguation, persisted volume alias

**Volume Display Collision Group**:
Two or more distinct represented physical volumes whose normalized available display names are equal and therefore receive stable current-session ordinal suffixes.
_Avoid_: Generations treated as volumes, renumber on card expiry, hardware-derived suffix

**Latest Constituent Completion Time**:
The maximum authoritative completion instant in one frozen reclaim-summary snapshot, used both as the newest-first ordering key and the header's localized Latest Completed explanation.
_Avoid_: Renderer receipt time, expiry deadline, relative age countdown

**Reclaim Detail Completion Time**:
The authoritative completion instant of one expanded target row, formatted like the header time while leaving alphabetical order and page boundaries unchanged.
_Avoid_: Page-load time, time-sorted rows, relative age timer

**Reclaim Detail Byte Pair**:
The per-target Actual Reclaimed and Shared Retained raw byte values whose full-snapshot sums independently equal their authoritative header totals.
_Avoid_: Loaded-page total, absent historical size, per-owner apportionment

**Physical Reclaim Outcome Filter**:
The single selected outcome class that asks the host for alphabetically paged details across one complete frozen summary snapshot while leaving its header and acknowledgement unfiltered.
_Avoid_: Loaded-page filter, filtered header total, persistent saved filter

**Physical Reclaim Page Navigation**:
The fixed First/Previous/direct-page/Next/Last controls for an outcome-filtered 50-row detail projection, hidden for one-page results and rejecting invalid page input without a request.
_Avoid_: Clamped page input, exhaustive page buttons, Load More

**Physical Reclaim Page Window**:
The current-session renderer-memory window containing at most the exact previous, current and next 50-row pages for one reclaim summary and selected outcome filter.
_Avoid_: Disk page cache, cross-filter reuse, retained jump history

**Physical Reclaim Demand Page Load**:
The explicit cache-miss page request that keeps the committed reclaim rows visible until an exact whole-page response succeeds and otherwise restores controls with inline retry.
_Avoid_: Empty loading page, full-detail skeleton, failed request replaces rows

**Physical Reclaim Manual Page Retry**:
The explicit single-flight re-request for the same failed reclaim detail page, with no automatic retry, attempt cap, backoff, escalation or durable failure count.
_Avoid_: Hidden retry loop, overlapping page requests, permanent retry lockout

**Physical Reclaim Demand Page Deadline**:
The 10-second monotonic renderer deadline after which one demand-page request becomes permanently stale and any late response is ignored rather than rendered or cached.
_Avoid_: Wall-clock timeout, late cache fill, revived expired request

**Physical Reclaim Page Navigation Focus Origin**:
The initiating keyboard pagination control restored after one page request resolves, with boundary-disabled origins falling back to the current-page input and outcomes announced separately.
_Avoid_: Auto-focus first row, pointer focus jump, focus restored into obsolete summary

**Unpin Kept Package Copy**:
An explicit user action that atomically replaces a Keep pin with a new seven-day Awaiting Install Decision owner without deleting the managed package bytes.
_Avoid_: Delete managed copy, cache eviction, immediate cleanup

**Retention Time Not Assessable**:
The path-free state that pauses automatic pending-package cleanup after a significant host-clock anomaly rather than shortening or corrupting the promised retention window.
_Avoid_: Package time invalid, trusted-time conflict, cleanup failure

**External Package Diagnostic Summary**:
A bounded, resettable, device-local set of coarse path-free failure counters with no per-event rows or linkage to a package, user selection, filename, path, digest or time.
_Avoid_: External package history, audit trail, telemetry event log

**Prolonged Trust Refresh Notice**:
One dismissible passive Model Library/AI Console banner per trust-root/channel stale episode after more than seven days without newly verified metadata; it never becomes an OS notification or changes execution trust.
_Avoid_: Security alert, repeated refresh toast, model disabled warning

**Model Update Candidate**:
A newer immutable Model Artifact Manifest related to an installed checkpoint/variant but not downloaded, installed, selected or trusted by version number alone.
_Avoid_: In-place replacement, automatic update, mutable latest revision

**Model Update Plan**:
A pre-download plan showing exact source/target artifact, bytes, disk, rollback retention, license/account/dependency changes, compatibility and analysis/index implications.
_Avoid_: Release note only, aggregate download button, activation consent

**Model Activation Preview**:
The trusted comparison shown before selecting an installed model update or variant, including result generation/equivalence, resource/runtime changes and migration requirements.
_Avoid_: Install confirmation, automatic selection, reanalysis job

**Model Rollback Window**:
The bounded visible post-selection period that pins the immediately previous active artifact so future-analysis assignment can be restored without deleting either generation's results.
_Avoid_: Installer transaction rollback, result retention window, embedding index merge

**Model Artifact Installer**:
The transactional downloader and verifier that stages catalog-declared model files, validates identity/digests/runtime compatibility, and atomically promotes them without reading user assets.
_Avoid_: Runtime package executor, arbitrary repository clone, inference service start

**Local Model Import Request**:
An explicit trusted-picker operation granting bounded read-only inspection of exactly one user-selected model file or directory without wider filesystem discovery.
_Avoid_: Model-root scan, Downloads crawl, persistent folder watch

**Model Import Preview**:
The path-free pre-write report of local files, format/identity evidence, unsupported content, logical/deduplicated/new bytes, license/trust state, dependencies and probe availability.
_Avoid_: Import completion, model activation, filename inference

**Catalog-Matched Local Artifact**:
A locally selected artifact whose complete roles, sizes and digests exactly match a current signed catalog manifest after current trust and license checks.
_Avoid_: Similar filename, partial match, official authorship

**Unverified Local Model**:
A managed data-only local import lacking a complete trusted manifest identity, leaving unsupported fields Unknown and activation unavailable until an approved loader and safe probe exist.
_Avoid_: Unsafe model, automatically trusted model, guessed family

**Local Model Import Provenance**:
A non-path record of acquisition method, import time, opaque source kind, file digests, validator version and catalog-match/unknown result.
_Avoid_: Full source path, publisher claim, analysis result provenance

**Model Artifact Package**:
An immutable data-only package of exact verified model weights and allowlisted declarative tokenizer, configuration or label resources without executable repository code.
_Avoid_: Extension package, mutable repository snapshot, Python environment

**Model Family**:
The user-facing architecture or product lineage grouping related trained checkpoints without implying that sizes, versions or variants produce interchangeable results.
_Avoid_: Model checkpoint, provider, flat artifact row

**Model Checkpoint**:
One immutable trained model identity and semantic size/version before packaging into quantization, container, backend or platform variants.
_Avoid_: Mutable repository, artifact variant, active model assignment

**Model Artifact Variant**:
One exact Model Artifact Manifest for a checkpoint's container, quantization, runtime/backend, accelerator or platform form.
_Avoid_: Model family, display alias, equivalent result assumption

**Hardware Variant Recommendation**:
An evidence-based ranked model variant suggestion using verified platform, runtime, accelerator, RAM/VRAM and disk state without downloading or selecting it.
_Avoid_: Automatic install, hardware guess, compatibility guarantee

**Model Blob Store**:
The application-managed content-addressed store that keeps each verified immutable model file once while manifests retain separate identity, license, trust and reference state.
_Avoid_: Model cache, shared mutable directory, repository checkout

**Model Storage Root**:
A user-selected application-managed internal or removable local-volume root owning model manifests, immutable blobs, references, rollback pins and transaction journals without acting as an import folder.
_Avoid_: Model source directory, framework cache, watched folder

**Model Derived Cache Root**:
An optional separately located managed root for rebuildable compiled, converted or backend-optimized model derivatives with independent budget and cleanup.
_Avoid_: Model blob store, analysis proxy cache, original model package

**Model Storage Identity**:
An application-created opaque root identity plus schema/integrity metadata used to distinguish the intended managed store from the same path, label, drive letter or mount point on another volume.
_Avoid_: Filesystem path, volume label, model manifest identity

**Model Storage Migration Plan**:
A dry-run, user-confirmed, journaled copy/verify/atomic-switch/rollback plan reporting identities, bytes, reserve, filesystem evidence, active pins and old-root cleanup scope.
_Avoid_: Settings path edit, automatic move, cache cleanup

**Model Storage Unavailable**:
The non-destructive state in which a configured model root is offline, wrong-identity, read-only, unreconciled or otherwise unusable without treating its models as uninstalled.
_Avoid_: Model deletion, artifact corruption, automatic redownload

**Model Storage Reconciliation**:
The reconnect or post-migration verification of root identity, schema, journals, manifest/references, trust and active/requested blob digests before restoring availability.
_Avoid_: Path existence check, disk scan, model readiness alone

**Cross-Variant Equivalence Evidence**:
Capability- and runtime-scoped fixture proof that two exact model artifact variants preserve declared weights/input/output behavior, calibration and tolerances sufficiently to share result-generation semantics.
_Avoid_: Same family, near-lossless label, matching dimensions alone

**Model Artifact Manifest**:
A signed exact model identity containing immutable source revision, relative file roles, formats, sizes and digests plus license, architecture, quantization, runtime and model-space evidence.
_Avoid_: Repository name, latest tag, directory listing

**Declarative Model Format**:
A structurally validated non-executable model or support-data container such as approved safetensors, GGUF, ONNX, tokenizer or bounded configuration roles.
_Avoid_: Safe by extension alone, pickle object, repository script

**Model Runtime Capability Pack**:
A separately installed, permissioned and isolated extension capability implementing approved custom model architecture, preprocessing, operators or runtime code without being embedded in model weights.
_Avoid_: Model artifact, trust-remote-code repository, install hook

**Model Catalog Trust Root**:
A distinct official or user-approved signing identity governing immutable model manifests, source metadata, updates and revocation without granting trust to executable code.
_Avoid_: Extension catalog trust root, repository domain, arbitrary model URL

**Model Trust Statement**:
A signed monotonic model-catalog record scoping an artifact, digest, runtime/capability, result generation or publisher/source identity to security revocation, analysis suspension, delisting, result review or recovery.
_Avoid_: Release note, model error, extension trust statement

**Critical Model Security Revocation**:
An immediate non-overridable official-build block on model install/load/analysis for supply-chain compromise, malicious data, parser exploitation, exfiltration or equivalent severe risk.
_Avoid_: Correctness warning, catalog delisting, missing runtime

**Model Analysis Suspension**:
A block on new model work and promotion of in-flight outputs while credible privacy, correctness, calibration, compatibility or integrity evidence is reviewed.
_Avoid_: Model uninstall, result deletion, security-malware classification

**Model Catalog Delisting**:
A non-security removal that stops new official installs/updates and marks a model unsupported without disabling an already verified license-permitted local artifact by itself.
_Avoid_: Security revocation, license acceptance deletion, active-model switch

**Last Verified Model Trust State**:
The newest monotonic signed model trust decision retained for offline enforcement without allowing network loss, old cache, clock change or reinstall to clear it.
_Avoid_: Catalog freshness alone, live model health, permanent online requirement

**Model Source Account**:
An opaque user-authorized relationship with a gated artifact provider scoped to declared repository access rather than an application, plugin or browser-session identity.
_Avoid_: App account, website cookies, model runtime credential

**Model Source Credential Vault**:
An operating-system-backed protected store for long-lived gated-model provider credentials with no plaintext SQLite, settings, file or log fallback.
_Avoid_: Auth-state file, environment variable, plugin secret storage

**Download Credential Lease**:
A short-lived read-only secret grant from the trusted broker to one artifact transport scoped to provider, repository, immutable revision and exact manifest files.
_Avoid_: Global token, command-line argument, renderer IPC payload

**Model License Acceptance**:
A non-secret record binding user confirmation to publisher, model/checkpoint, immutable revision or coverage, license identifier, terms version and digest.
_Avoid_: Source authentication, permission grant, blanket publisher acceptance

**Continuous Model Entitlement Requirement**:
A pre-install disclosed need for periodic or continuous provider contact specifying hosts, cadence, data categories, offline behavior and license consequence without sending model inputs or results.
_Avoid_: Silent phone home, external inference, source download authentication

**Model Derived Runtime Cache**:
A separately keyed rebuildable cache for compiled, converted, quantized, repaired or backend-optimized derivatives with source-manifest and toolchain provenance.
_Avoid_: Modified installed model, analysis proxy cache, original weights

**Download and Install Activity**:
A shared path-free progress vocabulary for user-triggered extension and model transfers, verification, staging, activation, rollback, cancellation, and repair.
_Avoid_: Capture Activity, raw subprocess log, private path display

**Extension API**:
The independently versioned public manifest, permission, RPC, UI-slot, lifecycle, error and worker-protocol contract supported for external extension developers.
_Avoid_: Internal TypeScript interface, private IPC channel, Electron object exposure

**Extension API Compatibility Window**:
The published stable, supported, deprecated and end-of-support schedule for negotiated public contracts; experimental pre-release contracts are explicitly unstable and do not imply an unpublished support duration.
_Avoid_: Application version range, indefinite support promise, undocumented removal

**Declared Extension API Range**:
The bounded manifest range of public Extension API versions against which Extension Host negotiates before loading any plugin code.
_Avoid_: Unbounded wildcard, application version, private interface fallback

**Negotiated Extension API Version**:
The highest mutually supported stable Extension API version selected and recorded for one activated plugin instance.
_Avoid_: Plugin package version, guessed compatibility, native ABI

**Extension Compatibility Preflight**:
A no-plugin-execution check before application or plugin update that reports API, protocol, optional capability, trust, platform, confinement and native-target compatibility.
_Avoid_: Runtime probe with user assets, automatic plugin migration, app update veto

**Native Extension Target**:
The declared operating-system family/minimum version, CPU architecture, package/runtime ABI, entrypoint identity and confinement adapter required by one native extension artifact.
_Avoid_: Extension API range, filename suffix, cross-platform assumption

**Extension Host**:
The trusted official-build supervisor that negotiates capabilities and brokers permission-checked calls to isolated execution cells without running third-party code itself or exposing application internals.
_Avoid_: Main renderer import, unrestricted Node process, SQLite access

**Extension Execution Cell**:
A per-plugin isolated UI or worker boundary supervised by Extension Host that cannot share application or other-plugin memory, globals, handles, credentials, or crash state.
_Avoid_: Main-process plugin, shared third-party worker pool, internal module import

**Isolated Extension UI**:
An application-owned sandboxed renderer surface for one plugin's declared UI Slot with no Node/Electron, main DOM, direct network, arbitrary navigation, or renderer-store access.
_Avoid_: Trusted app UI, iframe with ambient authority, renderer component import

**Platform Confinement Evidence**:
The platform/architecture-specific proof that an Extension Execution Cell enforces its declared filesystem, network, process, message, resource, cleanup, and crash boundaries.
_Avoid_: Package signature, successful launch, permission consent

**Extension Failure Budget**:
The versioned bounded policy for plugin crashes, timeouts, malformed responses, invalid output, forbidden access, and attempted capability escape before automatic quarantine.
_Avoid_: Global app crash count, silent infinite restart, user-content telemetry

**Extension Quarantine**:
The disabled plugin state entered after its failure budget is exhausted or a severe isolation violation occurs, requiring explicit repair, update, uninstall, or probationary user re-enable.
_Avoid_: Package quarantine download folder, permission denial, automatic retry

**Extension Developer Mode**:
An explicitly enabled local workflow for unsigned unpacked extension validation, reload and structured logs with persistent untrusted status and retained isolation.
_Avoid_: Production trust bypass, arbitrary remote install, disabled permissions

**Community Extension**:
A third-party package retaining its own publisher, license, source and support identity while using the public Extension API and catalog compatibility review.
_Avoid_: First-party ownership, unreviewed arbitrary URL, fork restriction

**Official Catalog Review**:
Version-specific evidence that an extension passed the official catalog's declared identity, package, permission, protocol, dependency, platform, confinement, and applicable security checks.
_Avoid_: Defect-free guarantee, project authorship, permanent approval

**Extension Trust Statement**:
A signed monotonic trust-root record scoping an extension or publisher identity to a critical revocation, safety suspension, catalog delisting, or newer recovery decision.
_Avoid_: Unsigned warning, permission choice, ordinary catalog snapshot

**Critical Security Revocation**:
An immediate non-overridable official-build execution block for confirmed malicious behavior, publisher-key compromise, capability escape, or another severe vulnerability.
_Avoid_: Ordinary delisting, plugin crash quarantine, unsupported version

**Safety Suspension**:
A temporary execution block for credible data-corruption, privacy, compatibility, or dependency risk that permits only trusted host-owned recovery actions.
_Avoid_: Permission denial, maintenance end, automatic retry

**Catalog Delisting**:
A non-security catalog removal that stops new official installs and updates and marks existing installations unsupported without disabling a verified installed version by itself.
_Avoid_: Security revocation, uninstall, publisher-key compromise

**Last Verified Extension Trust State**:
The newest monotonic signed trust state persisted for offline enforcement without treating network loss, clock change, or older cached metadata as clearance.
_Avoid_: Live network status, unsigned cache, permanent freshness guarantee

**Extension Recovery Export**:
A trusted host-generated versioned export of user-authored Namespaced Extension Storage made without executing suspended or revoked plugin code and excluding caches, credentials, paths, and unrelated data.
_Avoid_: Plugin-run migration, full package export, secret backup

**Open-Source Community Extension**:
A community extension with a public pinned source revision, declared open-source license, build/dependency instructions, and displayed reproducible-build status.
_Avoid_: Source-available proprietary code, first-party extension, unsigned package

**Verified Proprietary Extension**:
A clearly labeled closed-source or commercial extension admitted only with verified publisher/signing identity and review evidence sufficient for its declared capabilities and risk.
_Avoid_: Open-source community extension, paid means trusted, undisclosed binary

**External Extension Entitlement**:
A publisher-operated purchase or authorization result obtained outside the v1 catalog payment flow without giving application UI, catalogs, logs, other plugins, or ordinary plugin storage raw payment or license credentials.
_Avoid_: In-app purchase, namespaced-storage secret, official license server

**Catalog Trust Root**:
A user- or distributor-approved publisher key and catalog identity governing signatures, updates and revocation independently from package URLs.
_Avoid_: Domain name alone, unsigned index, universal trust

**Extension Capability Grant**:
The activated plugin, contribution surface, permission, purpose and current-context authorization from which Extension Host issues bounded operation handles.
_Avoid_: Install means all access, permanent asset token, private IPC access

**Extension Capability Requirement**:
A manifest-declared stable capability identifier, compatible contract/version range, required/optional level and platform or fidelity constraints describing what a contribution needs without naming a provider plugin.
_Avoid_: Plugin ID dependency, direct import, runtime download command

**Extension Capability Offer**:
A versioned built-in or verified capability-pack implementation advertised through the host registry with compatibility, trust, health and confinement evidence.
_Avoid_: Private plugin RPC, package presence alone, ambient service discovery

**Extension Capability Binding**:
The recorded host-mediated match between one requirement and one compatible offer for a contribution or operation without exposing provider internals to the consumer.
_Avoid_: Direct plugin call, permanent provider handle, hidden implementation dependency

**Dependency Install Plan**:
The fully expanded bounded pre-download plan showing every required or optional extension capability package/runtime, publisher, size, license, permission, trust and provider choice.
_Avoid_: Hidden recursive download, runtime self-install, aggregate size only

**Dependency Unsatisfied**:
The explicit non-crashing state in which a required public capability has no currently compatible, trusted, permitted, confined and healthy offer.
_Avoid_: Plugin failure, automatic fallback claim, cascade uninstall

**Managed Shared Runtime**:
A host-installed content-addressed verified immutable runtime mapped read-only into isolated cells without sharing writable code, processes, memory, credentials or private storage.
_Avoid_: Mutable global runtime, in-process library, plugin-owned dependency folder

**Ordinary Extension Permission**:
A bounded command, declared UI slot, namespaced storage, or derived-preview/metadata permission summarized before installation and remaining individually visible and revocable.
_Avoid_: Permission-free access, unrestricted asset read, implicit sensitive grant

**Sensitive Extension Permission**:
A separately confirmed grant for declared network hosts and purposes, browser DOM/content scopes, staged original-file access, or native/external worker execution.
_Avoid_: Install-time blanket consent, undeclared runtime request, trusted plugin UI prompt

**Effective Permission Set**:
The currently usable intersection of a plugin's declared manifest, publisher/package identity, user grants, platform capability, contribution context, and active trust or policy state.
_Avoid_: Manifest alone, historical approval, permanent authority

**Permission Reapproval Required**:
The suspended extension state entered when an update adds or materially broadens permissions and cannot activate until trusted application UI shows and receives approval for the exact permission diff.
_Avoid_: Silent scope expansion, inherited wildcard, automatic approval

**Scoped Asset Handle**:
An opaque expiring reference to allowlisted asset metadata or declared Broker visual units/views without revealing a local path or unrestricted original bytes.
_Avoid_: File path, database id as authority, reusable bearer token

**Extension UI Slot**:
A documented constrained application location and component/message contract in which an Inspector or command extension may render without importing renderer internals.
_Avoid_: Main DOM injection, workspace replacement, fake permission dialog

**Namespaced Extension Storage**:
Quota-bound plugin/library structured storage accessed through Extension Host with transactional migrations and explicit uninstall data handling.
_Avoid_: Raw SQLite, shared plugin directory, arbitrary filesystem access

**Embedded Composite Preview**:
A flattened representation embedded by a professional source format that may accelerate System Preview generation only after its dimensions and composition metadata are validated against the source.
_Avoid_: Untrusted thumbnail, guaranteed current render, original layers

**Preview Broker**:
The single backend preview contract that detects a staged original's real format, routes it to an isolated declared worker, validates output, and records decoder provenance.
_Avoid_: Universal decoder, renderer file loader, operating-system thumbnail call

**Format-Specific Preview Worker**:
An isolated decoder or renderer lane with explicit formats, resource limits, dependencies, fidelity evidence, and cross-platform fixtures.
_Avoid_: Arbitrary subprocess, ImageMagick for everything, file-extension switch

**Preview Fidelity Evidence**:
The recorded worker, decoder version, capability revision, composite source, validation result, and known limitations supporting a System Preview claim.
_Avoid_: Successful open, generic thumbnail, hidden fallback

**Analysis Visual Source**:
The Preview Broker-produced or validated visual pixel source consumed by every AI provider after composition, orientation, dimensions, alpha evidence, decoder provenance, and color state are established; it is normally color-managed sRGB when authoritative color evidence exists and explicitly Unprofiled otherwise.
_Avoid_: Arbitrary original path, model-specific decoder, universal 512px thumbnail

**Analysis Intent**:
A durable lightweight desire for one owner/capability/source/recipe/coverage generation containing no file path, pixels, proxy, tensor, credential or preselected mutable model path.
_Avoid_: Analysis execution job, cached input, completed result

**Analysis Execution Job**:
A concrete generation-keyed local work item created only after preview/model/runtime/storage/trust/resource admission and carrying exact artifact/runtime/recipe provenance.
_Avoid_: Waiting intent, model download, external analysis grant

**Analysis Waiting Reason**:
A typed non-terminal reason such as missing preview capability, model, runtime, model storage, trust/compatibility, system resources or user pause that does not imply failure or success.
_Avoid_: Generic queued, retry error, promotion blocker

**Pending Intent Reconciliation**:
The restart/event-driven process that re-evaluates waiting intents after verified capability, model, runtime, storage, trust, preview or resource changes without downloading or uploading automatically.
_Avoid_: Library reanalysis, model migration, proxy regeneration sweep

**Analysis Intent Supersession**:
The replacement of stale unstarted intent/job work when its source, recipe or coverage generation changes, preserving committed evidence and avoiding duplicate queue growth.
_Avoid_: Result deletion, job retry, model update activation

**Baseline Automatic Analysis Profile**:
The bounded automatic local model-capability set for new or materially changed supported non-text visual assets: Tag Suggestions, semantic Embedding, bounded OCR and one Short Description; it is not the complete AI+ Core Experience.
_Avoid_: Exhaustive coverage, external AI, library backfill

**Automatic Analysis Capability Toggle**:
The master or per-capability user control that governs new automatic intents and pauses existing automatic intents without deleting completed results or user-authored values.
_Avoid_: Model selection, result deletion, provider credential

**Idle Extended Analysis**:
An opt-in resource-aware policy for exhaustive pages/artboards, large-canvas detail, extended OCR/captions, frames, layers or ensembles outside the baseline.
_Avoid_: Default baseline, foreground request, automatic external analysis

**Analysis Backfill Plan**:
A user-confirmed preview for selected, collection or library-wide historical capability analysis showing scope, current/stale/excluded/waiting counts, units, compute, storage and migration implications.
_Avoid_: Enabling a toggle, model install, silent library sweep

**Valid Empty Analysis Result**:
A capability-specific successful abstention such as no text or no qualifying suggestions with completed scope, model/recipe, threshold/reason and coverage evidence.
_Avoid_: Missing output, model failure, incomplete coverage

**Analysis Recipe**:
The versioned model-input transformation that declares overview, page, artboard, frame, crop, or tile scope together with resize, padding, alpha, channel, normalization, and encoding behavior.
_Avoid_: Model name alone, mutable implicit defaults, persisted model thumbnail

**Analysis Proxy Cache**:
A shared content-addressed, budgeted, short-lived cache for reproducible AI input proxies used only when repeated work justifies disk reuse.
_Avoid_: System preview store, per-model permanent cache, durable AI result store

**Analysis Unit**:
A stable page, artboard, composite, frame time, crop, or tile scope selected from a structured visual asset for one reproducible model-input operation.
_Avoid_: Filename-only scope, mutable page position, entire asset by implication

**Analysis Coverage Plan**:
The deterministic, versioned selection of Analysis Units for overview, bounded sampling, or explicitly requested exhaustive page or artboard analysis.
_Avoid_: Hidden sampling, semantic importance guess, every layer by default

**Analysis Coverage Evidence**:
The total, selected, omitted, failed, and completed visual scope proving whether AI results have Complete, Partial, or Failed coverage.
_Avoid_: Any-result-means-complete, thumbnail-only claim, unrecorded skipped units

**Alpha Evidence**:
The validated alpha-channel state, opacity coverage, content bounds, interpretation provenance, and failure evidence carried from Preview Broker into preview and AI analysis.
_Avoid_: Transparency discarded, inferred background, color-profile evidence

**Analysis Input View**:
One reproducible RGB presentation of an Analysis Unit for a model, including a declared background variant when source transparency requires multiple related views.
_Avoid_: Separate asset, permanent model thumbnail, unversioned matte

**Alpha Compositing Recipe**:
The versioned definition of background values, color handling, alpha interpretation, and edge behavior used to create transparent-source Analysis Input Views.
_Avoid_: Checkerboard model input, implicit white background, renderer CSS composition

**View-Level Analysis Evidence**:
The bounded normalized AI result and provenance for one model, recipe, Analysis Unit, and Analysis Input View, retained independently from ephemeral input images.
_Avoid_: Asset summary only, full provider transport dump, cached input image

**Asset Analysis Projection**:
A versioned, reproducible asset-level aggregation derived from compatible View-Level Analysis Evidence for ordinary tags, summaries, search, and similarity.
_Avoid_: Evidence overwrite, irreversible flattening, highest-confidence-wins shortcut

**Aggregation Disagreement**:
An explicit result state showing that related units, views, or calibrated providers materially disagree and that no silent winner was selected.
_Avoid_: Hidden conflict, empty result, model failure

**Pooled Asset Embedding**:
A reproducible asset-level search vector derived from identified unit or view embeddings under a versioned pooling recipe and explicit coverage state.
_Avoid_: Untraceable average, only stored embedding, complete-coverage claim from sampling

**Local Baseline Analysis**:
The non-blocking automatic overview analysis performed only with already-available in-process or approved local capabilities after an Analysis Visual Source is ready.
_Avoid_: External upload, exhaustive detail analysis, model installation

**Deferred Detail Analysis**:
Resource-aware background or user-requested work for exhaustive units, large-canvas tiles, extended OCR, detailed captions, or other expensive recipes.
_Avoid_: Capture blocker, invisible dropped task, immediate baseline

**Analysis Admission Controller**:
The scheduler gate that starts, pauses, or defers Analysis Units according to memory, disk, power, thermal, foreground load, capability, concurrency, and job priority evidence.
_Avoid_: Fixed timer only, task deletion, simulated completion

**External Analysis Grant**:
An explicit provider-, purpose-, asset-, unit-, input-view-, and coverage-scoped user authorization to transmit declared derived visual inputs for one visible action or batch.
_Avoid_: Saved credential, provider enabled, permanent upload consent

**Promotion Analysis Handoff**:
The transactional reassociation of durable analysis jobs, evidence, coverage, and active projections from Candidate context to a promoted Design Asset without restarting analysis.
_Avoid_: Cancel on promotion, duplicate model call, path-based job identity

**Await Analysis**:
An explicit cancellable constraint on one visible promotion action or batch that names the optional recipes and coverage to await without redefining ordinary Promotion Readiness.
_Avoid_: Global default, inferred AI gate, exhaustive analysis by implication

**User-Authored Analysis Value**:
A user-added or user-corrected tag, scoped OCR text, description, or validated embedding attachment that remains independent from superseded AI generations.
_Avoid_: AI suggestion, untyped vector, silent model overwrite

**Result Suppression**:
A content-free marker for a manually deleted internal evidence identity that prevents the same projection or queued generation from immediately restoring the removed result.
_Avoid_: Hidden result content, permanent model ban, asset deletion

**Generate or Attach Embedding**:
An explicit user action that creates or imports a vector only with declared model space, dimensions, normalization, scope, and recipe evidence.
_Avoid_: Free-form numeric input, unknown vector space, automatic external upload

**Active Capability Model**:
The single local model and version selected for one automatic capability such as tagging, OCR, captioning, or embedding.
_Avoid_: Run every installed model, external automatic fallback, backend name alone

**Capability Fallback Chain**:
An ordered list of compatible local alternatives invoked only after primary unavailability or an eligible structured failure, with fallback reason retained.
_Avoid_: Model ensemble, confidence boosting, hidden provider switch

**Active Embedding Space**:
The one library-search vector space defined by model, tokenizer, input recipe, dimensions, normalization, distance metric, and index schema.
_Avoid_: Mixed CLIP/SigLIP index, cross-space score comparison, model label only

**Embedding Space Migration**:
A resource-aware rebuild into a separate target index that atomically replaces the active embedding space only after coverage and validation gates pass.
_Avoid_: In-place vector mixing, search downtime by deletion, partial silent switch

**Analysis Result Migration**:
An explicit scoped, previewed, resource-aware reanalysis from one model/recipe generation to another for selected assets, a collection, or the library.
_Avoid_: Model-update side effect, hidden full-library job, user-metadata overwrite

**Model Result Advisory**:
A non-blocking scoped model/output-quality notice attached to a committed result generation without hiding, de-ranking, removing or deleting its values from projections/search.
_Avoid_: Invalidated result, automatic suppression, forced reanalysis

**Model Advisory Summary**:
The aggregate AI Console status for affected model generations/capabilities and future-execution/remediation state, linking management back to Model Library.
_Avoid_: Result warning list, asset notification, runtime error

**Result Provenance Advisory**:
The lightweight Asset Inspector marker beside an affected result's model/generation provenance without changing the asset card or result behavior.
_Avoid_: Asset warning badge, corrupt asset state, primary status

**Has Model Result Advisory**:
An explicit default-Off advanced filter condition selecting advisory-bearing generations without changing ranking, content or acknowledgement state.
_Avoid_: System Smart Filter, unresolved review queue, hidden exclusion

**Model Advisory Acknowledgement**:
The explicit Keep Existing Results decision that resolves centralized advisory attention for one reviewed semantic scope while preserving provenance and result behavior.
_Avoid_: Delete results, trust override, read receipt

**Model Advisory Semantic Fingerprint**:
The canonical response/severity, reason, artifact/generation/capability scope and material-remediation identity used to prevent duplicate refreshes from reopening acknowledged attention.
_Avoid_: Catalog sequence, localized message, release timestamp

**Review Model Advisory Again**:
The explicit action restoring centralized attention for a resolved advisory without changing committed result state.
_Avoid_: Reopen result, rerun model, clear acknowledgement

**Portable Library Lineage Identity**:
The stable logical library lineage preserved through Full Library Backup/Restore and independent of physical path, device, local database row or display name.
_Avoid_: Library folder, device id, local instance id

**Local Library Instance Identity**:
The identity intended to distinguish one physical opened/restored library instance from other copies that share a Portable Library Lineage Identity and do not synchronize automatically. A raw filesystem copy that duplicates this value remains unresolved until explicit copy adoption assigns a distinct identity.
_Avoid_: Library lineage, database path, machine id

**Library Instance Identity Collision**:
The unresolved state where the same Local Library Instance Identity appears at more than one independently addressable Library Root without proof that the locations are aliases of one physical control boundary.
_Avoid_: Duplicate asset, same portable lineage, verified path alias

**Imported Advisory Decision History**:
Non-content provenance recording how a source library handled a model advisory without carrying acknowledgement authority into the target library.
_Avoid_: Target acknowledgement, merge conflict choice, global keep decision

**Covered By Target Acknowledgement**:
The merge classification for an imported advisory-bearing result whose exact semantic scope is already covered by the target library's own acknowledgement.
_Avoid_: Source acknowledged, same model, duplicate result

**Requires Target Review**:
The merge classification creating one grouped target-library advisory review because no exact target acknowledgement covers the imported result scope.
_Avoid_: Import conflict, blocked merge, per-asset warning

**Trust Not Assessed**:
The honest offline/import state where no target-application verified trust statement exists for an identity, without inferring safety, danger or changing committed results.
_Avoid_: Trusted, revoked, unknown model identity

**Post-Merge Trust Reconciliation**:
The later bounded signed-metadata-only refresh mapping current monotonic global trust state to imported library advisory provenance without packages or analysis.
_Avoid_: Merge retry, model repair, dependency restore

**New Material Trust Attention**:
A verified transition introducing a new execution block or materially new/reopened model result advisory, excluding freshness/no-change/recovery updates.
_Avoid_: Catalog refreshed, stale trust, existing warning

**Trust Attention Summary Notification**:
One deduplicated content-free system notification aggregating newly material model/runtime trust attention without model, asset or result details.
_Avoid_: Per-model alert, refresh success, vulnerability detail

**Trust Attention Navigation Intent**:
A short-lived replay-safe host-validated opaque request resolving current trust attention to AI Console, Model Library or the cross-scope summary.
_Avoid_: Deep-link URL, renderer route payload, asset/model identifier

**AI Execution Trust Status**:
The AI Console aggregate for currently blocked/suspended model/runtime execution, trust freshness and safe remediation entry points.
_Avoid_: Model result advisory, process log, automatic repair

**AI Trust And Advisory Summary**:
The current unresolved mixed or multi-library trust-attention router grouping global execution state and library-scoped advisories without becoming a durable notification center.
_Avoid_: Audit log, asset list, model catalog history

**AI Execution Security Notifications**:
The default-On device-local OS delivery preference for newly verified model/runtime execution containment without controlling the containment itself.
_Avoid_: Trust override, security disable, all AI notifications

**Model Result Advisory Notifications**:
The default-On device-local OS delivery preference for materially new model result advisories without changing in-app advisory or committed results.
_Avoid_: Hide advisories, result filter, model update alert

**Notification Permission Not Requested**:
The initial device state where class preferences exist but the app has not called the OS notification permission flow.
_Avoid_: Notifications disabled, permission denied, onboarding incomplete

**Notification Permission Primer**:
The one contextual app-owned explanation shown after an explicit enable action or long-operation confirmation before any OS permission request.
_Avoid_: System prompt, first-launch modal, recurring reminder

**Notification Permission Unavailable**:
The safe device state for denied, restricted, disabled or unsupported OS delivery without treating it as AI failure or repeatedly requesting access.
_Avoid_: Notification error, class preference Off, Focus mode

**Ordinary Application Notification Priority**:
The policy that trust, advisory and long-running-operation notifications use normal OS delivery with no emergency/time-sensitive entitlement, forced sound or Focus bypass.
_Avoid_: Critical alert, alarm channel, silent security enforcement

**Original Asset Storage**:
The library-owned ordinary-file storage in a Managed Originals Directory that holds activated Candidate Artifacts and Managed Asset originals independently from the application installation and device-local operational storage. It is protected from cache eviction, TTL, LRU, and generic cleanup.
_Avoid_: Application data, plugin storage, download staging, preview derivative, analysis proxy

**Required Preview Storage**:
Persistent replaceable System Preview media retained for normal viewing and professional-format fidelity, outside AI cache eviction.
_Avoid_: Original asset, temporary model input, generic thumbnail cache

**Auto Budget**:
The observable dynamic Analysis Proxy Cache byte target derived from volume capacity and free space while preserving Storage Safety Reserve.
_Avoid_: Original quota, fixed hidden limit, permission to delete active inputs

**Clean Analysis Cache Now**:
A user action that removes only unpinned reproducible Analysis Proxy Cache entries and reports reclaimed versus active-pinned bytes.
_Avoid_: Clear previews, delete AI results, remove models

**Source Color Profile**:
The color-space definition established by Authoritative Color Evidence or an explicit Sidecar Profile Assignment that determines how original Candidate Artifact color values should be interpreted; it is never inferred from pixel appearance.
_Avoid_: Preview gamut, display profile, color palette

**Color Evidence Pipeline**:
The backend sequence that extracts format metadata, validates color profiles, resolves conflicts, and records provenance before any color-managed preview conversion occurs.
_Avoid_: Pixel-color guessing, image classifier, preview renderer alone

**Authoritative Color Evidence**:
A valid embedded ICC Profile, explicit standardized format color description, or trusted non-conflicting EXIF or XMP color-space declaration that can establish a Source Color Profile.
_Avoid_: Visual resemblance, filename convention, default sRGB assumption

**Sidecar Profile Assignment**:
A reversible user decision that associates a Candidate or Design Asset with one validated Managed Color Profile without changing the original file or erasing its color evidence.
_Avoid_: Embedded profile rewrite, inferred profile, system display profile

**Managed Color Profile**:
An immutable validated ICC byte sequence stored by content hash so profile assignment and derived-media regeneration remain reproducible without relying on an external path.
_Avoid_: Profile filename, operating-system alias, mutable ICC reference

**Color Profile Store**:
The application-managed, content-addressed store that deduplicates Managed Color Profiles separately from originals and derived preview media.
_Avoid_: Asset library folder, system ICC directory, preview cache

**Color Derivation Generation**:
The atomic generation of previews, thumbnails, palettes, and other color-dependent results produced from one original plus one resolved Source Color Profile state.
_Avoid_: Original version, asset revision, mixed preview cache

**Preview Rendering Policy**:
The explicit rendering-intent and Black Point Compensation recipe used to transform a resolved Source Color Profile into tagged screen-preview destinations.
_Avoid_: Source color evidence, display gamut selection, automatic content classification

**Media-Relative Preview**:
The ordinary-preview policy using ICC media-relative colorimetric intent with Black Point Compensation enabled to preserve in-gamut relationships and adapt source and destination black ranges.
_Avoid_: Perceptual default, soft proof, unmanaged structural preview

**Rendering Intent Override**:
A user-selected departure from Media-Relative Preview, recorded as part of the next Color Derivation Generation rather than inferred from content or profile header alone.
_Avoid_: Automatic intent detection, source profile assignment, display setting

**Rendering Policy Override**:
A persisted per-item Preview Rendering Policy choice that replaces Media-Relative Preview only for the explicitly targeted Candidate or Design Asset and remains reversible.
_Avoid_: Global library default, inherited collection policy, temporary viewer toggle

**Rendering Policy Preset**:
A reusable named rendering-intent and Black Point Compensation recipe that has no effect until the user explicitly applies it to selected items.
_Avoid_: Automatic rule, global default, background migration

**Batch Profile Assignment**:
A reviewed batch action that applies one explicitly selected Managed Color Profile only to individually compatible Candidates or Design Assets.
_Avoid_: Inferred batch profile, forced assignment, folder default

**Profile Compatibility Preflight**:
The item-level validation of color model, channels, decoded sample representation, format worker, and transform support before a Sidecar Profile Assignment may execute.
_Avoid_: Extension check, visual similarity, post-write validation

**Unprofiled Color**:
The explicit state for an original with no Authoritative Color Evidence; it means color accuracy is unknown and does not assign an implicit sRGB, Display P3, or generic CMYK source profile.
_Avoid_: Invalid profile, sRGB by default, preview unavailable

**Invalid Color Profile**:
The evidence state in which an embedded or declared color profile fails structural or semantic validation and therefore cannot authorize a color transform; it is further classified as recoverable metadata failure or a safety failure.
_Avoid_: Unprofiled color, decoder failure, unsupported format

**Recoverable Invalid Color Profile**:
An Invalid Color Profile whose failure is confined to color metadata while independent checks confirm the original structure, pixels, composition decode, and Candidate Artifact remain safe and intact.
_Avoid_: Unprofiled color, safe ICC profile, color evidence safety failure

**Color Evidence Safety Failure**:
A blocking result where isolated, resource-limited color evidence inspection cannot safely complete because malformed data, truncation, parser boundary failure, or excessive resource behavior may affect file integrity or processing safety.
_Avoid_: Recoverable invalid color profile, missing profile, ordinary color conflict

**Invalid Color Profile Review**:
The Promotion Sheet decision that lets a user explicitly ignore a Recoverable Invalid Color Profile and retain its warning, or supply a separately validated Source Color Profile without rewriting the original.
_Avoid_: Automatic repair, silent profile removal, safety bypass

**Color Profile Conflict**:
The evidence state in which otherwise usable color declarations disagree materially and no lower-confidence declaration may silently override the conflict.
_Avoid_: Duplicate profile metadata, gamut mapping, unprofiled color

**Color Profile Conflict Review**:
The Promotion Sheet decision that lets a user inspect conflicting color evidence, explicitly select one valid Source Color Profile, or knowingly promote with the conflict unresolved.
_Avoid_: Automatic profile precedence, inferred profile, silent conflict dismissal

**Unmanaged Structural Preview**:
An automatically generated composition and content preview used when no resolved Source Color Profile exists, whose decoder and evidence provenance are recorded while color accuracy remains explicitly unknown.
_Avoid_: Color-managed master preview, source profile assignment, preview placeholder

**Color Accuracy Warning**:
A persistent non-blocking candidate or asset status showing that an Unmanaged Structural Preview is available but displayed color has not been verified by Authoritative Color Evidence.
_Avoid_: Preview generation failure, permanent review signal, inferred source profile

**Color-Managed Render Source**:
The resolved source-profile and pixel interpretation used by an isolated worker to produce tagged overview, quick-preview, tile, or AI raster output without rewriting the original.
_Avoid_: Untagged bitmap, forced sRGB assumption, permanent master file

**P3 Preview Variant**:
A tagged Display P3 quick-preview or lazily rendered tile variant generated only for source color with useful wide-gamut evidence and verified display output.
_Avoid_: Relabeled sRGB, source profile, permanent full-size requirement

**Wide-Gamut Rendering Degraded**:
A non-blocking state in which validated sRGB overview/rendering remains available but P3 Preview Variant rendering is pending or failed with a recorded cause.
_Avoid_: System preview unavailable, unprofiled color, active P3 presentation

**sRGB Preview Variant**:
A tagged sRGB overview, quick-preview, or lazily rendered tile used on sRGB or unknown-capability displays and as the readiness baseline when color evidence supports transformation.
_Avoid_: Clipped P3 bytes, original color conversion, universal full-size preview

**Display Gamut Selection**:
The runtime choice between compatible P3 and sRGB preview output variants based on verified output-device and renderer capability.
_Avoid_: Operating-system guess only, source format selection, manual file conversion

**Preview-Dominant Display**:
The display containing a clear majority of the visible preview region and therefore eligible to provide Output Gamut Evidence for runtime derivative selection.
_Avoid_: Primary display, cursor display, window-origin display

**Output Gamut Evidence**:
The corroborated main-process display color-space and renderer output-capability state used to authorize P3 Preview Variant presentation.
_Avoid_: Display model guess, source profile, CSS syntax support alone

**Gamut Selection Hysteresis**:
The settling and boundary-stability rule that prevents rapid P3/sRGB derivative switching while a preview moves across displays.
_Avoid_: Image transition animation, regeneration delay, fixed primary display

**Gamut Mapping State**:
Inspector-visible evidence describing the source profile, active preview gamut, and whether color values were mapped into a smaller display gamut.
_Avoid_: Color palette, image filter, asset tag

**Capture Request Identity**:
The stable identity of a capture submission that lets retries refer to the same intent without creating another Asset Candidate.
_Avoid_: Candidate Identity, Download Task identity, source URL

**Canonical Capture Envelope**:
The normalized representation of stable capture source, artifact locator, capture method, and metadata intent used to compare submissions under one Capture Request Identity.
_Avoid_: Raw transport payload, content hash, source URL alone

**Idempotent Capture Replay**:
A repeated submission with the same Capture Request Identity and an equivalent Canonical Capture Envelope that returns the existing Candidate Identity and lifecycle state without creating another Candidate Record.
_Avoid_: New capture, duplicate candidate, acquisition retry attempt

**Capture Identity Conflict**:
A rejected submission that reuses an existing Capture Request Identity with materially different capture intent and therefore cannot overwrite or mutate the accepted request.
_Avoid_: Duplicate signal, metadata conflict, retryable acquisition failure

**Capture Gateway**:
The single product boundary through which every Capture Producer submits a Capture Envelope and receives the corresponding Candidate Identity.
_Avoid_: Network proxy, browser bridge, direct database writer

**Browser Preview Injection**:
The browser-side preview helper that highlights or extracts asset candidates from the current page.
_Avoid_: Scraper, DOM hack

**Capture Feedback**:
The non-navigating user feedback that confirms asset candidates entered the capture inbox while the user remains in the current capture source context.
_Avoid_: Auto-open inbox, download popup, forced review

**Capture Activity Panel**:
A lightweight contextual surface for Candidate Intake, Candidate Artifact acquisition and validation progress, Acquisition Failure, and pre-activation retry or cancellation without becoming a permanent Workspace Entry.
_Avoid_: Capture Inbox activity panel, download queue route, model download manager

**Capture Attention Badge**:
A contextual badge that counts unresolved Acquisition Failures requiring recovery and excludes successful or merely active captures.
_Avoid_: Capture Inbox badge, active transfer count, activity history count

**Recent Capture Completion**:
A short-lived confirmation of successful Candidate Activation shown in a collapsed Capture Activity section for the current application session or at most 24 hours, without becoming durable activity history.
_Avoid_: Capture batch history, candidate history, completed download archive

**Unresolved Acquisition Failure**:
An Acquisition Failure that remains visible in Capture Activity and contributes to Capture Attention Badge until recovery succeeds or the user explicitly ends recovery.
_Avoid_: Active transfer, rejected candidate, unresolved batch result

**Acquisition Failure Resolution**:
The transition that removes acquisition attention after retry succeeds, the user cancels Candidate Intake, or the user explicitly acknowledges that no further recovery is needed while minimal identity and failure trace remain durable.
_Avoid_: Delete candidate identity, clear history, open failure detail

**Retryable Acquisition Failure**:
A transient acquisition failure, such as network interruption, timeout, or temporary service failure, that may safely reuse the same capture and candidate identities for bounded automatic retry.
_Avoid_: Validation failure, authentication failure, new capture request

**Automatic Acquisition Retry**:
A system-initiated retry for Retryable Acquisition Failure that reuses the original Capture Request Identity and Candidate Identity and applies increasing backoff.
_Avoid_: Duplicate capture, manual retry, unlimited retry loop

**Automatic Retry Budget**:
The maximum of two Automatic Acquisition Retry attempts allowed for one Candidate Intake before the failure requires manual recovery.
_Avoid_: Batch retry attempt limit, download concurrency, candidate retention

**Acquisition Manual Recovery Required**:
An acquisition state used when automatic retries are unsafe or exhausted, including authentication or permission failure, missing source content, unsupported format, and Candidate Artifact validation failure.
_Avoid_: Automatic retry pending, rejected candidate, unresolved batch result, Batch Manual Recovery Required

**Candidate Intake Cancellation**:
A cooperative stop requested before Candidate Activation that ends acquisition and validation, cleans only application-managed incomplete data, and transitions the Candidate Record to Cancelled Intake.
_Avoid_: Reject candidate, delete design asset, cancel candidate promotion

**Managed Intake Artifact**:
An incomplete file or chunk held only in application-controlled candidate temporary storage during Candidate Intake and eligible for cleanup after cancellation or failed reconciliation.
_Avoid_: User source file, activated candidate artifact, design asset file

**Cancelled Intake**:
A terminal pre-activation Candidate Record state that leaves Capture Activity while retaining only minimal capture identity, candidate identity, cancellation time, and cancellation reason.
_Avoid_: Rejected candidate, unresolved acquisition failure, deleted record

**Intake Reconciliation**:
The startup process that compares persisted non-terminal Candidate Records, transfer checkpoints, and application-managed intake artifacts to resume, safely restart, or expose interrupted acquisition work.
_Avoid_: Candidate activation, database repair, user asset scan

**Resumable Acquisition**:
Continuation of interrupted Candidate Artifact acquisition under the original identities when the source supports safe range transfer and the stored checkpoint has sufficient validators.
_Avoid_: Blind append, duplicate capture, unvalidated activation

**Transfer Checkpoint**:
Minimal persisted transfer state and source validators used to decide whether interrupted acquisition can continue safely without treating partial bytes as a valid Candidate Artifact.
_Avoid_: Candidate record, candidate artifact, download history

**Acquisition Concurrency Limit**:
The shared configurable limit for new capture, automatic acquisition retry, and restart recovery, using a range of 1–8 concurrent operations with a default of 3.
_Avoid_: AI task concurrency, batch operation concurrency, recovery-only limit

**Intake Recovery Queue**:
The ordered set of reconciled Candidate Intake recovery work waiting under Acquisition Concurrency Limit and source-specific request pacing.
_Avoid_: Download queue, batch operation queue, capture activity history

**Foreground Capture Priority**:
The scheduling rule that preserves capacity or next-slot priority for newly user-triggered capture without interrupting artifact writes or validation already in progress.
_Avoid_: Unlimited priority, cancel recovery, duplicate capture

**Recovery Pause**:
A user control that pauses queued or safely resumable Intake Recovery Queue work without cancelling Candidate Intake or blocking the current workspace.
_Avoid_: Candidate intake cancellation, app offline mode, stop active validation

**Capture Inbox**:
A user-facing holding area for asset candidates before they are confirmed into the asset library, where acquisition validity and required conflicts can be resolved and metadata, tags, collection targets, and duplicate signals may be reviewed without requiring classification completeness.
_Avoid_: Download folder, staging folder, temporary cache, mandatory curation queue

**Candidate Review Page**:
The Capture Inbox workspace where users select, compare, filter, confirm, reject, or batch-organize asset candidates before candidate promotion.
_Avoid_: Download queue, temporary list, right-side inbox

**Candidate Grid**:
A dense review presentation for scanning, selecting, comparing, and batch-acting on asset candidates in the candidate review page.
_Avoid_: Download list, temporary gallery, import table

**Candidate Batch Action**:
A user-triggered action applied to multiple selected asset candidates in the Candidate Review Page.
_Avoid_: Bulk operation, batch job, library batch action

**Batch Operation In Flight**:
The state of a Candidate Batch Action after execution starts and before its final batch result is available.
_Avoid_: Selected batch, queued download, background job

**Batch Operation Queue**:
The ordered set of Candidate Batch Actions waiting to run or resume.
_Avoid_: Download queue, activity history, selection list

**Concurrent Batch Operation**:
A Candidate Batch Action that runs while another Candidate Batch Action is already in flight.
_Avoid_: Batch retry, queued batch, duplicate action

**Conflict Candidate**:
An Asset Candidate included in more than one pending or in-flight batch action where those actions could conflict.
_Avoid_: Duplicate candidate, excluded selection item, failed item

**Operation Conflict Guard**:
The rule that detects and prevents unsafe overlapping batch actions for the same Asset Candidate.
_Avoid_: Duplicate signal, retry limit, confirmation sheet

**Metadata Conflict**:
A conflict where concurrent metadata actions attempt to change the same field or relationship for the same Asset Candidate or Design Asset.
_Avoid_: Duplicate signal, lifecycle conflict, retry failure

**Additive Metadata Merge**:
A safe merge rule for additive metadata such as tags or collection memberships.
_Avoid_: Last writer wins, overwrite, conflict review

**Last Writer Wins**:
A conflict rule where the later completed write overwrites the earlier value.
_Avoid_: Additive metadata merge, conflict review required, undo

**Conflict Review Required**:
A metadata conflict state that needs user review because the app cannot safely merge or overwrite the values automatically.
_Avoid_: Required review, automatic merge, batch failure

**Conflict Review Surface**:
The user-facing surface for inspecting and resolving Metadata Conflicts.
_Avoid_: Batch result history, blocking alert, audit log

**Conflict Resolution Choice**:
A user-selected resolution for a Metadata Conflict, such as keeping one value, merging values, clearing a value, or manually editing.
_Avoid_: Retry action, dismiss result, automatic merge

**Batch Conflict Resolution**:
A conflict review action that applies the same Conflict Resolution Choice to multiple Metadata Conflicts.
_Avoid_: Batch retry, automatic merge, heterogeneous conflict action

**Homogeneous Conflict Set**:
A group of Metadata Conflicts with the same field type, conflict reason, and available Conflict Resolution Choices.
_Avoid_: Heterogeneous conflict set, selected conflicts, batch result

**Heterogeneous Conflict Set**:
A group of Metadata Conflicts with different field types, conflict reasons, or available Conflict Resolution Choices.
_Avoid_: Homogeneous conflict set, mixed selection, eligible selection

**Resolution Preview**:
The pre-execution summary showing which fields and items a Batch Conflict Resolution will affect.
_Avoid_: Batch result feedback, conflict history note, audit diff

**Conflict Resolution Undo**:
A short-lived undo action that reverses a recently applied Conflict Resolution Choice.
_Avoid_: Batch undo, long-term version history, conflict reopen

**Resolution Snapshot**:
The minimal old and new values needed to support short-lived Conflict Resolution Undo.
_Avoid_: Content snapshot, audit trail, full metadata dump

**Resolution Finalization**:
The point after the undo window when a Conflict Resolution Choice becomes the accepted metadata state.
_Avoid_: Conflict reopen, permanent lock, audit approval

**Conflict Reopen**:
A new conflict or metadata-edit flow started after Resolution Finalization when the user wants to change the resolved value.
_Avoid_: Conflict resolution undo, batch undo, history edit

**Conflict Badge**:
A visible marker on a candidate, asset, or batch result showing unresolved Metadata Conflict attention.
_Avoid_: Duplicate signal, activity attention badge, candidate state badge

**Conflict History Note**:
A lightweight history note explaining how a Metadata Conflict was resolved.
_Avoid_: Audit trail, content snapshot, raw diff

**Batch Progress Summary**:
The aggregate progress view for a Batch Operation In Flight, including completed, running, waiting, failed, and skipped counts.
_Avoid_: Batch result feedback, selection summary, audit log

**Item Progress State**:
The per-candidate progress state for an item inside a Batch Operation In Flight.
_Avoid_: Candidate status, review reason, selection state

**Background Progress Indicator**:
A lightweight indicator that keeps Batch Operation In Flight visible when the user leaves the Candidate Review Page or active result surface.
_Avoid_: Blocking modal, global history button, notification center

**Completion Transition**:
The UI transition from Batch Operation In Flight to Batch Result Feedback or Candidate Undo Toast.
_Avoid_: Route change, full-screen progress, forced navigation

**Scope Snapshot**:
The fixed candidate identities, action type, target collection, parameters, and Batch Action Scope captured when a Candidate Batch Action starts.
_Avoid_: Batch operation snapshot, visible selection, current filter

**Navigation During Batch**:
User navigation across filters, search, pages, or workspaces while a Batch Operation In Flight continues.
_Avoid_: Scope change, cancel batch, selection persistence

**Cancellation Boundary**:
The point that separates unstarted batch work that may still be cancelled from already-started or written work that must resolve into a batch result and recovery flow.
_Avoid_: Undo, dismiss batch result, retry boundary

**Direct Batch Action**:
A lower-risk Candidate Batch Action that executes immediately and relies on short-lived feedback or Batch Undo.
_Avoid_: Reviewed batch action, silent batch, irreversible action

**Reviewed Batch Action**:
A Candidate Batch Action that pauses before execution so the user can inspect its Previewed Outcome and affected scope.
_Avoid_: Direct batch action, error dialog, result summary

**Batch Confirmation Sheet**:
A pre-execution review surface for high-risk or irreversible Candidate Batch Actions across multiple selected candidates.
_Avoid_: Candidate confirmation dialog, batch inspector, success toast

**Previewed Outcome**:
The pre-execution summary of what a Reviewed Batch Action or Batch Confirmation Sheet will attempt to change.
_Avoid_: Mixed batch result, batch operation snapshot, audit log

**Batch Action Scope**:
The selection range a Candidate Batch Action is allowed to affect.
_Avoid_: Global selection, hidden selection, batch mode

**Visible Selection**:
The selected candidates currently visible in the active Capture Batch, filter, status view, search result, or page.
_Avoid_: Cross-filter selection, all candidates, hidden selected items

**Cross-Filter Selection**:
An explicit selection mode that keeps selected candidates across Capture Batch, Smart Filter, status filter, search, or page changes.
_Avoid_: Visible selection, accidental hidden selection, global batch

**Selection Persistence**:
The product rule for when selected candidates remain selected after a workspace presentation change.
_Avoid_: Cross-filter selection, sticky selection, selection memory

**Selection Clearing Event**:
A scope-changing user action that clears the current Visible Selection.
_Avoid_: Sort change, thumbnail resize, selection failure

**Selection Recovery**:
A short-lived way to restore candidates cleared by a Selection Clearing Event before any Candidate Batch Action runs.
_Avoid_: Batch undo, promotion reversal, cross-filter selection

**Batch Selection Summary**:
A multi-selection summary that explains how many selected candidates are eligible, excluded, or affected by a Candidate Batch Action.
_Avoid_: Selection count, bulk status, hidden skip message

**Eligible Selection**:
The selected candidates that can participate in a specific Candidate Batch Action.
_Avoid_: Selected all, batch-eligible candidate, auto-approved set

**Excluded Selection Item**:
A selected candidate excluded from a Candidate Batch Action because its status, Required Review, or lifecycle state does not match the action.
_Avoid_: Failed item, hidden skip, invalid selection

**Partial Batch Action**:
A Candidate Batch Action that applies only to the Eligible Selection while leaving Excluded Selection Items unchanged.
_Avoid_: Silent batch, all-or-nothing action, failed batch

**Mixed Batch Result**:
The result summary of a Candidate Batch Action with successful, skipped, failed, or excluded items.
_Avoid_: Success toast, error list, selection summary

**Post-Batch Selection State**:
The selection state left after a Candidate Batch Action completes.
_Avoid_: Initial selection, hidden selection, result summary

**Batch Result Feedback**:
The post-execution feedback summarizing successful, skipped, failed, excluded, undoable, or irreversible batch outcomes.
_Avoid_: Previewed outcome, batch confirmation sheet, selection count

**Inline Batch Result**:
A persistent Batch Result Feedback summary shown in Candidate Review Page or Batch Inspector.
_Avoid_: Toast, modal, previewed outcome

**Batch Result Detail**:
An expandable Batch Result Feedback layer showing successful, skipped, failed, or excluded items and their reasons.
_Avoid_: Audit log, confirmation sheet, raw error list

**Batch Activity Record**:
A lightweight historical record of a Candidate Batch Action, including action type, time, counts, and result summary.
_Avoid_: Audit trail, file snapshot, full operation log

**Minimal Batch Fields**:
The smallest Batch Activity Record fields needed to explain a batch action, such as action type, time, counts, result status, and Batch Action Scope.
_Avoid_: Full operation log, file metadata dump, audit trail

**Item Reference**:
An internal reference from a Batch Activity Record to a Design Asset or Asset Candidate involved in the batch result.
_Avoid_: File copy, image snapshot, full file path

**Reason Snapshot**:
The reason code or short explanation captured when a batch item is failed, skipped, or excluded.
_Avoid_: Raw error log, review history, audit trail

**Content Snapshot Exclusion**:
The rule that Batch Activity Records do not store image binaries, full file contents, complete sensitive paths, base64 payloads, or original-file copies.
_Avoid_: File snapshot, embedded asset, audit archive

**Batch Activity Retention**:
The user-configurable rule controlling how long Batch Activity Records remain available.
_Avoid_: Candidate retention policy, asset trash retention policy, audit retention

**Recent Activity Summary**:
A short-term summary of fully successful low-risk Batch Activity Records.
_Avoid_: Batch result history, important batch record, audit log

**Important Batch Record**:
A Batch Activity Record retained for later review because it includes failed, skipped, excluded, Hard Delete, or Reviewed Batch Action outcomes.
_Avoid_: Recent activity summary, audit trail, error log

**Pruned Batch Detail**:
The reduced state of an older Batch Activity Record after item-level details or reasons are removed under Batch Activity Retention.
_Avoid_: Deleted history, hard delete, audit redaction

**Batch Result History**:
A user-facing history surface for Batch Activity Records that need later review.
_Avoid_: Candidate history, review history, audit trail

**Unresolved Batch Result**:
A Batch Activity Record with failed, skipped, or excluded outcomes that still needs user attention.
_Avoid_: All batch history, successful result, audit finding

**Resolved Batch Result**:
A Batch Activity Record that no longer needs attention because the user reviewed, retried, skipped, or dismissed it.
_Avoid_: Deleted history, hidden failure, pruned batch detail

**Activity Attention Badge**:
A count badge on Capture Inbox or Capture Inbox Activity Panel showing Unresolved Batch Results.
_Avoid_: History count, notification count, audit alert

**Dismiss Batch Result**:
A user action that marks an Unresolved Batch Result as resolved without deleting its Batch Activity Record.
_Avoid_: Delete history, dismiss review signal, dismiss trash duplicate

**Recovery Completion**:
The state where a failed, skipped, or excluded batch item no longer needs attention because it was retried, manually handled, skipped, dismissed, or acknowledged.
_Avoid_: Opened detail, hidden failure, deleted history

**Remaining Attention Count**:
The count of failed, skipped, or excluded batch items that still require user attention inside an Unresolved Batch Result.
_Avoid_: History count, selected count, total failures

**Auto Resolve Rule**:
The rule that turns an Unresolved Batch Result into a Resolved Batch Result when its Remaining Attention Count reaches zero.
_Avoid_: Read receipt, hidden auto-dismiss, retention cleanup

**User Acknowledgement**:
An explicit user confirmation that a viewed batch result no longer needs attention.
_Avoid_: Opening detail, automatic resolve, delete history

**Batch Result Entry Point**:
A contextual entry point that opens Batch Result History or recent batch results.
_Avoid_: Global log button, audit center, permanent workspace toolbar item

**Capture Inbox Activity Panel**:
The Capture Inbox surface for recent batch activity and important batch result history.
_Avoid_: Asset workspace log, audit trail, notification center

**Candidate History Link**:
A link from a candidate, candidate placeholder, or related inspector context to relevant candidate or batch result history.
_Avoid_: Global history, activity feed, audit trail

**Inspector History Section**:
A contextual inspector area showing history relevant to the currently selected item or selection.
_Avoid_: Capture inbox activity panel, global log, audit trail

**Ephemeral Feedback**:
Short-lived action feedback that is not retained as Batch Result History.
_Avoid_: Batch activity record, persistent result, audit trail

**Audit Trail**:
A complete compliance-oriented operation history, beyond the lightweight history needed for batch result review.
_Avoid_: Batch result history, review history, activity summary

**Result Focus**:
The workspace focus target after a Candidate Batch Action completes.
_Avoid_: Keyboard focus, route change, selected item

**Batch Failure Reason**:
The per-item reason a Candidate Batch Action failed during execution.
_Avoid_: Exclusion reason, review reason, validation warning

**Retry Eligible Failure**:
A failed batch item whose Batch Failure Reason is clearly transient and safe to retry.
_Avoid_: Manual recovery required, excluded item, unresolved review

**Batch Manual Recovery Required**:
A failed batch item that needs user action such as changing target collection, opening details, skipping, or recapturing.
_Avoid_: Retry eligible failure, automatic retry, batch undo, Acquisition Manual Recovery Required

**Failure Recovery Action**:
A user action offered for a failed batch item, such as retrying, opening details, changing the target collection, or skipping.
_Avoid_: Batch undo, automatic retry, exclusion action

**Retry Failed Item**:
A Failure Recovery Action that reruns a failed batch operation for one failed candidate.
_Avoid_: Batch undo, retry skipped item, rerun batch

**Batch Retry**:
A Failure Recovery Action that retries multiple Retry Eligible Failure items from an Unresolved Batch Result.
_Avoid_: Automatic retry, retry all failures, batch undo

**Retry Attempt Limit**:
The maximum number of times a failed item may be retried inside the same Unresolved Batch Result.
_Avoid_: Retention limit, automatic retry policy, retry timeout

**Retry In Flight**:
The state of a Retry Failed Item or Batch Retry action while retry execution is still running.
_Avoid_: Download status, queued batch, retry eligible failure

**Retry Exhausted Failure**:
A formerly Retry Eligible Failure item that reached its Retry Attempt Limit and no longer participates in Batch Retry.
_Avoid_: Manual recovery required, failed item, hard delete

**Manual Escalation**:
The transition from retry-based recovery to Batch Manual Recovery Required after retry attempts are exhausted or unsafe.
_Avoid_: Automatic retry, support ticket, batch undo

**Retry Result Merge**:
The rule that retry outcomes update the original Batch Activity Record and Unresolved Batch Result instead of creating disconnected history.
_Avoid_: New batch result, duplicate history, audit append-only log

**Batch Operation Snapshot**:
The per-item outcome record captured when a Candidate Batch Action executes, used to support precise undo.
_Avoid_: Audit log, batch selection summary, backup

**Batch Undo**:
A short-lived undo action that reverses only the successful items from a Candidate Batch Action.
_Avoid_: Undo selection, retry failed, all-item rollback

**Candidate Status**:
The lifecycle state of an asset candidate in the capture inbox, such as pending review, promoted, rejected, or expired.
_Avoid_: Download status, file state, task state

**Candidate State Badge**:
The primary candidate state marker shown on a candidate card or inspector summary.
_Avoid_: Review reason list, tag badge, notification

**Review Reason**:
A reason an asset candidate needs user attention, such as Required Review, Active Library Duplicate, Superseded Restore Conflict, or Retention Warning.
_Avoid_: Candidate status, cleanup reason, error message

**State Priority**:
The ordering rule that decides which Candidate State Badge is shown when multiple candidate states or review reasons apply.
_Avoid_: Sort order, severity score, notification priority

**Candidate-Level Action**:
A user action that changes the lifecycle, organization, or review availability of a whole asset candidate.
_Avoid_: Review signal action, signal dismissal, signal snooze

**Destructive Candidate Action**:
A Candidate-Level Action that removes an asset candidate from active review or recoverable candidate storage.
_Avoid_: Review signal dismissal, filter action, cleanup warning

**Candidate Undo Toast**:
A short-lived post-action recovery affordance for a reversible Candidate-Level Action or Candidate Batch Action.
_Avoid_: Confirmation dialog, review signal, permanent restore

**Candidate Confirmation Dialog**:
A pre-action confirmation affordance for an irreversible Destructive Candidate Action.
_Avoid_: Undo toast, warning badge, review signal

**Reject Candidate**:
A user action that removes an asset candidate from active review because the user does not want to promote it into the Asset Library.
_Avoid_: Manual cleanup, hide candidate, delete candidate

**Rejected Candidate**:
An asset candidate removed from active review by Reject Candidate and held in Capture Cleanup History during the Recoverable Window.
_Avoid_: Deleted candidate, hidden candidate, rejected asset

**Superseded Candidate**:
An asset candidate removed from active review because another Design Asset was restored or used instead.
_Avoid_: Rejected candidate, duplicate asset, promoted candidate record

**Batch-Eligible Candidate**:
A candidate that can be included in a user-triggered Batch Promotion because it has no Required Review that needs individual attention.
_Avoid_: Auto-approved asset, safe download, clean file

**Candidate Retention Policy**:
The user-configurable rule that controls how long unpromoted asset candidates remain recoverable before they expire from the capture inbox.
_Avoid_: Cache cleanup, download cleanup, asset deletion policy

**Capture Inbox Cleanup**:
The process that removes expired unpromoted asset candidates from the active Capture Inbox under the Candidate Retention Policy.
_Avoid_: Download cleanup, library cleanup, rejection

**Recoverable Window**:
The limited time after Capture Inbox Cleanup when a removed asset candidate can still be restored before Hard Delete.
_Avoid_: Permanent trash, retention extension, snooze

**Hard Delete**:
The irreversible removal of an asset candidate from recoverable candidate storage after the Recoverable Window or an explicit user action.
_Avoid_: Hide, reject, cleanup

**Capture Cleanup History**:
A user-facing record of cleaned asset candidates that can be restored or hard-deleted while they remain inside the Recoverable Window.
_Avoid_: Audit log, activity feed, review history

**Cleanup Reason**:
The reason an asset candidate entered Capture Cleanup History, such as retention expiration or explicit user cleanup.
_Avoid_: Delete reason, rejection reason, error reason

**Restored-Instead Cleanup**:
The Cleanup Reason used when Restore Instead removes the current candidate from active review after restoring a matched deleted Design Asset.
_Avoid_: Reject candidate, duplicate dismissal, asset restore

**Candidate Cleanup Feedback**:
The user-facing feedback that explains why a candidate left active review and where it can be recovered.
_Avoid_: Promotion feedback, asset trash feedback, error alert

**Recoverable Until**:
The deadline before a cleaned asset candidate leaves the Recoverable Window and becomes eligible for Hard Delete.
_Avoid_: Expiration date, snooze return time, cleanup time

**Candidate Restore**:
A user action that returns a cleaned asset candidate from the Recoverable Window to the active Capture Inbox without promoting it.
_Avoid_: Candidate Promotion, import, undo delete

**Superseded Candidate Restore**:
A Candidate Restore action applied to a Superseded Candidate.
_Avoid_: Asset restore, restore instead, undo promote

**Superseded Restore Conflict**:
A Required Review condition created when a restored Superseded Candidate conflicts with an active Design Asset that replaced it.
_Avoid_: Trash duplicate, restore conflict, deleted asset placeholder

**Reopened Candidate**:
A cleaned candidate returned to active Capture Inbox review after Candidate Restore.
_Avoid_: Active candidate, recovered asset, restored design asset

**Recovered Candidate**:
An asset candidate restored from Capture Cleanup History into the Capture Inbox for renewed review.
_Avoid_: Promoted asset, recovered file, restored design asset

**Recovered State Indicator**:
A candidate-facing signal that a Recovered Candidate recently returned from Capture Cleanup History.
_Avoid_: Permanent status, source label, restored asset badge

**Retention Extension**:
A user action, applied to one candidate or through a Candidate Batch Action, that extends how long an unpromoted asset candidate remains recoverable before expiration.
_Avoid_: Snooze, reminder, hide warning

**Retention Warning**:
A candidate-facing signal that an unpromoted asset candidate is close to expiring under the candidate retention policy.
_Avoid_: Delete warning, system alert, cache warning

**Capture Batch**:
A group of asset candidates created by the same capture action, source page, or import session.
_Avoid_: Download batch, source folder, temporary group

**Batch Promotion**:
A user-triggered candidate promotion action that turns multiple batch-eligible candidates into design assets together.
_Avoid_: Auto-import, approve all, bulk download

**Duplicate Signal**:
An indication that an asset candidate or design asset may duplicate another item and should be reviewed or handled before organization continues.
_Avoid_: Duplicate script result, collision, repeated file

**Duplicate Signal Scope**:
The set of candidate, active library, and trash records considered when producing a Duplicate Signal.
_Avoid_: Global scan, duplicate mode, search scope

**Active Library Duplicate**:
A Duplicate Signal indicating that an item may duplicate an Active Candidate or a non-deleted Design Asset.
_Avoid_: Trash duplicate, file collision, restore conflict

**Trash Duplicate**:
A weak Duplicate Signal indicating that an item may duplicate a deleted Design Asset in Asset Trash.
_Avoid_: Active library duplicate, restore conflict, blocked promotion

**Restore Instead**:
A Trash Duplicate resolution that restores the matched deleted Design Asset instead of promoting the current Asset Candidate.
_Avoid_: Auto restore, merge duplicate, quick promote

**Continue as New**:
A Trash Duplicate resolution that continues Candidate Promotion for the current Asset Candidate as a new Design Asset.
_Avoid_: Restore instead, auto merge, dismiss signal

**Dismiss Trash Duplicate**:
A Review Signal Action that resolves a Trash Duplicate without restoring the deleted Design Asset or changing Candidate Promotion.
_Avoid_: Restore instead, continue as new, reject candidate

**Download Task**:
A transfer record for acquiring a remote Candidate Artifact, tracking progress, retry, and failure without representing the Asset Candidate review lifecycle.
_Avoid_: Asset candidate, capture inbox item, design asset

**Download Queue**:
The current transfer-oriented collection of Download Tasks that the target product presents as implementation detail inside Capture Activity Panel rather than as a permanent workspace destination.
_Avoid_: Asset candidate list, Capture Inbox, model download queue

**Save Path Plan**:
A dry-run destination plan for a download, including filename sanitization and duplicate handling.
_Avoid_: Download path, target filename

### Creation Reference Context

**AI Folder**:
A dynamic view whose asset references match declared AI-tag analysis evidence and criteria without copying originals or confirming suggested tags by membership.
_Avoid_: Physical directory, Work Set, user-confirmed tag by implication

**Palette Folder**:
A named collection of saved color values for reuse, independent of asset membership and work-window presentation.
_Avoid_: Asset folder, measured image palette, copied original

**Work Palette**:
The saved color references used in one Work Set, displayed alongside its visual references without changing source image colors or other palette folders.
_Avoid_: Image color measurement, global palette deletion, automatic recoloring

**Work Mode**:
The core creation-facing mode that keeps selected visual references available beside ongoing design work through floating Work Windows; the product-facing name is provisional.
_Avoid_: Library organization mode, embedded browser, recording plugin

**Work Set**:
A saved library-bound set of asset references with its own order, presentation and work notes, independent of Collection membership and original-file ownership.
_Avoid_: Duplicate asset library, Collection, permanent copy of every referenced original

**Work Window Layout**:
The device-specific placement, size, pinning and restore state of a Work Window, separate from its Work Set's reference content.
_Avoid_: Asset ownership, permission grant, global collection order

**Work Window**:
A native floating presentation of a Work Set that coexists with other reference windows and external creative applications under current library access authority.
_Avoid_: Saved permission token, single asset identity, library management window

**Video Reference Frame**:
A user-selected visual reference tied to actual video presentation time and source generation, with durable selection and annotation meaning.
_Avoid_: Codec I-frame, disposable thumbnail, independent Design Asset by implication

**Screen Recording Producer**:
An optional capture extension that records the explicitly selected screen/window/area and permitted audio sources, proposing its output for host-controlled asset intake.
_Avoid_: Embedded browser engine, ambient screen access, owner of admitted library media

### Visual Analysis

**AI+ Core Experience**:
The built-in understanding, retrieval and reuse workflow around measured colors, tag suggestions, scene descriptions, prompt reconstruction and appropriate OCR, backed by reliable model-free asset operations.
_Avoid_: Mandatory community plugin, automatic full analysis, chatbot home

**Prompt Reconstruction**:
A generated creative prompt describing how a visually similar image might be produced, retained with source and model provenance rather than asserted as the original author's prompt.
_Avoid_: Recovered original prompt, scene-description fact, session draft

**Palette Proportion**:
The measured share of analyzed pixels assigned to a representative color under an identified color-space, sampling and alpha-handling recipe.
_Avoid_: Language-model guess, semantic element area, unqualified exact source percentage

**Cloud Inference Provider**:
An external model service that performs a disclosed, scoped inference request under the applicable user grant.
_Avoid_: Development workspace access, plugin install permission, silent fallback

**Agent Development Connector**:
A host-controlled adapter through which an identified external AI client discovers software context and uses granted tools in a selected Development Workspace.
_Avoid_: Inference provider, unrestricted remote control, plugin runtime

**Agent Context Pack**:
A bounded versioned set of product terms, capability schemas, SDK examples, validation guidance and current limitations supplied to a development client.
_Avoid_: Asset-library dump, secret bundle, authority grant

**Development Workspace**:
The explicitly selected application-source or plugin-source workspace within which an external development client may perform granted work.
_Avoid_: Active Library, installed application resources, entire home directory

**Development Access Grant**:
A revocable authorization binding a development client to a workspace, allowed paths and operations, duration, resource bounds and applicable external destinations.
_Avoid_: AGENTS.md instruction, MCP tool description, publication permission by implication

**Color Palette**:
The extracted set of representative colors for an asset.
_Avoid_: Swatches, colors

**Dominant Color**:
The primary representative color for an asset.
_Avoid_: Main color, average color

**Extracted Color**:
A palette color with ratio, RGB values, and optional color-family classification.
_Avoid_: Swatch detail, color row

**Color Family**:
A human-readable color grouping used for filtering and display.
_Avoid_: Hue bucket, color class

**Text Box**:
A detected text region in an image, optionally with recognized text, foreground color, background color, and readability score.
_Avoid_: OCR box, bounding rectangle

**Text Color Analysis**:
The workflow that estimates text foreground and background colors and readability for detected text regions.
_Avoid_: OCR color extraction, text palette

**OCR Text**:
Recognized text extracted from a design asset.
_Avoid_: Copy, detected words

**OCR Provider**:
The configured text-detection source used for OCR or text-box discovery.
_Avoid_: OCR engine, text detector

**Readability Score**:
The contrast-oriented quality signal for a text box.
_Avoid_: Contrast score, legibility value

### AI Workflows

**AI Workflow**:
A product workflow that uses AI or algorithmic analysis to produce user-facing asset output, such as tags, prompt reverse, OCR text, visual analysis, or search embeddings.
_Avoid_: Runtime lane, model family, backend route

**Platform AI Branch**:
A platform-specific AI capability branch for Windows or macOS that chooses different runtime backends while preserving shared product workflows where possible.
_Avoid_: Cross-platform AI, one AI stack

**Windows AI Branch**:
The Windows AI capability branch that keeps the CUDA AI Worker main chain while moving Qwen3-VL large visual inference toward quantized llama.app, llama.cpp, or Ollama services.
_Avoid_: Windows build, CUDA mode

**macOS AI Branch**:
The macOS AI capability branch using Python MPS, ONNX Runtime, llama.cpp Metal, Ollama fallback, and external HTTP fallback behind shared product workflows. It exposes Platform AI Branch Status and scoped real evidence for supported WD Tagger ONNX, CLIP ONNX, and Llama GGUF/mmproj routes while retaining explicit evidence gaps for unproven routes such as OCR.
_Avoid_: macOS build, MPS mode

**AI Worker**:
The local Python worker responsible for AI tagging, prompt reverse, visual analysis, routing, OCR helpers, and translation support.
_Avoid_: AI service, runtime, model server

**Real Model Path**:
An AI workflow path whose output is produced by an installed and loaded model backend, or by an explicitly configured external inference backend.
_Avoid_: Enabled card, downloaded label, wrapper import

**Mock Inference Path**:
An AI workflow path that returns simulated, randomized, templated, or filename-derived AI output instead of model-backed inference.
_Avoid_: Demo data, graceful fallback, fake model

**Planned Capability**:
A UI-visible or metadata-visible AI capability that describes an intended runtime, model family, or fallback route before a real model path is available.
_Avoid_: Available model, installed runtime, loaded route

**Runtime Probe**:
A read-only check that reports whether a runtime dependency, import, service, or hardware hint appears available without proving full model inference.
_Avoid_: Inference validation, model load, health guarantee

**AI Branch Status**:
The product-facing state of a platform AI branch or route, combining intent, runtime evidence, model readiness, and whether a real model path is currently usable.
_Avoid_: UI label, raw probe result, service health

**Platform AI Branch Status**:
The comparable product-facing status projection for Windows AI Branch and macOS AI Branch workflows.
_Avoid_: macOS-only status, runtime probe matrix, capability list

**Shared Product Surface**:
The common product-facing workflows, status surfaces, and main-application architecture reused across Windows and macOS, with platform-specific branches only where runtime or operating-system differences require them.
_Avoid_: Shared runtime, one AI stack, platform-specific UI fork

**Planned Capability Status**:
An AI branch status meaning the product intends to support the workflow, but current evidence is not enough to show runtime or model readiness.
_Avoid_: Available, installed, ready

**Runtime Probe Ready Status**:
An AI branch status meaning runtime evidence is present, but model readiness has not been proven.
_Avoid_: Real model path, model loaded, inference validated

**Ready To Load Status**:
An AI branch status meaning dependencies and model artifacts appear sufficient to attempt loading a model path.
_Avoid_: Runtime probe, downloaded, inference validated

**Real Model Path Status**:
An AI branch status meaning the workflow currently has a usable model-backed or explicitly configured external inference path.
_Avoid_: Planned capability, runtime probe, downloaded model

**Unavailable Status**:
An AI branch status meaning the current platform, dependencies, configuration, or artifact state clearly prevents the workflow from being usable.
_Avoid_: Planned capability, unknown

**Model Readiness**:
The state indicating whether required runtime dependencies and model artifacts are sufficient for a model path to load, without proving full inference output.
_Avoid_: Downloaded, installed, loaded model, runtime probe

**AI Client**:
The Electron-side facade that enqueues AI work, records local task state, polls worker results, and notifies the renderer.
_Avoid_: AI Worker, model client

**AI Task**:
A tracked unit of AI work for an asset, such as tagging, prompt reverse, or visual analysis.
_Avoid_: Job, request

**AI Tag Task**:
An AI task that produces unconfirmed tag suggestions; acceptance into user-confirmed asset tags is a separate host-controlled action.
_Avoid_: Tagging job

**AI Prompt Task**:
An AI task that produces Prompt Reconstruction results; a scene description is a distinct result kind even when the same model supplies both.
_Avoid_: Prompt job

**AI Analysis Task**:
An AI task that produces structured visual analysis.
_Avoid_: Analysis job

**Search Embedding**:
A vector representation produced from a design asset or query so the Asset Library can support semantic similarity search.
_Avoid_: CLIP model, embedding route, vector backend

**Queue Sync**:
The background synchronization of completed AI Worker results into local asset and task state.
_Avoid_: Callback, webhook, push sync

**Task Cache**:
The AI Worker-side fallback record of finished task results when in-memory task state is unavailable.
_Avoid_: Result database, worker DB

**Batch Scheduler**:
The AI Worker coordinator that monitors queued tag tasks and triggers batch tagging.
_Avoid_: Queue runner, cron

**Tag Worker**:
The AI Worker component that routes assets and runs cooperative tagging models.
_Avoid_: Tagger, classifier

**Prompt Worker**:
The AI Worker component that performs manual prompt reverse work.
_Avoid_: Prompt generator

**Analysis Worker**:
The AI Worker component that performs deeper visual analysis.
_Avoid_: Analyzer

**Model Manager**:
The AI Worker component that coordinates model loading, keep-alive, eviction, and memory-aware exclusivity.
_Avoid_: Loader, cache

**Keep-Alive Window**:
The period during which a loaded model stays resident after use before eviction.
_Avoid_: Timeout, cache lifetime

**VRAM Policy**:
The memory-safety rules that control heavy model loading, eviction, and pre-inference cleanup.
_Avoid_: GPU settings, memory config

**Manual Heavy Model**:
A model family that must not run concurrently with another heavy manual model because of memory pressure.
_Avoid_: Big model, exclusive model

**Visual Router**:
The routing decision that classifies asset type and selects an appropriate tagging pipeline.
_Avoid_: Classifier, dispatcher

**Florence Semantic Router**:
The secondary routing step that uses Florence-derived visual captions to refine design/UI/document routing.
_Avoid_: Semantic classifier, Florence route

**Cooperative Tagging Pipeline**:
A multi-model tagging flow that combines routing, model predictions, design rules, and tag fusion.
_Avoid_: Multi-model inference, tag pipeline

**Routing Preview**:
A user-visible preview of how an asset would be routed before or during AI tagging.
_Avoid_: Pipeline debug, model preview

**Prompt Reverse**:
The workflow that analyzes a visual asset and produces reusable image-generation prompt language and design descriptors.
_Avoid_: Reverse prompt, prompt generation

**Prompt Template**:
A versioned instruction template used to guide prompt reverse or tagging output.
_Avoid_: System prompt, prompt file

**Prompt Reverse Result**:
The structured output of prompt reverse, including English prompt, Chinese description, caption, tag groups, and negative prompt suggestion.
_Avoid_: Prompt response, generated prompt

**Deep Visual Analysis**:
The structured design analysis workflow for layout, style, and visual semantics beyond tags.
_Avoid_: Senior analysis, visual sweep

**AI Console**:
The product workspace for monitoring AI status, models, inference services, prompt reverse configuration, runtime management, and logs.
_Avoid_: AI settings, model page

**macOS AI Worker Probe**:
The live macOS Worker capability snapshot surfaced in AI Console through the Python Worker capability probe bridge, including top-level runtime availability and family-specific probe data such as CLIP/SigLIP ONNX.
_Avoid_: Static metadata, fake health check

**macOS AI Optional Family Probe**:
The fine-grained worker probe layer that checks whether the macOS Python MPS and ONNX capability families, such as RAM++, Florence-2, CLIP/SigLIP, CLIP/SigLIP ONNX, WD14, RapidOCR, and PaddleOCR, are actually importable in the current environment.
_Avoid_: Model download status, hard runtime guarantee

**PaddleOCR ONNX**:
The ONNX-based OCR family used as a macOS-friendly alternative to EasyOCR and as a first-class text-detection dependency in the OCR governance and color-analysis pipeline.
_Avoid_: Paddle, generic OCR, text model

**macOS AI Route Overview**:
The macOS-focused AI Console summary card that surfaces MPS, ONNX Runtime, and Llama route readiness together with the current route priority.
_Avoid_: Generic model summary, static route note

**macOS AI Runtime Lane**:
A typed macOS AI branch lane shown in AI Console, such as Python MPS Runtime, ONNX Runtime, or Llama.
_Avoid_: macOS tab, AI section

**macOS AI Branch Skeleton**:
A historical Phase 1 term for the earlier metadata-and-probe-only state. Do not use it for the current branch, which now has shared workflow status and scoped Real Model Path evidence.
_Avoid_: current macOS AI branch, finished macOS AI

### AI Models And Sources

**AI Source**:
The canonical source identifier for an AI, rule, metadata, or palette contribution to tags.
_Avoid_: Model source, provider string

**RAM++ Tagger**:
The general-purpose visual tagger used for broad image and multi-label tagging.
_Avoid_: RAM, general tagger

**Florence-2 Tagger**:
The caption-oriented vision model used for scene description and design-semantic tag extraction.
_Avoid_: Florence, caption model

**WD Tagger**:
The anime-oriented tagger used for character and illustration-style features.
_Avoid_: WD, anime model

**CLIP Design Classifier**:
The zero-shot or dictionary-based classifier used to match assets against design vocabulary.
_Avoid_: CLIP, design classifier

**CLIP/SigLIP ONNX**:
The ONNX Runtime capability family for CLIP/SigLIP-style embedding and classification, surfaced in the macOS worker probe as a distinct ONNX availability signal.
_Avoid_: Generic ONNX, CLIP model, SigLIP model

**CLIP/SigLIP ONNX Compatibility Checker**:
The dedicated environment-and-model-shape checker used to verify whether a local CLIP/SigLIP ONNX folder has the expected Python dependencies, config, and ONNX graph files.
_Avoid_: Generic health check, model download job, inference job

**JoyCaption**:
The caption and prompt model used by the prompt worker.
_Avoid_: Caption model

**Qwen-VL**:
The vision-language model family used for structured visual analysis and prompt reverse workflows.
_Avoid_: Qwen, VLM

**Qwen3-VL Candidate**:
A selectable Qwen3-VL model option with size, quantization, vision support, and hardware guidance.
_Avoid_: Model option, GGUF choice

**Qwen3-VL Large Vision Runtime**:
The large-model visual inference route for Qwen3-VL; it should be served through quantized runtime services on Windows and through llama.cpp Metal on macOS rather than treated as a universal Python model.
_Avoid_: Native Qwen3-VL, Python Qwen runtime

**MMProj Model**:
The companion vision projection model required by some multimodal GGUF Llama workflows.
_Avoid_: Vision adapter, projector

**Quantization**:
The model-size and precision trade-off label used to choose a feasible local model.
_Avoid_: Compression, model variant

**Model Compatibility Status**:
The recorded compatibility state of a model for the current runtime environment.
_Avoid_: Install status, model health

### Runtime And Inference

**AI Runtime**:
The Electron-side abstraction for selectable inference runtimes, their configuration, lifecycle state, and health checks.
_Avoid_: AI Worker, backend, model server

**Active Runtime**:
The currently selected AI runtime for runtime-managed AI operations.
_Avoid_: Current backend, selected service

**Runtime Provider**:
An implementation of an AI runtime kind, such as Python Worker, external HTTP, disabled, or mock.
_Avoid_: Backend provider, adapter

**External HTTP Runtime**:
A user-configured inference endpoint accessed through HTTP, such as Ollama, LM Studio, llama.app, or a custom OpenAI-compatible service.
_Avoid_: Remote backend, external model

**Python MPS Runtime**:
The macOS Python inference route for models that can run safely through PyTorch MPS.
_Avoid_: macOS Python AI, MPS backend

**Python MPS Compatibility Checker**:
The dedicated environment probe used to verify that the macOS Python runtime can actually use PyTorch MPS and that optional RAM++, Florence-2, and CLIP family wrappers are importable.
_Avoid_: Generic Python health check, model download job, inference job

**ONNX Runtime Route**:
The cross-platform or macOS-friendly small-model route for models that are better served as ONNX graphs.
_Avoid_: ONNX model, CPU backend

**MLX Runtime**:
Not a current product route. ADR-0007 removes the speculative standalone MLX path; any future provider must supply an executable lifecycle and real inference evidence before re-entering product status.
_Avoid_: Apple AI backend, macOS model server

**CoreML Fallback**:
The macOS ONNX-related fallback path for model execution where CoreML provider support is available and appropriate.
_Avoid_: Apple fallback, CoreML mode

**Ollama Vision Fallback**:
The macOS large-vision fallback route that can serve a Qwen2.5-VL compatible model through Ollama when Qwen3-VL GGUF/mmproj is not ready.
_Avoid_: Ollama primary path, remote model

**Manual Health Check**:
A user-triggered connectivity check for an external HTTP runtime.
_Avoid_: Auto probe, startup ping

**Python Worker Runtime**:
The runtime provider shape for launching or health-checking the local Python AI Worker.
_Avoid_: AI Worker, Python service

**AI Python Environment**:
The shared main-process module that resolves the preferred Python executable and managed Python runtime layout from explicit host facts, while Windows and macOS filesystem and command differences remain behind adapters.
_Avoid_: OCR Python, macOS Python environment, Python finder

**Llama Runtime**:
The local Llama-oriented runtime capability for planning, installing, starting, and testing GGUF-based inference services.
_Avoid_: llama.cpp, llama server

**Llama Install Plan**:
The planned runtime package, model candidate, install root, and warning set for a Llama runtime setup.
_Avoid_: Installer config, download plan

**Llama Hardware Profile**:
The detected CPU, memory, GPU, platform, and accelerator information used to recommend a Llama runtime plan.
_Avoid_: Hardware detection, device profile

**Accelerator**:
The runtime acceleration family used for Llama planning, such as CUDA, Vulkan, Metal, or CPU.
_Avoid_: GPU type, backend

**Runtime Profile**:
The platform and hardware profile that describes available runtime capabilities and recommended runtime kinds.
_Avoid_: Platform profile, install profile

**Runtime Registry**:
The app-managed record of runtime profile, managed paths, installed packages, available models, and doctor status.
_Avoid_: Runtime database, package registry

**Runtime Package**:
A typed package entry for runtime, model, tool, dependency, or metadata planning.
_Avoid_: Artifact, installer file

**Runtime Package Source**:
A typed transport source for runtime packages, categorized as local, bundled or governed remote without becoming package identity or trust by itself.
_Avoid_: Download source, package repository

**Signed Runtime Channel Index**:
An official-key-verified monotonic channel pointer to exact signed immutable Runtime Package Manifests without trusting `latest`, tag ordering or repository state.
_Avoid_: Latest release, update JSON, mutable catalog

**Official Runtime Catalog**:
The application-trust-root-controlled manifests and statements defining official runtime package identity, compatibility, dependencies and revocation independently of transport.
_Avoid_: GitHub repository, download host, release page

**Runtime Download Mirror**:
An approved alternative transport serving byte-identical content for one manifest-bound digest and size without changing package identity or policy.
_Avoid_: Fallback package, third-party catalog, trusted domain

**Runtime Source Evidence**:
Path-free transport observations such as source kind, redirect policy, resumability and terminal mirror outcome that do not replace artifact verification.
_Avoid_: Package trust, raw URL, authorization log

**Runtime Update Candidate**:
A newer signed immutable runtime package set discovered through catalog metadata without downloading or changing the active environment.
_Avoid_: Available update, latest runtime, automatic activation

**Runtime Security Or Compatibility Patch**:
A host-classified same-lineage runtime update whose complete manifest diff preserves trust, ABI/API, capabilities, licenses, permissions and system boundaries and is eligible for unattended side-by-side installation.
_Avoid_: Semantic-version patch, recommended update, silent major upgrade

**Reviewed Runtime Update Plan**:
The explicit source/target and dependency-closure review required for major, backend, compatibility, license, permission, system or material resource changes.
_Avoid_: Update notification, patch note, automatic dependency update

**Last Known Good Runtime**:
The immediately previous verified runtime package set pinned after activation so failed startup or health evidence can restore future execution safely.
_Avoid_: Runtime backup, system Python fallback, cached environment

**Runtime Rollback Window**:
The visible bounded retention period during which Last Known Good Runtime remains pinned and available for automatic or manual rollback.
_Avoid_: Model rollback window, indefinite archive, undo timeout

**Healthy Runtime Start**:
One distinct completed activation session whose exact active runtime set passes bounded synthetic readiness without startup, crash-loop, rollback or integrity failure.
_Avoid_: Process spawn, repeated health probe, successful download

**Runtime Rollback Reclaimable**:
The state reached only after the active runtime has at least 14 elapsed days and three Healthy Runtime Starts, allowing the sole previous-set rollback pin to be released safely.
_Avoid_: Cache expired, old version, disk-pressure deletion

**Runtime Trust Statement**:
A signed monotonic official execution-trust decision scoped to exact runtime packages/sets, platform and capability bindings with response class and remediation identity but no authority over committed results.
_Avoid_: Security advisory text, GitHub issue, package update notice

**Critical Runtime Security Revocation**:
A signed containment state for confirmed severe runtime/supply-chain risk that blocks new execution and cancels affected work without a continue-anyway path.
_Avoid_: Runtime crash, incompatibility warning, end of support

**Waiting For Safe Runtime**:
The non-retrying capability/intent state used when every compatible runtime binding is revoked, unsafe or unavailable and no external fallback is authorized.
_Avoid_: Analysis failure, dependency download, external provider fallback

**Runtime Package Manifest**:
The typed catalog of runtime packages and the profiles they support.
_Avoid_: Package list, registry manifest

**Runtime Package Selection**:
The chosen required, recommended, and optional packages for a runtime profile.
_Avoid_: Install set, dependency list

**Runtime Package Install Plan**:
A dry-run plan that combines download, verification, extraction, registry metadata, rollback, warnings, and blocking issues.
_Avoid_: Installation, setup

**Runtime Package Executor**:
The Electron main-process module that performs an explicitly approved Runtime Package transaction through staging, verification, safe extraction, atomic promotion, Runtime Registry commit, and rollback. The shared interface owns workflow state while platform adapters own real archive, executable, quarantine, and signing differences.
_Avoid_: Package script, automatic installer, model downloader

**Runtime Package Session**:
The Electron main-process selection and execution boundary that turns a user-selected local package manifest into an opaque, expiring selection token and path-free execution snapshots.
_Avoid_: Renderer package parser, raw archive path, trusted UI metadata

**Bootstrap**:
The initial environment decision flow that combines doctor results, runtime profiles, package planning, and user choices.
_Avoid_: Startup, onboarding

**AI Environment Setup**:
The resumable non-blocking Bootstrap surface that presents a reviewable Baseline AI Runtime plan after Library Start and initializes it only after explicit setup consent, with pause, skip and later resumption.
_Avoid_: Model onboarding, hidden installer, Python prompt

**Baseline AI Runtime**:
The smallest pinned self-contained managed runtime and common dependency closure needed to host supported local AI capabilities without model weights or every optional backend.
_Avoid_: Starter model bundle, system Python, complete accelerator stack

**Thin Installer**:
The default application distribution containing Bootstrap and package trust/install machinery while retrieving the displayed Baseline AI Runtime after an explicit reviewed setup choice.
_Avoid_: Web installer, incomplete application, model downloader

**Offline Full Installer**:
The larger optional application distribution embedding the exact verified Baseline AI Runtime packages for network-independent initialization through the same package protocol.
_Avoid_: Different product edition, portable runtime folder, bundled models

### Settings And Governance

**App Settings**:
The persisted user and platform configuration for library, AI, runtime, OCR, paths, bootstrap, and doctor behavior.
_Avoid_: Preferences, config

**Managed Path**:
An app-owned path resolved by platform rules for config, database, logs, cache, runtime metadata, models metadata, temp files, or downloads.
_Avoid_: Local path, app folder

**User Root**:
A user-selected root such as the asset library root or model root.
_Avoid_: Managed path, default folder

**Path Root ID**:
The logical owner identifier for a stored path value.
_Avoid_: Root enum, path namespace

**Library-Relative Path**:
A stored path representation relative to the library root.
_Avoid_: Relative file path, portable path

**Legacy Absolute Path**:
An existing physical path retained for compatibility reads.
_Avoid_: Old path, absolute fallback

**Path Remap**:
A future mapping from a stored logical root and relative value to the current physical root location.
_Avoid_: Path rewrite, migration

**Dry Run**:
A side-effect-free plan or report that shows what would happen without changing user data, files, settings, or runtime state.
_Avoid_: Simulation, preview

**Blocking Issue**:
A plan or report finding that prevents the operation from safely proceeding.
_Avoid_: Error, warning

**Warning**:
A non-blocking risk or limitation that should be surfaced to the user or maintainer.
_Avoid_: Notice, hint

**Settings Migration Plan**:
A dry-run or gated plan for upgrading persisted settings while preserving user roots.
_Avoid_: Settings migration, upgrade

**Doctor**:
The environment diagnostic system that reports platform, dependency, AI Worker, port, native dependency, and managed path health.
_Avoid_: Health check, diagnostics

**Doctor Report**:
The generated set of doctor check results and overall status.
_Avoid_: Health report, diagnostic output

**Doctor Repair**:
A bounded in-app repair action for a specific doctor check.
_Avoid_: Auto fix, cleanup

**Path Governance**:
The rules and reports that prevent unsafe path reads, writes, migrations, moves, deletes, or private path exposure.
_Avoid_: Path management, migration work

**Package Smoke**:
A release-candidate validation flow for packaged app artifacts.
_Avoid_: Installer test, packaging smoke test

**Sandbox Install Smoke**:
A package smoke variant that runs installer validation inside a disposable sandbox rather than on the host.
_Avoid_: Host install test, E2E install

**Release Flow**:
The governed packaging path for Windows and macOS artifacts. One shared
promotion invariant owns `blocked`, `candidate_ready`, `distribution_ready`,
and `publish_ready`; platform gates own Authenticode/Sandbox or Developer
ID/notarization/Gatekeeper evidence. Publishing still requires explicit
approval.
_Avoid_: Build pipeline, distribution

**Release Update Metadata**:
A path-free, checksum-bound description of one versioned release artifact and
its blockmap for a specific platform, architecture, and release channel. It is
required release evidence but does not itself enable auto update or publishing.
_Avoid_: Latest file, publish config, download manifest

**Signed Release Candidate**:
A retained release artifact built only after explicit dispatch confirmation
and approval for the platform signing environment. It remains unpublished
until every Release Flow gate and separate publish approval pass.
_Avoid_: Release, production build, published installer

**Release Trust Evidence**:
Structured, path-free verification results for platform trust gates such as
Authenticode, Developer ID, Hardened Runtime, nested signatures, notarization,
staple, Gatekeeper, and DMG integrity.
_Avoid_: Signing log, certificate dump, security output
