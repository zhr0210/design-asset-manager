# Package Smoke Tool

`scripts/package-smoke.mjs` is a callable packaging validation helper for Windows release candidates.

## Commands

Check existing artifacts:

```bash
node scripts/package-smoke.mjs
```

Build the Windows installer and check artifacts:

```bash
node scripts/package-smoke.mjs --build
```

Run an unpacked launch smoke test:

```bash
node scripts/package-smoke.mjs --launch-unpacked
```

Mount a macOS DMG read-only, copy the app into a disposable install root, and
run an isolated launch check:

```bash
node scripts/package-smoke.mjs --dmg-install-smoke --arch=arm64
```

Generate Windows Sandbox files:

```bash
node scripts/package-smoke.mjs --sandbox
```

By default, sandbox staging files are written outside the repo under:

```text
the operating-system temporary directory
```

You can override it with:

```bash
node scripts/package-smoke.mjs --sandbox --work-root=<disposable-work-root>
```

Open Windows Sandbox when `WindowsSandbox.exe` is available:

```bash
node scripts/package-smoke.mjs --sandbox --open-sandbox
```

Generate a Sandbox install E2E script:

```bash
node scripts/package-smoke.mjs --sandbox-install --work-root=<disposable-work-root>
```

With `--sandbox-install`, the generated Sandbox script runs the NSIS installer inside Windows Sandbox with a parent install directory and verifies that the final install path is the `Design Asset Manager` subfolder.
The installer has a 120-second timeout by default. Override it only for slow disposable environments:

```bash
node scripts/package-smoke.mjs --sandbox-install --sandbox-install-timeout-ms=180000
```

## Boundaries

- The host tool does not run the NSIS installer.
- The host launch smoke only starts `win-unpacked` and stops it after the timeout.
- The macOS DMG install smoke mounts the image read-only, copies the app only
  into the disposable install root, uses isolated app-data paths, detaches the
  image, and removes the temporary root.
- App startup logs are evaluated in memory and are not printed, preventing
  local paths from leaking into reports.
- Sandbox staging uses the operating-system temporary directory by default.
- `--arch=x64` and `--arch=arm64` select the expected unpacked directory and
  artifact architecture.
- The sandbox script checks installer presence, hash, signature status, and `win-unpacked` startup.
- The sandbox script runs the NSIS installer only when generated with `--sandbox-install`; this happens inside Windows Sandbox, not on the host.
- The sandbox report is written incrementally with `completed: false`, then finalized with `completed: true` after errors or success, so a stalled installer or failed launch remains observable without treating partial results as complete.
- The generated Sandbox profile disables vGPU and waits briefly after login before running smoke checks, which avoids coupling the smoke result to flaky Sandbox display acceleration.
- Signing may report `warning` until code signing is configured.
- Full installer execution should happen only in a disposable VM or sandbox.
