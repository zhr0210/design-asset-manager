// Review the formal application using an isolated generated Library and real Main/Preload.
process.env.DAM_LIBRARY_CANVAS_REVIEW='1'
await import('./library-canvas-electron.e2e.test.mjs')
