#!/usr/bin/env node
'use strict';
// Read-only Windows diagnostic. It compiles production source in memory.
// It does not patch code, read user data, spawn a model or call a provider.
// Run: node replay-admission-probe.cjs --root="G:\antigravity\Design Asset Manager 1001"
const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');
const rootArg = process.argv.find(arg => arg.startsWith('--root='));
const root = path.resolve(rootArg ? rootArg.slice(7) : process.cwd());
if (process.platform !== 'win32') {
  console.log(JSON.stringify({status:'NOT_APPLICABLE',reason:'This reproduction is deliberately restricted to Windows.'}));
  process.exit(0);
}
const entry = path.join(root, 'src/main/visual-ai/visual-admission.ts');
if (!fs.existsSync(entry) || !fs.existsSync(path.join(root, 'package.json'))) {
  console.error('Expected DAM source root was not found. No action performed.');
  process.exit(2);
}
const projectRequire = Module.createRequire(path.join(root, 'package.json'));
const {buildSync} = projectRequire('esbuild');
const filename = path.join(root, '__read_only_vision_audit.cjs'); // never written
const output = buildSync({absWorkingDir:root,entryPoints:[entry],bundle:true,format:'cjs',platform:'node',target:'node20',packages:'external',write:false,logLevel:'silent'});
const compiled = new Module(filename, module);
compiled.filename = filename;
compiled.paths = Module._nodeModulePaths(root);
compiled._compile(output.outputFiles[0].text, filename);
(async () => {
  const admission = compiled.exports.createVisualAdmission();
  const before = admission.inspect();
  const lease = admission.open('audit-synthetic', {sessionToken:'audit-only',leaseIdentity:'audit-only'});
  let preparationError = null, ocrError = null, probeError = null;
  try { await lease.prepare('synthetic', async () => new Uint8Array([1])); }
  catch (error) { preparationError = error instanceof Error ? error.message : 'UNKNOWN_ERROR'; }
  finally { lease.dispose(); }
  const afterPrepare = admission.inspect();
  admission.resume();
  try { const permit = await admission.reserveOcr(1, new AbortController().signal); permit.release(); }
  catch (error) { ocrError = error instanceof Error ? error.message : 'UNKNOWN_ERROR'; }
  try { const permit = await admission.reservePiProbe(new AbortController().signal); permit.release(); }
  catch (error) { probeError = error instanceof Error ? error.message : 'UNKNOWN_ERROR'; }
  const reproduced = preparationError === 'VISUAL_CODEC_UNQUALIFIED' && ocrError === 'VISUAL_ADMISSION_SUSPENDED' && probeError === 'VISUAL_ADMISSION_SUSPENDED';
  console.log(JSON.stringify({status:reproduced?'F01_REPRODUCED':'F01_NOT_REPRODUCED',platform:process.platform,node:process.version,before,preparationError,afterPrepare,afterResume:admission.inspect(),ocrError,probeError,scope:'Diagnostic only, not application acceptance or actual model/GUI verification.'},null,2));
})().catch(error => { console.error(error instanceof Error ? error.message : 'DIAGNOSTIC_FAILED'); process.exitCode=1; });
