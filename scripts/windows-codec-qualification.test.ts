import assert from 'node:assert/strict'
import {test} from 'node:test'
import {spawn} from 'node:child_process'
import {once} from 'node:events'
import sharp from 'sharp'
import {createHook} from 'node:async_hooks'
import {prepareVisualJpeg} from '../src/main/visual-ai/visual-preparation'
import {VISUAL_CODEC_WORKER_SOURCE} from '../src/main/visual-ai/visual-codec.worker'
import {isVisualCodecRuntimeQualified, requireVisualCodecQualification} from '../src/main/visual-ai/visual-codec-qualification.internal'
import {readOwnedWindowsProcessPeak,validateOwnedWindowsPeakRecord} from '../src/main/platform/windows-process-memory.internal'
import {createVisualAdmission} from '../src/main/visual-ai/visual-admission'
import {createRequire} from 'node:module'

const qualified = {platform: 'win32', arch: 'x64', node: '20.16.0', electron: '30.5.1', modules: '123', sharp: '0.34.5', vips: '8.17.3'}
const localRequire = createRequire(import.meta.url)
const timers = new Set<number>()
const observer = createHook({init(id, type) {if (type === 'Timeout') timers.add(id)}, destroy(id) {timers.delete(id)}})
observer.enable()

await test('exact Windows versions and native artifacts qualify; other combinations refuse', async () => {
  assert.equal(process.platform, 'win32'); await requireVisualCodecQualification()
  assert.equal(isVisualCodecRuntimeQualified(qualified), true)
  for (const [field, value] of Object.entries({platform: 'linux', arch: 'arm64', node: '25.7.0', electron: '31.0.0', modules: '124', sharp: '0.34.4', vips: '8.17.2'})) {
    assert.equal(isVisualCodecRuntimeQualified({...qualified, [field]: value}), false, field)
  }
  assert.equal(isVisualCodecRuntimeQualified({...qualified, electron: undefined}), false)
})

await test('cold and warm conversions preserve transparency on white and strip metadata', async () => {
  const input = await sharp({create: {width: 80, height: 60, channels: 4, background: {r: 255, g: 0, b: 0, alpha: 0}}}).png().toBuffer()
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await prepareVisualJpeg(input, new AbortController().signal)
    const meta = await sharp(result.jpeg).metadata(), pixel = await sharp(result.jpeg).raw().toBuffer()
    assert.equal(meta.width, 80); assert.equal(meta.height, 60); assert.equal(meta.channels, 3); assert.equal(meta.exif, undefined)
    assert.ok(pixel[0] >= 250 && pixel[1] >= 250 && pixel[2] >= 250)
    assert.ok(result.additionalRss > 0, 'real OS child peak and helper overhead are charged')
  }
})

await test('EXIF orientation is applied before bounded resize and metadata is removed', async () => {
  const input = await sharp({create: {width: 1600, height: 800, channels: 3, background: '#4488bb'}}).jpeg().withMetadata({orientation: 6}).toBuffer()
  const result = await prepareVisualJpeg(input, new AbortController().signal), meta = await sharp(result.jpeg).metadata()
  assert.equal(meta.width, 512); assert.equal(meta.height, 1024); assert.equal(meta.orientation, undefined)
  assert.equal(result.pixels, 1600 * 800)
})

await test('damaged, unsupported, animated and over-pixel inputs refuse without returning bytes', async () => {
  const frames = Buffer.alloc(20 * 40 * 3)
  for (let i = 0; i < frames.length; i += 3) frames[i < frames.length / 2 ? i : i + 2] = 255
  const animated = await sharp(frames, {raw: {width: 20, height: 40, pageHeight: 20, channels: 3}}).webp({loop: 0, delay: [100, 100]}).toBuffer()
  assert.equal((await sharp(animated).metadata()).pages, 2, 'fixture is really multipage WebP')
  const large = await sharp({create: {width: 10000, height: 5001, channels: 3, background: '#4488bb'}, limitInputPixels: false}).png().toBuffer()
  for (const input of [Buffer.from('broken PNG'), Buffer.from('<svg width="10" height="10"></svg>'), animated, large]) {
    await assert.rejects(prepareVisualJpeg(input, new AbortController().signal), /VISUAL_CODEC_FAILED/)
  }
  await assert.rejects(prepareVisualJpeg(new Uint8Array(32 * 1024 * 1024 + 1), new AbortController().signal), /VISUAL_SOURCE_TOO_LARGE/)
})

