# Model Library Core

## Product Interface

`ModelLibrary` is the proposed trusted Main-process Module for the data-only
Model Artifact lifecycle. Its external Interface intentionally has two entries:

- `summarize()` returns a path-free exact-artifact review and verified-storage
  lifecycle/activity projection.
- `install()` accepts only the exact current review fingerprint, the explicit
  `install-exact-reviewed-artifact` decision and the complete acknowledgement
  set.

Callers express one reviewed product intent. Catalog resolution, transport,
byte verification, Blob Store ownership, transaction recovery, filesystem and
Runtime orchestration do not become caller-controlled steps.

## Signed Catalog Admission Validated Tracer

`createInMemoryModelCatalogAdmissionTracer()` proves one internal `admit()`
Seam. It accepts untrusted in-process metadata only when a configured Catalog
identity and pinned Ed25519 public key verify one canonical Catalog/Manifest
envelope. The tracer enforces an exact schema, immutable revision identity,
monotonic in-memory sequence, the signed 24-hour online-trust freshness gate,
bounded declarations and an initial closed data-only role/format policy.

Successful admission creates an immutable, path-free Catalog capability held
in a module-private registry. Copying its visible fields cannot forge the
capability. The Model Library tracer consumes that capability, so composition
can no longer provide `manifestEvidence`, `trustEvidence`,
`dataPolicyEvidence`, compatibility or storage conclusions as positive flags.
The review fingerprint binds the actual pinned-key fingerprint, canonical
Catalog/Manifest metadata, acknowledgement disclosures and conservative
manifest-declared byte impact.

## Transactional Verified Storage Validated Tracer

`openTransactionalModelLibraryTracer()` keeps the same two-entry product
Interface while using only generated model-container fixtures and a newly
created temporary control directory. It streams untrusted source bytes into
staging, proves the exact Manifest file set, byte lengths and SHA-256 digests,
and applies bounded non-executing structural validation for the fixture subset
of Safetensors, GGUF, embedded ONNX tensors, explicitly declared ONNX external
tensor data and declarative resources. External tensor locations are matched
only against admitted logical paths; model metadata never becomes a local
filesystem path. The deliberately narrow ONNX fixture profile requires exact
`location`/`offset`/`length` metadata and non-overlapping full coverage of each
declared external-data resource; broader ONNX compatibility is not claimed.

Fully verified bytes enter an immutable SHA-256-addressed Blob Store. Separate
Manifest identities may reference one physical Blob without sharing Catalog,
acknowledgement or lifecycle identity. A durable commit record is the only
authority for `verified-stored`; staging, journals and valid Blob bytes alone do
not change the public lifecycle. Reopening reconciles incomplete transactions,
revalidates committed Blob bytes and container structure, and reproduces exact
idempotent receipts. Tracer-only interruption points prove both sides of the
commit boundary without entering `ModelLibrary`.

## Model Storage Root Authority Validated Tracer

`createModelStorageAuthorityTracer()` adds an isolated Main-process authority
around the same two-entry `ModelLibrary` Interface. `provision()` accepts only
the factory-bound empty temporary target and creates one opaque app-owned
Model Storage Identity. Failed provisioning rolls back only nodes created and
identity-bound by that attempt; collided reserved entries are neither adopted
nor recursively removed. `open()` never adopts or repairs a root: it verifies
the exact SQLite application/schema/identity record and writable transaction
layout, acquires a non-blocking SQLite/OS exclusive writer lease, reconciles
transactional state while the lease is held and returns a revocable session
containing `library` and idempotent `close()`.

Only one independent test process can hold a writer session for a root. A
contender receives path-free `STORAGE_BUSY`; normal close drains accepted work
before releasing ownership, and abrupt process termination lets the operating
system release the SQLite lock without PID, timestamp or stale-lock takeover.
Closed capabilities return `STORAGE_AUTHORITY_LOST`. Recovery or identity
failure never escapes as a usable session. Long installs recheck authority
after byte acquisition, before Blob publication and immediately before the
commit rename; loss before that logical commit point cannot produce a
`verified-stored` record or continue cleanup through the stale locator.

## Device-local Model Storage Root Registry Validated Tracer

`openModelStorageRootRegistryTracer()` keeps Registry behavior behind exactly
two entries: `summarize()` returns either the path-free durable current-root
projection or a candidate review, while `open()` opens the durable current root
or commits one exact reviewed selection. Candidates are factory-bound opaque
capabilities. Reviewing one opens it through `ModelStorageAuthority`, closes
the temporary session and does not change Registry state.

