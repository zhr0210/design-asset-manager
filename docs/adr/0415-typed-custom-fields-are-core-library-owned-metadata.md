# Typed Custom Fields Are Core Library-Owned Metadata

Generic Collections and tags cannot represent every structured fact an independent designer needs, while plugin-only fields would make essential organization dependent on extension availability. Design Asset Manager therefore provides typed custom fields as core, library-owned metadata.

A library may define optional **Custom Field Definitions** and attach conforming **Custom Field Values** to the Asset Candidates and Design Assets governed by ADR 0416. Definitions and values are authoritative portable library state, participate in Full Library Backup, and remain interpretable without the plugin or application configuration that may have helped create or import them. ADR 0438 preserves a previously valid value as marked Out-of-Constraint metadata when a later validation rule becomes restrictive rather than revoking that ownership. They never become application-global or device-only fields by default.

Portable definition metadata may include an explicitly declared presentation
preference such as ADR 0453 Default Text Editor Presentation. Such metadata
does not redefine the field's type, value identity or validation semantics, and
temporary Inspector view state does not become library schema.

Custom fields participate in declared structured filtering and, where their type supports textual representation, lexical search. Missing values are valid under ADR 0413 Search-First Organization and never block admission, promotion, Original Handoff or export. The core does not infer Client/Project entities or workflow status from a field's name under ADR 0414.

This decision establishes core ownership and search/filter participation. ADR 0416 owns the value-bearing object classes, ADR 0438 owns preservation plus progressive revalidation after restrictive rule changes, and ADR 0453 separates portable Text presentation defaults from temporary Inspector state. The initial field-type set, multiplicity, exact rule catalogs, AI population, plugin registration, metadata import/export mapping and original-file writeback remain dependent decisions rather than hidden defaults.
