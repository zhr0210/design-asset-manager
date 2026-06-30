# Python Worker Launch Pilot

The Python Worker uses a controlled Electron main-process launch boundary.

## Added Planning

- controlled args-array launch plan;
- working directory containment check;
- configurable port validation;
- environment warning for sensitive-looking keys;
- crash log plan;
- stop plan;
- real process runner with operating-system PIDs, bounded output tails, and graceful-stop escalation.

## Test Boundary

Provider tests use `MockAiRuntimeProcessRunner`. A focused process-runner test starts a disposable local child process and verifies output bounding plus termination.

On macOS, the registered Python Worker runtime starts automatically. Electron shutdown waits for active runtimes to stop so the Worker does not remain orphaned.

## Safety Boundaries

This phase does not:

- install Python;
- install Python dependencies;
- delete temp files during cleanup;
- download models;
- change AI Worker HTTP API.

## Runtime Evidence

Read-only capability probes allow a 30-second cold-start budget. Real model evidence still requires a dedicated load or inference probe; process-running state alone is not model readiness.
