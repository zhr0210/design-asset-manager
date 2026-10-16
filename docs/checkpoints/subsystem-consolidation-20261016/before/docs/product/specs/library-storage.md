# 资料库身份与存储角色：详细能力契约

本文承接原ADR中的细节，保留所有原数字、例外、状态和相互约束；[来源映射](../../checkpoints/documentation-rebuild-20261015/adr-migration.json)逐段核对。**有效要求不是当前交付声明，也不是本轮实施队列。** 现行已批准产品/设计在其明确替代范围内优先；不凭实现缺失判决定无效。

当前系统从[library-lifecycle](../../subsystems/library-lifecycle.md)进入；当前实际能力/版本见[CURRENT-STATE](../../handoff/CURRENT-STATE.md)，交互与视觉分别归[交互目录](../../design/README.md)/[DESIGN](../../../DESIGN.md)。详细条款按下面独立主题定位，不全量装入每次上下文。

## 主题导航

- [0286 · Sequential Originals Buckets Seal After Two Thousand Commits](#adr-0286)
- [0287 · Managed Original Names Use A Twelve Character Base32 Disambiguator](#adr-0287)
- [0288 · Managed Original Readable Stems Preserve Unicode With Dual Length Budgets](#adr-0288)
- [0289 · Managed Original Extensions Follow Verified Real Format Evidence](#adr-0289)
- [0290 · Managed Original Path Overflow Shrinks Only The Readable Stem](#adr-0290)
- [0291 · Managed Original Paths Use Conservative Portable And Windows Budgets](#adr-0291)

<a id="adr-0286"></a>

## 0286 · Sequential Originals Buckets Seal After Two Thousand Commits

决定来源：[0286-sequential-originals-buckets-seal-after-two-thousand-commits.md](../../adr/0286-sequential-originals-buckets-seal-after-two-thousand-commits.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0286-p001"></a>

Managed Originals Storage Bucket policy v1 uses monotonic ASCII decimal directory names beginning with `0001`, `0002`, and so on. Names are zero-padded to at least four digits for stable lexical order and grow naturally beyond `9999`; they are never localized, time-derived, hash-derived, or reused. With no early closure or lifecycle churn, 100,000 retained managed originals therefore occupy about fifty buckets rather than one flat directory.

<a id="0286-p002"></a>

The library's authoritative bucket inventory records the policy version, monotonic next bucket ordinal, current allocation-eligible bucket, per-bucket creation identity, cumulative successful allocation count, capacity, and sealed or unavailable state. A bucket is registered only when the application creates a previously absent safe ordinary directory inside the physically resolved ADR 0282 binding under the Exclusive Library Lock and a journaled transaction. An existing unregistered path is never adopted even when empty. If a proposed sequential name already exists, is case/normalization-equivalent, linked, replaced, or otherwise unproven, the allocator records that ordinal as skipped, leaves the entry untouched, and advances to the next safe absent name without scanning or importing it.

<a id="0286-p003"></a>

Each successfully committed library-owned Original Asset consumes one permanent allocation position in the active bucket: an ordinary single-file original contributes one file entry, while ADR 0341 contributes one Compound Original Directory entry regardless of its validated member count. Failed or cancelled staging that never commits consumes none. At 2,000 cumulative successful commits the bucket atomically becomes a **Sealed Managed Originals Storage Bucket** before another allocation may begin. Candidate rejection, Asset Trash, Permanent Asset Delete, ownership conversion, recovery, or external deletion never decrements that count, reopens the bucket, backfills an older bucket, renumbers later buckets, or moves surviving files. Only the latest registered allocation-eligible bucket accepts new commits.

<a id="0286-p004"></a>

ADR 0343 Compound Member Repair fills one proven vacant internal member path without allocating a new bucket position. A complete Compound Directory Rebuild is a new successful directory allocation and consumes one permanent position even though the Compound Original Identity remains unchanged; the former position is never decremented if its superseded directory is later moved to operating-system trash or becomes empty. Rebuild replay commits that reservation at most once.

<a id="0286-p005"></a>

The 2,000 limit governs application allocations, not ownership of arbitrary external entries. Before every final commit, the allocator rechecks registered bucket identity, physical boundary, directory type, case/Unicode collisions, the monotonic count and actual entry occupancy. If unknown entries, an external rename/replacement, permissions, filesystem semantics, or another inconsistency makes the current bucket full or unsafe for a new entry, it is closed to new allocation and a later sequential bucket is created; unknown entries are never deleted, moved, adopted, or counted as managed originals. Existing known files remain available unless their own ADR 0283 reconciliation says otherwise.

<a id="0286-p006"></a>

Bucket reservation and original-file or Compound Original Directory commit share one item-atomic journal boundary: a crash cannot expose a successfully activated Candidate whose bucket/path/inventory commit is missing, nor advance a committed allocation twice on replay. ADR 0278 Library Switch admits no new reservation for the outgoing library and completes or rolls back the current item before Library Quiescence. Library Open Inspection reconciles unfinished bucket journals and treats an unprovable bucket inventory or identity as a boundary-level recovery issue rather than inferring state from directory names.

<a id="0286-p007"></a>

A future policy version may choose a different capacity only for newly created buckets and must retain every existing bucket's recorded capacity and terminal state. It cannot rebalance or rename prior buckets without ADR 0276 Material Library Migration governed by ADR 0003. The current implementation has no bucket inventory, allocator, monotonic ordinal, permanent allocation count, sealed state, journal coupling, or collision skip; it copies source basenames into one flat directory. This ADR records target architecture only and creates, scans, renames, moves, copies, or deletes no runtime/user directory or file and changes no public IPC, database schema, or AI Worker API.

<a id="0286-p008"></a>

ADR 0287 supplies the collision-checked short disambiguator for each name allocated within a bucket. Bucket capacity and short-name collision handling are independent: extending one new file's suffix does not consume another allocation position, reopen a bucket, or change any existing path.

<a id="adr-0287"></a>

## 0287 · Managed Original Names Use A Twelve Character Base32 Disambiguator

决定来源：[0287-managed-original-names-use-a-twelve-character-base32-disambiguator.md](../../adr/0287-managed-original-names-use-a-twelve-character-base32-disambiguator.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0287-p001"></a>

Managed Original Storage Name v1 uses the physical pattern `<readable-stem>--<short-disambiguator>.<validated-extension>`. The default **Managed Original Short Disambiguator** is the first twelve characters of lowercase Crockford Base32 over the leading 60 bits of SHA-256 applied to the ASCII domain prefix `dam-managed-original-name-v1\0` followed by the Original Storage Object Identity scheme's canonical bytes. Its alphabet is exactly `0123456789abcdefghjkmnpqrstvwxyz`, excluding `i`, `l`, `o`, and `u`, and uses no locale, punctuation, case distinction, timestamp, device identifier, source URL, content digest, Candidate Identity, or Design Asset Identity.

<a id="0287-p002"></a>

ADR 0341 applies the same alphabet, default length and deterministic 16-character/four-character collision-growth policy to a Compound Original Directory named `<primary-readable-stem>--<short-disambiguator>`, but derives that suffix from the Compound Original Identity under the separate ASCII domain prefix `dam-compound-original-directory-name-v1\0`. Internal member files do not receive independent identity suffixes when doing so would break their capability-required relative names or basename relationship; their individual Original Storage Object Identities remain authoritative in library state.

<a id="0287-p003"></a>

An ADR 0343 Compound Directory Rebuild keeps the same Compound Original Identity and therefore may reuse its committed directory name in a newly allocated bucket when that target path is physically vacant and safe. It does not add a generation/counter suffix merely because a superseded directory remains elsewhere. Authoritative current-path state and rebuild/residue evidence distinguish the directories; the visible disambiguator alone never does.

<a id="0287-p004"></a>

The full Original Storage Object Identity remains authoritative in the owned-file inventory. The twelve-character suffix is only a human-visible physical-name disambiguator and is never accepted alone to prove ownership, relink a moved file, merge objects, resolve a backup, or recover a missing original. Hashing the opaque identity before truncation prevents identity structure or ordering from leaking through the filename and gives the 100,000-asset baseline a uniformly distributed 60-bit comparison space without making a cryptographic uniqueness claim.

<a id="0287-p005"></a>

Allocation first reserves a case-insensitively unique disambiguator across the complete current library inventory, then checks the full proposed filename after the target filesystem's case folding and Unicode normalization against physical bucket entries. If another full storage identity already owns the same twelve-character suffix anywhere in the library, or an unknown physical entry occupies the resulting name, only the uncommitted new file extends its disambiguator deterministically to 16 characters, then by four-character increments as needed from the same Base32 digest; the existing entry is never renamed. A collision that remains after the complete digest encoding, or an inventory/physical mismatch that cannot be proven to be only a short-prefix/name collision, blocks commit without overwriting, counter-appending, regenerating content, or guessing ownership.

<a id="0287-p006"></a>

The chosen suffix length and complete final Managed Original Storage Name are journaled with the ADR 0286 bucket reservation and ADR 0280 original commit. Replay reuses that exact allocation or rolls it back; it does not choose a new suffix after a crash. Once committed, a policy update cannot shorten, extend, or rename existing files merely for uniformity. A later safe external rename is still governed by ADR 0283 and need not retain the application suffix, but losing the suffix never weakens the full-identity evidence required for reconciliation.

<a id="0287-p007"></a>

ADR 0288 resolves readable-stem sanitization and dual length budgets, ADR 0289 resolves the Validated Storage Extension, and ADRs 0290/0291 resolve complete-path overflow and budgets. The current code uses raw source basenames and a separate case-insensitive numeric append-counter dry run, without Original Storage Object Identity or a collision-proof commit. This ADR records target architecture only and hashes no runtime/user identity, allocates or renames no file, and changes no public IPC, database schema, or AI Worker API.

<a id="adr-0288"></a>

## 0288 · Managed Original Readable Stems Preserve Unicode With Dual Length Budgets

决定来源：[0288-managed-original-readable-stems-preserve-unicode-with-dual-length-budgets.md](../../adr/0288-managed-original-readable-stems-preserve-unicode-with-dual-length-budgets.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0288-p001"></a>

Managed Original Storage Name v1 derives its **Managed Original Readable Stem** from the received filename stem without transliteration, pinyin conversion, ASCII slugging, timestamp insertion, title substitution, or content-based renaming. Before transformation, the complete received basename is retained as filename provenance separately from its source path. Search and display may use that provenance under their normal rules; the sanitized physical stem never silently replaces the Design Asset title or the received filename record.

<a id="0288-p002"></a>

ADR 0341 applies the same transformation to the primary-derived readable stem of a Compound Original Directory. Its internal members preserve their validated capability-required relative names instead of independently receiving this application naming pattern, so sanitization or truncation cannot silently break a companion relationship.

<a id="0288-p003"></a>

Stem transformation is deterministic and versioned. It normalizes valid Unicode to NFC, replaces every slash, backslash, `<`, `>`, `:`, `"`, `|`, `?`, `*`, C0/C1 control code point, NUL, and other platform-declared forbidden path scalar with `_`, and removes trailing spaces or periods. A remaining leading period is prefixed with `_` so an application-created original is not hidden. Case-insensitive Windows device stems including `con`, `prn`, `aux`, `nul`, `clock$`, `conin$`, `conout$`, `com1` through `com9`, and `lpt1` through `lpt9` are prefixed with `_`; `.` and `..` are not accepted as stems. Internal ordinary spaces and safe Unicode remain unchanged.

<a id="0288-p004"></a>

After transformation, the stem is truncated only at an extended grapheme-cluster boundary so it simultaneously occupies no more than 160 UTF-8 bytes and 120 UTF-16 code units. The limits apply to the readable stem before ADR 0287's separator/disambiguator and the validated extension, which remain included in the final full-component and full-path safety check. ADR 0290 may shorten that stem further when the selected Library Root and storage path leave less headroom, but cannot alter the disambiguator or extension to preserve readability. If trimming or truncation leaves no visible safe stem, the stable ASCII fallback is `asset`. NFC/case-equivalent stems remain distinct physical files because the library-wide short disambiguator is unique; normalization never merges originals.

<a id="0288-p005"></a>

The exact transformation version, received basename, chosen stem, byte/code-unit measurements, and final Managed Original Storage Name are committed with the ADR 0287/0286 allocation journal. Replay cannot re-sanitize under a newer policy. A later policy version applies only to new allocations unless an explicit ADR 0276 Material Library Migration renames existing paths. New Library Restore may allocate a destination physical name under its compatible current policy because physical names are not portable object identity, while object-level copy-back to the same library reuses the committed storage allocation when safely available.

<a id="0288-p006"></a>

ADR 0283 external rename/move reconciliation does not require the application-generated `--<short-disambiguator>` pattern, but the accepted replacement path must still pass equivalent cross-platform forbidden-character, hidden-name, component-budget, full-path, collision, type, link, and physical-boundary checks. A user rename that is valid only on the current platform or exceeds the portable budget enters Managed Original Recovery/repair instead of being recorded as a portable managed path; the application does not silently rewrite it.

<a id="0288-p007"></a>

ADR 0289 resolves Validated Storage Extension selection, ADR 0290 resolves insufficient-path-headroom behavior, and ADR 0291 fixes the complete-path budgets. The current download dry-run sanitizer replaces a narrower Windows character set, collapses whitespace and appends counters, while the normalization service uses raw basenames; neither supplies this Unicode/provenance/dual-budget contract. This ADR records target architecture only and reads, normalizes, stores, truncates, allocates, or renames no runtime/user filename and changes no public IPC, database schema, or AI Worker API.

<a id="0288-p008"></a>

ADR 0385 may use the retained complete received basename as naming provenance
for a managed external export, but applies its own visible destination-aware
Export Name Normalization. It does not expose this ADR's library-storage suffix
or assume the managed physical stem is the user's preferred export name.

<a id="adr-0289"></a>

## 0289 · Managed Original Extensions Follow Verified Real Format Evidence

决定来源：[0289-managed-original-extensions-follow-verified-real-format-evidence.md](../../adr/0289-managed-original-extensions-follow-verified-real-format-evidence.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0289-p001"></a>

Managed Original Storage Name v1 assigns its **Validated Storage Extension** only after the staged bytes pass the same signature, structure, and real-decode evidence that selects a versioned Capture Format Capability for preview. The detected format identity and its active verified capability are authoritative. A received filename extension, producer-declared MIME, HTTP content type, operating-system association, or shared rendering worker is only supporting evidence and can neither establish nor override the format; using PDFium to render a PDF-compatible Illustrator file, for example, does not rename that Illustrator original to PDF.

<a id="0289-p002"></a>

Each verified format capability declares one canonical lowercase extension and its valid received aliases. When the received extension is a declared alias for the detected format, the storage name preserves that alias in lowercase, such as `.TIF` becoming `.tif` rather than being changed to `.tiff`. When the extension is absent, misleading, or invalid for those bytes, the storage name uses the capability's canonical lowercase extension. This changes only the physical filename and never transcodes, repairs, wraps, or rewrites the original bytes. Capability-declared extension tokens must themselves pass the portable filename safety contract.

<a id="0289-p003"></a>

Vendor and container specificity is preserved when it is part of verified format identity. Camera formats therefore keep capability-verified extensions such as `.cr3`, `.nef`, or `.arw` rather than collapsing to generic `.raw`; AI, PSD, PSB, TIFF, PDF, and other containers likewise retain their actual verified format rather than the extension of a decoder, embedded preview, or normalized derivative. The complete received basename remains separate provenance under ADR 0288 even when the physical extension is corrected.

<a id="0289-p004"></a>

If no active verified capability can establish the real format and its extension mapping, the application does not invent `.bin`, trust the received suffix, or report a successfully activated original. Candidate Intake, Progressive Reference Indexing, and Managed Original Recovery retain their respective explicit unsupported/capability/scan/recovery state until the required evidence is available. This remains compatible with broad format coverage: installing a verified Format Capability Pack can add evidence and retry the item, but cannot retroactively pretend the earlier allocation succeeded.

<a id="0289-p005"></a>

The ADR 0286/0287 allocation journal records the detected format identity, capability identity and revision, received extension evidence, chosen Validated Storage Extension, alias-preserved or canonical-fallback reason, and final storage name without recording a private source path. Replay reuses that committed decision. A later capability or alias-table update applies to new allocations and explicit revalidation only; it never mass-renames existing originals merely for spelling uniformity. Exact-byte ADR 0284 copy-back may reuse a committed name once its recorded format evidence verifies, while an explicit different-byte replacement must revalidate its format and cannot retain an extension that is invalid for the replacement merely to avoid a journaled path change.

<a id="0289-p006"></a>

ADR 0283 external rename/move reconciliation accepts a lowercased or differently cased declared alias, but a suffix that misrepresents the verified bytes enters item-scoped recovery/repair instead of being silently rewritten or recorded as a safe portable managed path. ADR 0290 preserves this extension when reducing a path to fit, and ADR 0291 supplies the exact complete-path budgets. The current normalization service copies a raw basename, falls back from decoder metadata to the received extension, and finally defaults an empty format to JPEG; it has no versioned format-capability extension mapping or allocation evidence. This ADR records target architecture only and reads, detects, decodes, rewrites, allocates, renames, or moves no runtime/user file and changes no public IPC, database schema, or AI Worker API.

<a id="0289-p007"></a>

ADR 0385 applies the same truthful real-format principle to Original Asset
Export names. It may preserve a capability-valid received/current alias, but it
cannot reintroduce a missing or misleading received suffix merely to reproduce
filename provenance; any visible suffix correction renames only the exact-byte
external copy.

<a id="adr-0290"></a>

## 0290 · Managed Original Path Overflow Shrinks Only The Readable Stem

决定来源：[0290-managed-original-path-overflow-shrinks-only-the-readable-stem.md](../../adr/0290-managed-original-path-overflow-shrinks-only-the-readable-stem.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0290-p001"></a>

Managed-original allocation evaluates the complete proposed path after the Library Root, ADR 0282 binding, ADR 0286 bucket, ADR 0287 disambiguator, and ADR 0289 Validated Storage Extension are known. It must satisfy both a versioned portable path policy and the actual target filesystem's reported component/path constraints before staging or commit. Availability of a long-path API inside the application does not by itself prove that Finder/File Explorer, external editors, backup tools, removable volumes, or another supported platform can use the same path.

<a id="0290-p002"></a>

When the complete proposal exceeds a budget, the allocator preserves the storage bucket, `--` separator, complete collision-resolving disambiguator, dot, and Validated Storage Extension. It shortens only the ADR 0288 Managed Original Readable Stem, deterministically and at extended grapheme-cluster boundaries, until the path fits. It never shortens the identity-derived suffix, removes or changes the real-format extension, selects a misleading extension, changes bytes, chooses an unrelated directory, or falls back to application data merely to make the write succeed. The complete received basename remains provenance, so physical truncation does not discard the user-visible source name.

<a id="0290-p003"></a>

For an ADR 0341 Compound Original, the complete proposal includes the outer Compound Original Directory and every capability-required member relative path. Overflow handling may shorten only the outer directory's primary-derived readable stem; it preserves the complete compound-identity disambiguator and never independently truncates, suffixes, flattens or renames a member in a way that breaks the declared layout. If the minimum safe outer directory plus required member layout cannot fit, the entire item follows the same blocked Managed Original Path Headroom outcome.

<a id="0290-p004"></a>

The allocation journal records the governing path-policy version, measured root-relative and absolute lengths, target-filesystem limits used, path-driven stem truncation, selected final stem, and final path without persisting a private absolute source path. Replay reuses the same committed allocation. Collision-driven suffix extension re-runs the full measurement and may shorten only the still-uncommitted new stem further; it never renames an existing file.

<a id="0290-p005"></a>

If the stable fallback `asset--<complete-disambiguator>.<validated-extension>` still cannot satisfy the budgets, only that managed-original write is blocked before Candidate Activation or ownership commit. The application reports insufficient **Managed Original Path Headroom** and offers a shorter Library Root/binding or an explicit ADR 0276 Material Library Migration where applicable. It does not claim success, omit the suffix/extension, write outside the active Library Root, convert the item to a Referenced Asset, or truncate an arbitrary parent directory. Library Start/Open Inspection should detect when even this minimum allocation cannot fit so the problem is not discovered only after a long capture or import.

<a id="0290-p006"></a>

Referenced Assets keep their user-owned names and locations and are not renamed or rejected merely to conform to this managed-write naming policy; their actual accessibility and preview capability remain truthful. Existing Managed Originals are likewise never mass-renamed when a policy changes or a portable library is opened from a deeper location. Safely accessible existing files remain recorded, while incompatible paths block affected new writes or enter the applicable open/migration/recovery flow. An external rename beyond the accepted budget follows ADR 0283 recovery/repair rather than silent truncation.

<a id="0290-p007"></a>

ADR 0291 fixes the v1 portable root-relative, Windows absolute, and live-filesystem budgets. The current normalization service joins an application-global directory with the raw basename and performs no portable or live-filesystem path-headroom planning; the separate download governance code is dry-run-only and checks characters/collisions rather than full path budgets. This ADR records target architecture only and measures, truncates, allocates, renames, moves, writes, or reads no runtime/user path and changes no public IPC, database schema, or AI Worker API.

<a id="adr-0291"></a>

## 0291 · Managed Original Paths Use Conservative Portable And Windows Budgets

决定来源：[0291-managed-original-paths-use-conservative-portable-and-windows-budgets.md](../../adr/0291-managed-original-paths-use-conservative-portable-and-windows-budgets.md)。这是按其命名能力/版本适用的来源契约，当前要求须结合本节适用范围与明确替代决定核对；本次迁移不新增交付资格。原文字句/数字/例外保留，以避免提炼丢失保证。

<a id="0291-p001"></a>

Managed Original Path Policy v1 admits a new final Library Root-relative path only when its normalized portable representation, including Managed Originals Directory Binding, bucket, separators, and complete Managed Original Storage Name, occupies no more than 200 UTF-8 bytes and no more than 200 UTF-16 code units. ADR 0341 applies the same complete-path budgets separately to every final Compound Original member path, including the outer Compound Original Directory and declared internal relative layout. Measurement normalizes every component under the ADR 0288 NFC policy and uses one-character portable separators; it does not use Unicode scalar count, grapheme count, locale width, JavaScript string length as a byte substitute, percent encoding, or a display-shortened path. Every component must also satisfy ADR 0288 and the target volume's reported component limit.

<a id="0291-p002"></a>

On Windows, the resolved canonical final absolute path must additionally occupy no more than 240 UTF-16 code units, counting drive or UNC root and separators but excluding an internal extended-path namespace prefix and terminating NUL. The application may be long-path-aware for safely reading existing Managed Originals and user-owned Referenced Assets, but that capability does not relax this conservative new-managed-write boundary: the remaining margin protects ordinary File Explorer, external-editor, backup, safe-save, and temporary-name interoperability that cannot be inferred from the application's own file API success.

<a id="0291-p003"></a>

macOS does not receive a second arbitrary fixed absolute-path number. macOS, Windows, removable, network, synchronized, and other admitted target volumes must all pass the live filesystem's reported component and complete-path constraints; the most restrictive result wins alongside the portable and Windows policies. If required limits cannot be queried or their write semantics cannot be proven, Library Start/Open Inspection does not infer safety from the current pathname and keeps managed writes unavailable under the existing filesystem-capability rules.

<a id="0291-p004"></a>

ADR 0290 shortens only the readable stem until all applicable measurements pass. For a Compound Original, only the outer directory's readable primary stem may shrink; required internal names and relationships remain intact. Final, staging, rollback, collision-extension, and atomic-commit paths required by the allocation must each be preflighted against their own actual location; a valid final name cannot conceal an overlong transaction path. If the minimum `asset--<complete-disambiguator>.<validated-extension>` for a single file or the minimum safe compound directory plus required member layout still fails, ADR 0290 blocks that write. The journal records the policy version and numeric measurements without persisting a private source path.

<a id="0291-p005"></a>

The v1 limits govern new allocations, destination-side New Library Restore, explicit replacement, and Material Library Migration planning. They never mass-rename existing files. Moving a portable library to a deeper root triggers ADR 0276 Library Open Inspection against the new absolute location; safely accessible existing assets remain recorded, while managed writes that cannot meet current headroom require a shorter root/binding or explicit migration rather than hidden relocation. Referenced Assets remain outside this managed-creation budget and retain truthful accessibility state.

<a id="0291-p006"></a>

The current path join and download dry-run code has no UTF-8/UTF-16 dual full-path measurement, Windows absolute compatibility budget, target-volume limit query, or transaction-path preflight. This ADR records target architecture only and measures, truncates, allocates, reads, writes, renames, moves, or migrates no runtime/user path and changes no public IPC, database schema, or AI Worker API.
