# Asset Inspector Is Resizable and Responsive

The persistent right-side Asset Inspector should default visible on desktop,
while remaining resizable and collapsible. The user's inspector width and
collapsed state should be remembered for the workspace so repeated asset review
feels stable across selection changes and app sessions.

The inspector must have layout guardrails: minimum and maximum widths should
protect the Asset Grid's scanning area, resizing should reflow grid columns
without overlapping asset cards, and collapsing the inspector should preserve
the current asset selection. On narrow windows, the inspector should become a
right-side drawer or bottom detail layer for the selected asset instead of
permanently consuming grid space.

ADR 0453 Expanded Text editors may resize vertically only within the available
Inspector or responsive detail-layer bounds. Resizing must not create
horizontal overflow, hide the field's validation evidence or turn the current
editor height into portable Custom Field Definition metadata.

This keeps Eagle-like always-available detail inspection on desktop without
making the Asset Grid feel cramped, unstable, or visually overloaded.