await test('50M pixel boundary fits the unchanged estimate using real OS evidence', async () => {
  const input = await sharp({create: {width: 10000, height: 5000, channels: 3, background: '#4488bb'}, limitInputPixels: false}).png().toBuffer()
  const result = await prepareVisualJpeg(input, new AbortController().signal)
  assert.equal(result.pixels, 50_000_000)
  assert.ok(result.additionalRss > 0 && result.additionalRss <= input.length + 4 * result.pixels + 256 * 1024 * 1024)
  console.log(JSON.stringify({calibration: 'win32-qualified-codec-50M', pixels: result.pixels, additionalRss: result.additionalRss, estimate: input.length + 4 * result.pixels + 256 * 1024 * 1024}))
})

await test('active cancellation settles owned worker and returns admission material before subsequent use', async () => {
  const input = await sharp({create: {width: 6000, height: 6000, channels: 3, background: '#4488bb'}}).png().toBuffer()
  const admission = createVisualAdmission(), lease = admission.open('synthetic-codec', {sessionToken: 'synthetic', leaseIdentity: 'synthetic'})
  const pending = lease.prepare('generated', async () => input)
  // File read/qualification has started; revoke while native worker preparation can be in flight.
  await new Promise(resolve => setTimeout(resolve, 100)); lease.dispose()
  await assert.rejects(pending)
  assert.equal(admission.inspect().materialBytes, 0); assert.equal(admission.inspect().preparing, 0)
  assert.equal(admission.inspect().accepting, true)
  const fresh = await prepareVisualJpeg(await sharp({create: {width: 2, height: 2, channels: 3, background: '#4488bb'}}).png().toBuffer(), new AbortController().signal)
  assert.equal(fresh.pixels, 4)
})

await test('fixed worker can be forcibly terminated while waiting for input and OS measurement fails closed after exit', async () => {
  const startedAfter=Date.now()
  const child = spawn(process.execPath, ['-e', VISUAL_CODEC_WORKER_SOURCE, '10', localRequire.resolve('sharp')], {
    env: {ELECTRON_RUN_AS_NODE: '1', SystemRoot: process.env.SystemRoot}, stdio: ['pipe', 'pipe', 'ignore', 'pipe', 'pipe'], windowsHide: true
  })
  const startedBefore=Date.now()
  child.stdin!.write(Buffer.from([1]))
  const pid = child.pid!
  const launch={pid,startedAfter,startedBefore}
  try { await readOwnedWindowsProcessPeak(launch); child.kill('SIGKILL'); await once(child, 'close') }
  finally {child.kill('SIGKILL')}
  await assert.rejects(readOwnedWindowsProcessPeak(launch), /VISUAL_CODEC_ESTIMATE_EXCEEDED/)
  await assert.rejects(readOwnedWindowsProcessPeak({...launch,pid:0}), /VISUAL_CODEC_ESTIMATE_EXCEEDED/)
})

await test('reused PID identity, invalid and excessive evidence never return a reservation as safe', async () => {
  const launch={pid:1,startedAfter:100,startedBefore:101}, record={pid:1,created:100,peak:20,current:10,helperPeak:10}
  for(const changed of [{created:102},{created:99},{pid:2},{peak:0},{peak:NaN},{peak:9},{current:0},{helperPeak:0}]) {
    assert.throws(()=>validateOwnedWindowsPeakRecord({...record,...changed},launch),/VISUAL_CODEC_ESTIMATE_EXCEEDED/)
  }
  const admission=createVisualAdmission({codec:async()=>{validateOwnedWindowsPeakRecord({...record,created:102},launch);throw Error('must not resolve')}})
  const lease=admission.open('unsafe-record',{sessionToken:'synthetic',leaseIdentity:'synthetic'})
  try {await assert.rejects(lease.prepare('image',async()=>new Uint8Array([1])),/VISUAL_CODEC_ESTIMATE_EXCEEDED/)}finally{lease.dispose()}
  assert.equal(admission.inspect().materialBytes,0);assert.equal(admission.inspect().accepting,false)
  await assert.rejects(admission.reservePiProbe(new AbortController().signal),/SUSPENDED/)
})

await new Promise(resolve => setImmediate(resolve)); await new Promise(resolve => setImmediate(resolve))
observer.disable(); assert.equal(timers.size, 0, 'no codec deadline/kill timers survive settlement')
