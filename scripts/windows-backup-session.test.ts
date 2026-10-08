import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {constants} from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {test} from 'node:test'

// Qualification counterexamples, not a production Adapter. libuv 1.46.0 win.h:
// EXLOCK denies read/write/delete sharing but attribute access bypasses that gate.
const EXLOCK = 0x10000000
const FILE_WRITE_ATTRIBUTES = 0x100
const GENERIC_WRITE = 0x40000000
const execFileAsync = promisify(execFile)
const reparseProbe = String.raw`
$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @'
using System;
using System.IO;
using System.Text;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;
public static class BackupReparseCounterexample {
 [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
 public static extern SafeFileHandle CreateFile(string name,uint access,uint share,IntPtr security,uint creation,uint flags,IntPtr template);
 [DllImport("kernel32.dll", SetLastError=true)]
 public static extern bool DeviceIoControl(SafeFileHandle handle,uint code,byte[] input,uint bytes,IntPtr output,uint outBytes,out uint returned,IntPtr overlap);
 public static byte[] Junction(string destination) {
  byte[] substitute=Encoding.Unicode.GetBytes(@"\??\"+destination),print=Encoding.Unicode.GetBytes(destination);
  using(var stream=new MemoryStream()) using(var writer=new BinaryWriter(stream)) {
   writer.Write((uint)0xA0000003);writer.Write((ushort)(8+substitute.Length+print.Length+4));writer.Write((ushort)0);
   writer.Write((ushort)0);writer.Write((ushort)substitute.Length);writer.Write((ushort)(substitute.Length+2));writer.Write((ushort)print.Length);
   writer.Write(substitute);writer.Write((ushort)0);writer.Write(print);writer.Write((ushort)0);return stream.ToArray();
  }
 }
}
'@
$handle=[BackupReparseCounterexample]::CreateFile($env:DAM_PROBE_DIRECTORY,[uint32]$env:DAM_PROBE_ACCESS,7,[IntPtr]::Zero,3,0x02200000,[IntPtr]::Zero)
$openError=[Runtime.InteropServices.Marshal]::GetLastWin32Error()
try {
 $set=$false;$setError=$null
 if(-not $handle.IsInvalid){$buffer=[BackupReparseCounterexample]::Junction($env:DAM_PROBE_DESTINATION);[uint32]$returned=0;$set=[BackupReparseCounterexample]::DeviceIoControl($handle,0x900a4,$buffer,$buffer.Length,[IntPtr]::Zero,0,[ref]$returned,[IntPtr]::Zero);$setError=[Runtime.InteropServices.Marshal]::GetLastWin32Error()}
 [pscustomobject]@{opened=(-not $handle.IsInvalid);openError=$openError;set=$set;setError=$setError}|ConvertTo-Json -Compress
}finally{$handle.Dispose()}
`
interface ReparseResult {opened: boolean; openError: number; set: boolean; setError: number | null}

async function fixture() {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'dam-backup-namespace-')))
  const directory = path.join(root, 'directory'), outside = path.join(root, 'outside')
  await fs.mkdir(directory); await fs.mkdir(outside)
  await fs.writeFile(path.join(outside, 'sentinel.txt'), 'Owned synthetic sentinel')
  const attack = async (access: number): Promise<ReparseResult> => {
    const {stdout} = await execFileAsync(path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe'),
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(reparseProbe, 'utf16le').toString('base64')], {
        env: {SystemRoot: process.env.SystemRoot ?? 'C:\\Windows', WINDIR: process.env.SystemRoot ?? 'C:\\Windows',
          DAM_PROBE_DIRECTORY: directory, DAM_PROBE_DESTINATION: outside, DAM_PROBE_ACCESS: String(access)},
        windowsHide: true, timeout: 15000, maxBuffer: 4096
      })
    return JSON.parse(stdout.trim())
  }
  return {root, directory, outside, attack, close: async () => {
    assert.equal(path.dirname(root), await fs.realpath(os.tmpdir()))
    assert.ok(path.basename(root).startsWith('dam-backup-namespace-'))
    // Remove the owned link itself before recursively removing our fixture root.
    if ((await fs.lstat(directory)).isSymbolicLink()) await fs.unlink(directory)
    await fs.rm(root, {recursive: true, force: true, maxRetries: 3, retryDelay: 100})
  }}
}

