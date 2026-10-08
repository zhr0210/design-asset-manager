# Workspace Toolbar Is Contextual

Workspace Toolbar should serve the currently active workspace rather than act
as a global command dumping ground. Asset Grid toolbar controls should focus on
search, view mode, sorting, filtering, and thumbnail size; when a Sources
Section selection applies Source Scope, that scope remains visibly labeled with
a clear-scope action instead of becoming a hidden filter. Candidate Review Page
toolbar controls should focus on Capture Batch filters, Candidate Status
filters, Batch Promotion, and rejection actions; Web Capture Entry toolbar
controls should focus on URL navigation, back and forward navigation, and
capture controls.

This keeps each workspace operationally dense without making the top of the app
feel like a mixed global menu. Global navigation stays in Workspace Navigation,
while toolbar actions stay close to the content they modify.

When sorting by a Text Custom Field, ADR 0451 keeps the chosen field, direction,
Natural/Exact mode and any Natural language visible from the sort control
rather than hiding them behind the current operating-system locale.