The device-local SQLite Registry proves explicit first-root selection, restart
reopen, same-identity reconnect with the existing registration, bounded
last-observed conditions and cross-process revision/CAS serialization. A
different Model Storage Identity yields `MIGRATION_REQUIRED`; this Interface
cannot directly switch roots. Missing, forged, mismatched and stale reviews
fail closed, and offline, wrong-identity, read-only, unsafe, unsupported-schema,
integrity, busy and blocked-recovery results preserve the configured
registration. A returned session still exposes only the existing path-free
`ModelLibrary` Interface and idempotent `close()`.

## Bounded Product Workspace Pilot

The sibling `src/main/model-library-workspace/` Module is now registered by the
Electron composition root behind exactly `summarize()` and
`configureStorage()`. It exposes a dedicated Model Library page, a compact AI
Console status/link, exact IPC/Preload intents and no filesystem path. Bundled
Catalog verification reuses the signed-envelope schema/data-only kernel, takes
its application-pinned Publisher public key independently from the bundle and
projects only `release-pinned` catalog metadata; it never mints
`AdmittedModelCatalog` or Fresh Trust Install Admission.

The checked-in public-only release input is the shared runtime and
signed-candidate source for the independent Publisher public-key pin and signed
Catalog. Its two values are intentionally `null` because this repository
contains neither a Publisher private key nor a qualified production Model
Catalog. The live page therefore reports Official Catalog unavailable, blocks
Root configuration before the native picker, and the signed-candidate workflow
stops before packaging. Generated signed fixtures
and task-temporary roots prove the review/confirm workflow only. They do not
make model acquisition, installation, readiness or execution current product
behavior.

The local release-preparation workflow accepts only an explicit public trust
root JSON and already-signed Catalog bundle JSON. It reuses the same Release
Gate, writes one new candidate file with exclusive creation and reports only
aggregate Catalog identity/counts. It reserves the formal release-input file
name and therefore cannot directly replace the checked-in input. It performs no
signing, source access, model-byte inspection, packaging or release action.

## Fact Boundary

All four core Implementations below are isolated Validated Tracers. They are not connected
to the production composition root, IPC, Preload, Renderer, AI Worker, legacy
model registries or real model paths.

Catalog admission still proves only metadata eligibility. The transactional
tracer adds generated-byte and temporary-filesystem evidence; it does not read
or install real user model/cache data and does not prove a model is compatible,
ready, loaded or active. `verified-stored` is intentionally narrower than
Installed or Model Readiness and remains Validated Tracer evidence rather than
Current Implementation.

The storage-authority evidence is intentionally limited to newly created task
temporary roots on the current host. It does not select or register a
production root, inspect real removable volumes, or establish cross-platform
filesystem qualification, hostile-filesystem protection or power-loss
durability.

The device-local Registry uses a task-temporary locator Adapter. It does not
implement production `modelRootDir` compatibility, a folder picker, persisted
macOS bookmark or Windows folder reference, removable-volume qualification,
migration, multiple roots or Runtime Readiness. Registry availability also does
not promote `verified-stored` to Installed.

The sequence floor is process-local and resets with the tracer. The injected
clock makes freshness deterministic but is not Trusted Current Time, clock
rollback defense or Dated Offline Trust Evidence. Raw JSON parsing, duplicate
JSON-key defense, network refresh and trust-state persistence belong to later
Adapters outside this tracer.

## Deliberately Not Implemented

- Catalog network refresh, root rotation, revocation recovery or offline package
  evidence;
- production artifact sources, production storage-root configuration and
  locator Adapters, real internal/removable-volume qualification or power-loss
  durability;
- network download, local import/picker authority, real user model ingestion or
  runtime SQLite integration;
- Runtime compatibility, bounded readiness probes or trusted model loading;
- pause/resume/cancel, activation, uninstall, migration, trust lifecycle UI or
  any install-capable Model Library surface beyond the bounded Pilot.

Legacy acquisition and direct deletion therefore remain fail-closed. Future
production composition must add real internal Adapters and recovery evidence
behind the existing narrow product Interface.

## Verification

```bash
npm run test-model-library-catalog-admission-tracer
npm run test-model-library-core-tracer
npm run test-model-library-verified-blob-store-tracer
npm run test-model-library-storage-authority-tracer
npm run test-model-library-root-registry-tracer
npm run test-model-library-product-pilot
npm run test-model-library-product-pilot-storage
npm run test-official-model-catalog-release-gate
npm run test-official-model-catalog-release-evidence
npm run test-official-model-catalog-release-preparation
npm run test-official-model-catalog-release-preparation-cli
npm run test-official-model-catalog-release-preparation-safety
npm run test-official-model-catalog-release-preparation-governance
npm run test-model-library-core-governance
```
