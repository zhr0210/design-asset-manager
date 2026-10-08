# Extension Contracts And Deferred Agent Development Access

Status: Accepted (2026-09-14). Target architecture; no public Extension API, development API or MCP server is delivered by this ADR.

The application will expose versioned, capability-specific contracts around assets, analysis
results, tasks and scoped UI, with one host-owned authorization and write boundary. Built-in
features and optional providers can share those contracts. Development agents and browser
connectors are consumers through adapters, not replacements for the host or permission engine.
This trades unrestricted extension power for stable user data and practical interoperability.

## Scope and staging

ADR 0151–0160 remain the extension reference, subject to these explicit refinements:

- Their full catalog, seven contribution surfaces, worker languages, payment/vendor classes,
  native target matrices and distribution UI are target specifications, not one mandatory MVP.
  Choose and validate a small named subset with real plugins before declaring a stable SDK.
  Core AI+ development and internal reference implementations do not wait for an open marketplace.
- Analysis, command, declared UI and host-reviewed result/export proposals are candidate initial
  surfaces. A plugin may propose a derived asset or export through an approved dedicated contract;
  it still cannot directly write the authoritative library, access arbitrary filesystem paths,
  replace Originals or invoke private IPC. Bounded derived staging remains host-granted.
  This replaces ADR 0154's assumption that its exact seven surfaces and total export exclusion
  have already frozen the first stable API; it grants no currently callable export capability.
- Ordinary and sensitive rights remain individually disclosed and selectable. A single trusted
  review may capture multiple explicit grants/installs; separate rights do not mandate repetitive
  modal dialogs. Undeclared rights, automatic asset upload and expanded update permissions remain denied.
- Stable APIs require declared compatibility and migration policy. Before the first stable SDK,
  experimental contracts are labelled unstable and do not acquire a fictitious support window.
  ADR 0159's previous-major/twelve-month policy becomes a candidate to confirm before that release,
  rather than a prerequisite for today's prototype. Any promise actually made to external users
  must still be honored or explicitly addressed; no silent breaking stable updates are allowed.
- Third-party execution still requires enforced isolation, scoped handles, bounded resources,
  source/permission verification and failure containment under ADR 0155/0156/0158. Deferring
  marketplace breadth never permits executing untrusted code inside Main/primary Renderer.
  Installation, activation, capability readiness and trust are separate states.
- Plugin packages, data-only model artifacts and executable runtimes retain distinct identities
  and lifecycles; shared resources go through host capability bindings (ADR 0152/0160/0161/0173).
  Disabling a plugin does not delete user assets or prior attributed results.

ADR 0485 adds screen recording as an optional capture producer. The host retains admitted
videos, selected reference-frame records and source attribution; plugin removal cannot remove
them. Screen/audio acquisition requires declared dedicated permissions and platform evidence.
The core Work Mode reference surface does not depend on installing that producer.

## Future AI-assisted development connector

A Cloud Inference Provider performs a scoped model request. An Agent Development Connector
lets an external local/cloud AI client discover documentation/capabilities and work inside an
explicitly selected application or plugin Development Workspace. Community sharing is a third,
explicit publication action. None of these grants the other two automatically.

Future development access should expose an Agent Context Pack (product terms, supported
schemas/capabilities, SDK examples, validation instructions and current limitations), and only
host-validated tools for an identified development grant. AGENTS.md conveys guidance; it is
not a filesystem/network permission mechanism. MCP may adapt public tools/resources to an
AI client; it is not a model inference API, a plugin runtime, or a substitute for authorization.
The transport remains independent of the domain contracts; no protocol version is frozen here.

A Development Access Grant identifies the client, workspace, allowed paths/operations, expiry,
resource limits and approved external destination where applicable. Default access excludes
real asset libraries, credentials, runtime/model caches and installed application resources.
A user may explicitly authorize narrower real-data work; code generation never implicitly
approves running generated code, installing/activating a plugin, publishing it or updating the app.
The host enforces bounds, revocation, cancellation and redacted audit; trusted review guards
consequential actions. Prompt files and third-party instructions cannot enlarge the grant.

## Priority and current compatibility

The new development connector, cloud control service, account/billing system and community
marketplace are deferred pending concrete user demand and a separately scoped implementation
request. Reserve their seams and context formats now; do not add placeholder public endpoints,
a general shell/file API, a fake MCP server or backend selection merely to claim readiness.
Existing explicitly confirmed external inference capabilities remain intact under ADR 0002/0141.
No API key, data upload, model/dependency installation or runtime service is started by this ADR.

References: [MCP architecture](https://modelcontextprotocol.io/docs/learn/architecture) describes
context/tool exchange; [MCP security guidance](https://modelcontextprotocol.io/specification/draft/basic/security_best_practices)
provides implementation considerations. The actual version and transport require validation at
implementation time. [PRODUCT-FOUNDATION.md](../product/PRODUCT-FOUNDATION.md) owns product scope.