await test('measured directory sync and rename protection do not grant Windows backup qualification', async () => {
  assert.equal(process.platform, 'win32'); assert.equal(process.arch, 'x64')
  assert.equal(process.versions.electron, '30.5.1'); assert.equal(process.versions.node, '20.16.0'); assert.equal(process.versions.uv, '1.46.0')
  const f = await fixture(), handle = await fs.open(f.directory, constants.O_RDWR | EXLOCK)
  try {
    assert.ok((await handle.stat()).isDirectory())
    await handle.sync()
    await assert.rejects(fs.rename(f.directory, f.directory + '-renamed'), {code: 'EBUSY'})
    await fs.writeFile(path.join(f.directory, 'owned-child.txt'), 'synthetic')
  } finally {await handle.close(); await f.close()}
})

await test('attribute-only reparse bypasses EXLOCK on an empty directory before the first child write', async () => {
  const f = await fixture(), handle = await fs.open(f.directory, constants.O_RDWR | EXLOCK)
  try {
    const zero = await f.attack(0)
    assert.equal(zero.opened, true); assert.equal(zero.set, false); assert.equal(zero.setError, 5)
    const write = await f.attack(GENERIC_WRITE)
    assert.equal(write.opened, false); assert.equal(write.openError, 32)
    const attributes = await f.attack(FILE_WRITE_ATTRIBUTES)
    assert.equal(attributes.opened, true); assert.equal(attributes.set, true)
    assert.equal((await fs.lstat(f.directory)).isSymbolicLink(), true)
    assert.equal(await fs.realpath(f.directory), f.outside)
    // Deliberate synthetic tracer: a pathname publisher would escape despite EXLOCK.
    await fs.writeFile(path.join(f.directory, 'counterexample.txt'), 'owned probe only', {flag: 'wx'})
    assert.equal(await fs.readFile(path.join(f.outside, 'counterexample.txt'), 'utf8'), 'owned probe only')
    assert.equal(await fs.readFile(path.join(f.outside, 'sentinel.txt'), 'utf8'), 'Owned synthetic sentinel')
  } finally {await handle.close(); await f.close()}
})

await test('an already-created child stops this mount-point attack but cannot protect the earlier empty interval', async () => {
  const f = await fixture(), handle = await fs.open(f.directory, constants.O_RDWR | EXLOCK)
  try {
    await fs.writeFile(path.join(f.directory, 'owned-child.txt'), 'synthetic', {flag: 'wx'})
    const attributes = await f.attack(FILE_WRITE_ATTRIBUTES)
    assert.equal(attributes.opened, true); assert.equal(attributes.set, false); assert.equal(attributes.setError, 145)
    assert.equal((await fs.lstat(f.directory)).isSymbolicLink(), false)
    assert.deepEqual(await fs.readdir(f.outside), ['sentinel.txt'])
  } finally {await handle.close(); await f.close()}
})

await test('Windows NOFOLLOW is zero: EXLOCK can acquire the junction target, so pre-open path checks are insufficient', async () => {
  const f = await fixture()
  try {
    assert.equal(constants.O_NOFOLLOW ?? 0, 0)
    const attributes = await f.attack(FILE_WRITE_ATTRIBUTES)
    assert.equal(attributes.set, true)
    const handle = await fs.open(f.directory, constants.O_RDWR | EXLOCK | (constants.O_NOFOLLOW ?? 0))
    try {
      const opened = await handle.stat({bigint: true}), link = await fs.lstat(f.directory, {bigint: true}), target = await fs.lstat(f.outside, {bigint: true})
      assert.equal(opened.ino, target.ino); assert.notEqual(opened.ino, link.ino)
      assert.ok(link.isSymbolicLink())
    } finally {await handle.close()}
    assert.deepEqual(await fs.readdir(f.outside), ['sentinel.txt'])
  } finally {await f.close()}
})
