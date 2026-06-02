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

Generate Windows Sandbox files:

```bash
node scripts/package-smoke.mjs --sandbox
```

By default, sandbox staging files are written outside the repo under:

```text
G:\codex\DesignAssetManagerPackageSmoke
```

You can override it with:

```bash
node scripts/package-smoke.mjs --sandbox --work-root=G:\codex\another-package-smoke-folder
```

Open Windows Sandbox when `WindowsSandbox.exe` is available:

```bash
node scripts/package-smoke.mjs --sandbox --open-sandbox
```

Generate a Sandbox install E2E script:

```bash
node scripts/package-smoke.mjs --sandbox-install --work-root=G:\codex\DesignAssetManagerPackageSmokeInstall
```

With `--sandbox-install`, the generated Sandbox script runs the NSIS installer inside Windows Sandbox with a parent install directory and verifies that the final install path is the `Design Asset Manager` subfolder.

## Boundaries

- The host tool does not run the NSIS installer.
- The host launch smoke only starts `win-unpacked` and stops it after the timeout.
- Sandbox staging is created under `G:\codex` by default.
- The sandbox script checks installer presence, hash, signature status, and `win-unpacked` startup.
- The sandbox script runs the NSIS installer only when generated with `--sandbox-install`; this happens inside Windows Sandbox, not on the host.
- The generated Sandbox profile disables vGPU and waits briefly after login before running smoke checks, which avoids coupling the smoke result to flaky Sandbox display acceleration.
- Signing may report `warning` until code signing is configured.
- Full installer execution should happen only in a disposable VM or sandbox.
