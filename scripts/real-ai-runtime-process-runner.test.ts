import assert from 'node:assert/strict'
import { execPath } from 'node:process'
import { RealAiRuntimeProcessRunner } from '../src/main/services/ai-runtime/process/real-ai-runtime-process-runner'

const runner = new RealAiRuntimeProcessRunner()
const processState = await runner.spawn(execPath, [
  '-e',
  "let n=0; const timer=setInterval(()=>{ console.log('line-'+n); n+=1; if(n===30) clearInterval(timer) }, 2); setInterval(()=>{}, 1000)"
], {
  cwd: process.cwd(),
  env: Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
})

assert.ok(processState.pid > 0)
assert.notEqual(processState.pid, process.pid)

const running = await waitForProcessOutput(processState.pid)
assert.equal(running?.exitedAt, null)
assert.ok((running?.stdoutTail.length ?? 0) <= 20)
assert.ok(running?.stdoutTail.at(-1)?.startsWith('line-'))

assert.equal(await runner.kill(processState.pid), true)
const stopped = runner.getProcess(processState.pid)
assert.ok(stopped?.exitedAt)
assert.ok(stopped?.signal === 'SIGTERM' || stopped?.signal === 'SIGKILL')

console.log('real-ai-runtime-process-runner passed')

async function waitForProcessOutput(processId: number): Promise<ReturnType<typeof runner.getProcess>> {
  const deadline = Date.now() + 2_000
  let process = runner.getProcess(processId)
  while (!process?.stdoutTail.some((line) => line.startsWith('line-')) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25))
    process = runner.getProcess(processId)
  }
  return process
}
