import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

/** Load actual runtime bindings in the selected Electron. Never rebuild shared dependencies. */
export function verifyNativePackageInputs({ platform, arch = process.arch }) {
  const expectedPlatform = platform === 'win' ? 'win32' : platform === 'mac' ? 'darwin' : null
  if (!expectedPlatform || process.platform !== expectedPlatform || arch !== process.arch) {
    throw Error('Native candidate must be built on its actual target platform and architecture.')
  }
  const require = createRequire(import.meta.url)
  const probe = `
    const fs = require('node:fs'), crypto = require('node:crypto'), path = require('node:path');
    const Database = require('better-sqlite3'), sharp = require('sharp');
    (async () => {
      const db = new Database(':memory:');
      try { db.exec('CREATE TABLE probe(value INTEGER); INSERT INTO probe VALUES(17)');
        if (db.prepare('SELECT value FROM probe').pluck().get() !== 17) throw Error('SQLITE_BINDING_FAILED');
      } finally { db.close(); }
      const png = await sharp({create:{width:7,height:5,channels:3,background:'#336699'}}).png().toBuffer();
      const decoded = await sharp(png).raw().toBuffer({resolveWithObject:true});
      if (decoded.info.width !== 7 || decoded.info.height !== 5 || decoded.data[0] !== 51) throw Error('SHARP_BINDING_FAILED');
      const bindings = Object.keys(require.cache).filter(file=>file.endsWith('.node')).map(file=>({
        file:path.relative(process.cwd(),file).split(path.sep).join('/'),
        sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
      }));
      console.log(JSON.stringify({platform:process.platform,arch:process.arch,electron:process.versions.electron,
        abi:process.versions.modules,sqlite:db.name === ':memory:' ? 'loaded-and-executed' : 'invalid',
        sharp:sharp.versions,bindings}));
    })().catch(()=>{console.error('NATIVE_PACKAGE_INPUT_INVALID');process.exitCode=1});
  `
  const result = spawnSync(require('electron'), ['-e', probe], {
    cwd: process.cwd(), env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    windowsHide: true, encoding: 'utf8', timeout: 30000, maxBuffer: 65536
  })
  if (result.status !== 0) throw Error('Native package input could not load/execute in target Electron; prepare matching dependencies in an isolated checkout.')
  const observation = JSON.parse(result.stdout.trim())
  if (observation.platform !== expectedPlatform || observation.arch !== arch || !observation.electron ||
      observation.sqlite !== 'loaded-and-executed' || !observation.bindings.some(binding => binding.file.includes('better_sqlite3.node')) ||
      !observation.bindings.some(binding => binding.file.includes('sharp'))) throw Error('NATIVE_PACKAGE_INPUT_INVALID')
  return observation
}
