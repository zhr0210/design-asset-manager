// Development-only, synthetic UI preview. Does not load Electron or application stores.
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-refactor-prototype-')))
await fs.symlink(path.join(repoRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir')
await fs.writeFile(path.join(root, 'index.html'), `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DAM · 重构交互原型</title></head><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>`)
await fs.writeFile(path.join(root, 'entry.tsx'), `
import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import Prototype from ${JSON.stringify(`/@fs/${repoRoot}/src/renderer/routes/refactor-prototype/RefactorPrototype.tsx`)}
if (import.meta.env.DEV) {
  createRoot(document.getElementById('root')).render(<HashRouter><Prototype /></HashRouter>)
}
`)
const server = await createServer({
  configFile: false,
  root,
  cacheDir: path.join(root, 'vite-cache'),
  mode: 'development',
  plugins: [react()],
  css: { postcss: { plugins: [] } },
  resolve: { dedupe: ['react', 'react-dom'] },
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root, path.join(repoRoot, 'src'), path.join(repoRoot, 'node_modules')] } }
})
await server.listen()
const address = server.httpServer.address()
console.log(`Refactor prototype: http://127.0.0.1:${address.port}/#/library?mode=library`)
console.log('Synthetic assets and in-memory interactions only. Ctrl+C stops the preview.')
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => {
  await server.close()
  process.exit(0)
})
