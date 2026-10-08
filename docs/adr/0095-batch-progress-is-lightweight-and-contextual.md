# Batch Progress Is Lightweight and Contextual

Batch Operation In Flight should expose progress without blocking the user's
workspace. Capture Inbox Activity Panel should show Batch Progress Summary.
Currently visible candidate cards or details may show Item Progress State, while
navigation away from the active review surface should keep a Background
Progress Indicator available. Completion Transition should turn progress into
Inline Batch Result for complex outcomes or Candidate Undo Toast for fully
successful low-risk actions. The app should not use a blocking full-screen
progress modal by default.

ADR 0458 projects Batch Text Edit recovery from its durable operation record.
After interruption, the contextual surface shows proven completed and remaining
counts plus Resume, Cancel Remaining and Undo Completed only when the current
device holds the required protected evidence; it never exposes previous Text in
global progress or notifications.
