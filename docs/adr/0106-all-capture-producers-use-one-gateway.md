# All Capture Producers Use One Gateway

Scope update under ADR 0483: embedded browsing/page collection is retired; the shared
intake boundary remains. External connectors are target consumers, not delivered endpoints.

Every Capture Producer must submit a transport-neutral Capture Envelope through one main-process Capture Gateway, so local clipboard intake, future external browser connectors or scoped local APIs, ADR 0292 Copy Into Library file import, and ADR 0154 Capture or Import Producer plugins share Candidate Identity, provenance, validation, and lifecycle rules. Electron IPC, Extension Host and future REST endpoints are thin adapters; React, plugins and producers must not write Candidate Records or Design Assets directly. Each envelope carries a Capture Request Identity for idempotent retries plus source, method, artifact locator, and metadata intent, excludes browser cookies or credentials, and lets the gateway return Candidate Identity while coordinating artifact acquisition and analysis.

ADR 0292 Reference in Place deliberately does not enter this ownership-taking gateway because it creates no library-owned Candidate Artifact. Its selected originals remain user-owned and follow the reference scan/validation, System Preview Ready, source monitoring, and missing-source recovery boundaries. Neither path may silently switch to the other after the user confirms Asset File Ownership.
