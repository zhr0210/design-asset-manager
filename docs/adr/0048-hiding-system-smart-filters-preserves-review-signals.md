# Hiding System Smart Filters Preserves Review Signals

Hiding a System Smart Filter should only change its visibility in Workspace
Navigation. It must not disable the underlying Review Signals, count logic, or
workflow evidence for duplicates, unresolved tag suggestions, retention
warnings, recent captures, or similar review states. ADR 0413 separately keeps
Unsorted membership outside Review Signal semantics.

This separates sidebar customization from safety and review behavior. A user
can keep navigation quiet without accidentally turning off candidate expiration
awareness, duplicate review, tag confirmation, or other product-owned work
surfaces; those signals may still appear in Capture Inbox, Asset Inspector, or
the relevant workspace context.
