# Workspace Navigation Has Four Primary Sections

Workspace Navigation should use four stable left-side sections: Workspace
Entries for core surfaces such as Asset Grid, Capture Inbox, and Web Capture
Entry; the collection tree for Collection Groups and Asset Collections; and
the Sources Section for referenced roots and Source Trees; and Smart Filters
for review-focused sets such as duplicate candidates, tag suggestions awaiting
confirmation, and candidates nearing expiration. Asset Trash and other Library
Utility Entries remain in a stable bottom utility area rather than becoming a
fifth organization section.

This keeps the Eagle-like library structure clear while separating collection
ownership, source provenance, workflow destinations, and review queues. Users
can distinguish formal organization, the actual referenced folder hierarchy,
capture intake, web collection, and system-assisted review without treating a
disk folder as an Asset Collection.

The Sources Section appears only when the library has a referenced source. An
In-Place Reference Library lists its adopted root first and may list additional
referenced locations below it. Selecting a source or Source Tree node applies a
visible Source Scope to Asset Grid and provides a clear-scope action; it never
creates a Collection Membership. Source nodes may summarize indexing, offline,
missing, and Reference Scan Exception state. Dragging or rearranging navigation
items does not move, rename, rewrite, or delete source files. ADR 0292
Referenced Source Operations are separate explicit asset/file commands; their
availability does not turn Source Tree organization gestures into filesystem
mutations.

ADR 0344 projects a Referenced Compound Original once at its primary member's
current Source Tree location. Companion paths remain Inspector provenance and
never duplicate the asset under their own nodes or make Source Scope selection
an implicit member operation.
