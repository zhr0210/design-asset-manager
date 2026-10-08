// Isolated development preview. Never loads the production App, Electron or library stores.
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import yaml from 'js-yaml'
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const root=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'dam-work-mode-preview-')))
await fs.symlink(path.join(repo,'node_modules'),path.join(root,'node_modules'),'dir')
const text=await fs.readFile(path.join(repo,'DESIGN.md'),'utf8')
const tokens=yaml.load(text.split(/^---\s*$/m)[1])
const css=Object.entries(tokens.colors).map(([k,v])=>`--${k}:${v};`).join('')+Object.entries(tokens.rounded).map(([k,v])=>`--radius-${k}:${v};`).join('')
await fs.writeFile(path.join(root,'index.html'),`<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DAM · Gallery & Glass</title><style>.work-prototype{${css}}</style></head><body><div id="root"></div><script type="module" src="/entry.tsx"></script></body></html>`)
await fs.writeFile(path.join(root,'entry.tsx'),`import React from 'react';import{createRoot}from'react-dom/client';import Prototype from ${JSON.stringify(`/@fs/${repo}/src/renderer/routes/work-mode-prototype/WorkModePrototype.tsx`)};createRoot(document.getElementById('root')).render(<Prototype/>);`)
const server=await createServer({configFile:false,root,cacheDir:path.join(root,'cache'),plugins:[react()],css:{postcss:{plugins:[]}},resolve:{dedupe:['react','react-dom']},server:{host:'127.0.0.1',port:Number(process.env.DAM_PROTOTYPE_PORT||0),strictPort:true,fs:{allow:[root,path.join(repo,'src'),path.join(repo,'node_modules')]}}})
await server.listen()
console.log(`Work mode prototype: http://127.0.0.1:${server.httpServer.address().port}/`)
console.log('Synthetic data only. Explicit Save uses browser-local prototype storage; no real library or inference.')
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await server.close();process.exit(0)})
