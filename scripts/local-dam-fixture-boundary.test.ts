import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {readSyntheticFixtures} from '../src/main/local-host/synthetic-fixtures'
const root=await fs.mkdtemp(path.join(os.tmpdir(),'dam-fixture-boundary-'))
try {
  await fs.mkdir(path.join(root,'fixtures','ocr'),{recursive:true})
  await fs.writeFile(path.join(root,'fixtures','registry.json'),JSON.stringify({schema:1,origin:'http://127.0.0.1:54321',ocr:true}))
  const fixture=readSyntheticFixtures(root)
  assert.equal(fixture!.permits('visual-ai:run'),true)
  assert.equal(fixture!.permits('ai-connection:login'),false)
  fixture!.assertBackend({enabled:true,baseUrl:'http://127.0.0.1:54321/v1',transport:'pi',providerKind:'openai-compatible',authMode:'none'} as any)
  assert.throws(()=>fixture!.assertBackend({enabled:true,baseUrl:'http://127.0.0.1:54322/v1'} as any),/SYNTHETIC_ENDPOINT_DENIED/)
  assert.throws(()=>fixture!.authorizePi({kind:'login',connection:{baseUrl:'http://127.0.0.1:54321/v1'}}),/SYNTHETIC_EXECUTION_DENIED/)
  fixture!.authorizePi({kind:'infer',connection:{enabled:true,baseUrl:'http://127.0.0.1:54321/v1',transport:'pi',providerKind:'openai-compatible',authMode:'none'}})
  await assert.rejects(fixture!.fetch('http://127.0.0.1:54322/file.png'),/SYNTHETIC_ENDPOINT_DENIED/)
  await fs.writeFile(path.join(root,'fixtures','registry.json'),JSON.stringify({schema:1,origin:'https://example.org',ocr:true}))
  assert.throws(()=>readSyntheticFixtures(root),/SYNTHETIC_FIXTURE_INVALID/)
  console.log('PASS exact fixture registration rejects adjacent loopback, external services and account execution')
} finally { await fs.rm(root,{recursive:true,force:true}) }
