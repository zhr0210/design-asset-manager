// Formal native-window scenario on generated assets and a scratch profile only.
process.env.DAM_E2E_WORKSETS='1'
await import('./library-canvas-electron.e2e.test.mjs')
