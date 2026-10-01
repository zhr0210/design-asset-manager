# Asset Export Shares Physical Volume Lanes And Bounds Heavy Encoding

Asset Export participates in one host-owned exclusive **Physical Volume File
Lane** per stable physical-volume identity. This is the shared underlying lane
used by ADR 0317/0332 Referenced Source Volume Lane participants rather than a
parallel export-only queue. Consequently an export cannot read or stage on a
volume while another application-directed relocation, transfer, rewrite,
source deletion or other lane-governed file mutation independently claims that
same volume. The lane is an application scheduler, not an operating-system lock
against external editors, so every source and destination is still revalidated.

Each ADR 0387 Asset Export Commit Unit acquires every physical volume containing
an authoritative source member plus its destination-volume staging/final path.
It acquires multiple lanes in stable physical-volume-identity order to prevent
opposite-direction deadlock and holds them from authoritative source validation
and reading through staging, complete verification, atomic publication and
immediate outcome reconciliation. Managed and Referenced Assets follow the same
lane rule; a Compound Original includes every distinct member volume and its
destination in one deterministically ordered set.

At most one active lane-governed application file operation may involve a given
physical volume. Commit units whose complete volume sets are disjoint may run
concurrently when the media resource gate also admits them. A path string,
drive letter, mount name, claimed SSD class, filesystem marketing label or
removable/network guess never establishes separate physical identity or higher
concurrency. Unknown or unstable volume identity falls back to conservative
serialization rather than assumed independence.

A placement waiting for conflict review, destination reconnection, explicit
resume or recovery does not retain lanes indefinitely. It first reaches an ADR
0388 safe checkpoint, durably preserves its source/path/staging guards and
truthful state, then releases the I/O lanes. Continuation and every automatic or
manual retry reacquire the complete current lane set in deterministic order and
freshly revalidate all evidence. An atomic publication, replacement trash call
or recovery reconciliation already in progress settles before its lane is
released.

Compatible Export also enters a host-owned **Media Processing Resource Gate**.
Version one admits at most one **Heavy Compatible Export** globally. Heavy
classification comes from format/encoder capability evidence, conservative or
measured peak memory/accelerator demand, source structure and live pressure;
PSD, PSB, TIFF, RAW and other professional sources are examples, not filename-
based hard-coded truth. Missing or stale resource evidence classifies the work
conservatively instead of assuming it is lightweight.

An Original Asset Export exact-byte copy may overlap one admitted compatible
encode only when their complete physical-volume sets are disjoint and current
memory, accelerator, thermal, battery/power and staging-capacity evidence shows
safe headroom. Two heavy compatible encodes do not overlap in version one.
Lighter media work may overlap only under proven headroom and never by bypassing
volume lanes, placement guards, complete validation or the one-heavy limit.

Explicit foreground Asset Export has higher admission priority than background
AI analysis, indexing, preview pre-generation and other deferrable maintenance.
Those background systems yield at their own safe boundaries, but Asset Export
does not borrow the Local AI Resource Governor as an encoder scheduler, start an
AI model, download a model/runtime or change analysis intent. A host resource
coordinator shares current pressure and foreground-demand evidence between the
Media Processing Resource Gate and ADR 0173 Local AI Resource Governor while
each retains its domain-specific lifecycle.

ADR 0407 governs non-preemptive task-fair rotation, frozen Compatible Export
Variant Priority, retry re-entry and the absence of manual cross-task priority.
Those admission preferences remain subordinate to the lanes and Media
Processing Resource Gate defined here.

Any shared intermediate optimization requires the same frozen source content
generation and compatible input/render evidence for every consumer. It remains
attempt-owned ephemeral processing state, never a published result or reusable
export authority. If equivalence or validity is not proven, each variant
decodes/renders independently. Reordering or reuse cannot alter a recipe,
output bytes implied by that recipe, reviewed name/path, conflict choice,
variant/placement commit boundary, retry evidence or result reporting. Priority
never resolves a same-plan collision, makes one variant a fallback, or permits
one variant to replace another.

ADR 0408 governs typed resource waits, the Auto/manual 1–16 Asset Export
Concurrency Ceiling, measurable responsiveness acceptance and hysteresis.
Those guards may reduce future admission but never weaken the lane, heavy-media,
publication or recovery boundaries in this ADR.

ADR 0409 governs foreground-loss profiles, Continue Asset Export After Closing
The Window and its required projection through the shared ADR 0174 Application
Status Center. Background lifecycle never creates another lane namespace or lets
work outlive the host.

ADR 0391 defines the provisional Export Set root cleanup boundary;
activity/result/receipt retention follows ADR 0392. The current application has
no complete shared Physical Volume File Lane or Asset Export Media Processing
Resource Gate; ADR 0409 separately records the missing Application Status
Center projection. This ADR records target
architecture only and schedules, creates, reads, copies, renders, exports,
stages, writes, publishes, encodes, retries, rewrites, replaces, trashes,
restores, renames, moves, deletes, analyzes, downloads or changes no
runtime/user file, credential, sidecar, directory, database, cache, model,
backup, metadata value, analysis result, source relationship, public IPC,
database schema or AI Worker API.
