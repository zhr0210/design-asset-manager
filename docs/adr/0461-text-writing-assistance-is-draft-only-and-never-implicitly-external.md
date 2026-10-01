# Text Writing Assistance Is Draft-Only And Never Implicitly External

Spelling, grammar and rewriting help can improve manual metadata entry, but it
must not become a second validation engine, silently rewrite exact design
terminology or turn editor focus into permission to disclose private Text.
**Text Writing Assistance** therefore produces non-authoritative diagnostics or
replacement proposals for the active Text Edit Draft only. An underline,
issue count or absence of findings never changes the draft, proves field
validity, changes search/filter state or writes a Custom Field Value.

Only a capability with evidence that draft content remains on the current
device may perform continuous or typing-time checks as local assistance. An
operating-system service is not assumed local merely because the platform
provides it: if its active configuration may contact a remote service or its
execution location cannot be established, it follows the external-request
boundary below. Unsupported, disabled or unverifiable checking is shown as Not
Checked or Unavailable rather than as error-free Text.

Checked languages, local language detection and assistance availability are
device-local **Writing Language Preferences**. They do not enter a Custom Field
Definition, portable library state, backup, merge, search or the Portable Text
Pattern Rule and cannot classify the authoritative value's language. The
macOS and Windows adapters may expose different proven local capabilities while
returning the same checked, unchecked, unavailable and external-required
product states.

Automatic correction, capitalization, smart quotes, smart dashes and
operating-system text substitutions are individually disabled by default for
Custom Field Text. A user may explicitly enable them as device-local editor
preferences. Even then they may act only in the focused draft after
input-method composition gives up ownership, each resulting change participates
in draft-local Undo/Redo, and no existing authoritative value is rewritten in
the background. Selecting a spelling, grammar or rewriting proposal likewise
changes only its visibly identified range in the draft and never commits,
resolves a stale revision or passes ADR 0465's Unsaved Custom Field Changes
Gate.

Every proposed replacement remains plain Unicode input to the draft. The host
rejects malformed Unicode or an ADR 0442 Interoperability-Unsafe Text Code Point
without changing the range and never strips or escapes content to make a
proposal apply. A safe replacement may leave the draft over length, below its
minimum, outside its Portable Text Pattern Rule or otherwise invalid; ordinary
inline validation remains authoritative and blocks only the later commit.
Writing diagnostics and provider confidence cannot override those rules.

Any capability that may transmit Text creates a separate, user-invoked
**External Writing Assistance Request**. Before sending, trusted UI identifies
the provider, purpose, execution location and whether the exact current
selection or complete current draft will be transmitted, together with the
provider's declared retention and remote-deletion limits. The request sends no
owner identity, field label, library metadata, asset content, paths, other
drafts or surrounding Inspector state by default. It never starts from typing,
focus, provider configuration, stored credentials, an enabled extension,
AI Value Suggestions or a prior request. Cancellation can prevent unsent work
but cannot promise deletion after a provider has received it.

External responses remain reviewable proposals and never apply automatically.
Applying one explicitly changes only the disclosed draft range and follows the
same safety, validation, Undo and commit rules as a local proposal. Existing
ADR 0154 Analysis Result Provider and Inspector Panel Contribution capabilities
do not grant access to Text Edit Drafts or writing-assistance requests; a future
extension-provided writing lane requires its own public capability, sensitive
content/network permission and operation-scoped host grant.

Request and response Text, diagnostics, checked tokens and replacement content
do not become AI analysis evidence, Custom Field Value Suggestions, portable
metadata, history, backup, sync, logs, telemetry, diagnostics, crash reports,
notifications or plugin data merely because assistance ran. Only content the
user actually applies becomes part of the ordinary Text Edit Draft and may then
enter ADR 0455 protected draft recovery. Content-free provider, action and
outcome status may support trusted consent and failure reporting without
recording the Text.
