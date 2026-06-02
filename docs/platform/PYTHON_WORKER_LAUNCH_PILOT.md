# Python Worker Launch Pilot

Phase 11B adds a controlled Python Worker launch boundary.

## Added Planning

- controlled args-array launch plan;
- working directory containment check;
- configurable port validation;
- environment warning for sensitive-looking keys;
- crash log plan;
- stop plan;
- real process runner adapter.

## Test Boundary

Tests use `MockAiRuntimeProcessRunner`. They do not start a real Python process.

`RealAiRuntimeProcessRunner` is an adapter boundary for later manual use. It does not install Python or dependencies.

## Safety Boundaries

This phase does not:

- install Python;
- install Python dependencies;
- automatically start the Python Worker;
- delete temp files during cleanup;
- download models;
- change AI Worker HTTP API.

## Next Step

Phase 11C should adapt the old AI Client toward AI Runtime through an adapter and mock bridge while preserving old-chain fallback.
