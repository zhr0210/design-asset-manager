# Smart Filter Editing Follows Ownership

Smart Filter editing should follow ownership. User Smart Filters are user
content, so their criteria can be edited in Advanced Filter Panel, saved back
to the same Smart Filter, duplicated with a save-as action, deleted, and
reordered.

System Smart Filters represent application-owned review workflows, so their
criteria should be viewable but read-only; users may hide or restore their
navigation visibility, but should not edit their criteria or delete them. This
protects safety and review entry points such as duplicates, tag confirmation,
expiration, and recent captures while keeping user-created saved
views flexible.

Under ADR 0449, a User Smart Filter containing Duplicate Text Value Finding may
add or remove ordinary visible exclusion criteria only through this normal
editing flow. A result-row Ignore or Dismiss action never mutates its saved
query behind the user.
