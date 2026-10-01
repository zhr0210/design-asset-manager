# Batch Failures Keep Recovery Separate from Undo

Failed items in a Mixed Batch Result should remain in Capture Inbox and should
not participate in Batch Undo because the Candidate Batch Action did not
successfully change their state. Each failed item should expose a Batch Failure
Reason and a Failure Recovery Action such as Retry Failed Item, opening
details, changing the target collection, or skipping. Automatic retry should be
limited to clearly transient failures and should not be enabled by default, so
the app does not repeat writes or create ambiguous candidate state.

ADR 0476 likewise keeps Paused/resumable operation authority and conflicted
Missing-initialization owner groups separate from successful-effect Undo. Resume
or a newly reviewed plan is not disguised as Undo, and Undo never retries an
uncommitted assignment.

ADR 0479 also separates Retry from recovery: only a transient failure with a
proven no-commit outcome and an unchanged complete frozen owner group may retry.
Ambiguous writes, drift, Present values and incompatible evidence remain
conflict or recovery and cannot be relabelled to gain Retry authority.

ADR 0480 prevents Retry and Undo from becoming competing recovery directions.
Undo admission first abandons all remaining forward retry eligibility, and a
later partial Undo never revives it.
