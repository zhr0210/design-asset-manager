import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

const python = process.platform === 'win32'
  ? path.join(os.homedir(), 'AppData/Local/Programs/Python/Python311/python.exe') : '/usr/bin/python3'
async function run(worker: string, action: string) {
  const file = path.resolve('ai-service/tools', worker)
  const code = `import sys,importlib.util,contextlib,io\nsys.stdout.reconfigure(encoding='cp936',errors='strict')\nspec=importlib.util.spec_from_file_location('owned_worker',${JSON.stringify(file)})\nmodule=importlib.util.module_from_spec(spec)\nspec.loader.exec_module(module)\n${action}\n`
  const child = spawn(python, ['-I', '-B', '-c', code], { shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
  const bytes: Buffer[] = [], errors: Buffer[] = []
  child.stdout.on('data', b => bytes.push(b)); child.stderr.on('data', b => errors.push(b)); child.stdin.end()
  const exit = await new Promise<number | null>((resolve, reject) => { child.once('error', reject); child.once('close', resolve) })
  assert.equal(exit, 0, Buffer.concat(errors).toString('utf8'))
  return JSON.parse(Buffer.concat(bytes).toString('utf8'))
}
await test('managed protocol preserves Chinese and emoji under Windows locale and stdout redirection', async () => {
  const value = await run('managed_vision_worker.py', `with contextlib.redirect_stdout(io.StringIO()):\n module.emit({'kind':'result','value':'中文描述 / 🖼️ / café'})`)
  assert.deepEqual(value, { kind: 'result', value: '中文描述 / 🖼️ / café' })
})
await test('OCR result serializer uses UTF-8 independently of Windows console locale', async () => {
  const value = await run('local_ocr_worker.py', `module.recognize=lambda *_args,**_kwargs: {'blocks':[{'text':'中文文字 / 🖼️ / café'}]}\nraise SystemExit(module.main())`)
  assert.equal(value.ok, true)
  assert.equal(value.value.blocks[0].text, '中文文字 / 🖼️ / café')
  assert.ok(value.peakRamBytes > 0)
})
