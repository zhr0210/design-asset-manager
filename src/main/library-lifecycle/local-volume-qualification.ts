import { execFile } from 'node:child_process'
import { statfs, realpath } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { qualifyMacLocalVolume, type MacLocalVolumeQualification } from './mac-volume-qualification'

const execFileAsync = promisify(execFile)

export function isQualifiedWindowsVolumeEvidence(evidence: {type?: unknown; format?: unknown; writable?: unknown}): boolean {
  return evidence.type === 3 && evidence.format === 'NTFS' && evidence.writable === true
}

// Query the volume containing the directory, including volumes mounted below a drive root.
// The directory is passed as data in the child environment; it never becomes PowerShell source.
const windowsVolumeCommand = String.raw`
Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class DamVolume {
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool GetVolumePathNameW(string path, StringBuilder root, uint length);
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool GetVolumeInformationW(string root, StringBuilder name, uint nameLength, out uint serial, out uint componentLength, out uint flags, StringBuilder format, uint formatLength);
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
  public static extern uint GetDriveTypeW(string root);
}
'@
$root = [Text.StringBuilder]::new(32768)
if (-not [DamVolume]::GetVolumePathNameW($env:DAM_VOLUME_DIRECTORY, $root, $root.Capacity)) { exit 1 }
$name = [Text.StringBuilder]::new(256)
$format = [Text.StringBuilder]::new(256)
[uint32]$serial = 0; [uint32]$components = 0; [uint32]$flags = 0
if (-not [DamVolume]::GetVolumeInformationW($root.ToString(), $name, $name.Capacity, [ref]$serial, [ref]$components, [ref]$flags, $format, $format.Capacity)) { exit 1 }
[pscustomobject]@{type=[DamVolume]::GetDriveTypeW($root.ToString()); format=$format.ToString(); writable=($flags -band 0x80000) -eq 0} | ConvertTo-Json -Compress
`

/** Production qualification stays read-only and admits only a fixed local NTFS volume on Windows. */
export async function qualifyLocalVolume(directory: string, scopeIdentity: string): Promise<MacLocalVolumeQualification> {
  if (process.platform === 'darwin') return qualifyMacLocalVolume(directory, scopeIdentity)
  if (process.platform !== 'win32' || process.arch !== 'x64') return { kind: 'unsupported' }
  try {
    if (!/^[A-Za-z]:\\$/.test(path.parse(path.resolve(directory)).root)) return { kind: 'unsupported' }
    const canonical = await realpath(directory)
    const drive = path.parse(canonical).root
    if (!/^[A-Za-z]:\\$/.test(drive)) return { kind: 'unsupported' }
    const powershell = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe')
    const { stdout } = await execFileAsync(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(windowsVolumeCommand, 'utf16le').toString('base64')], {
      env: {SystemRoot: process.env.SystemRoot ?? 'C:\\Windows', WINDIR: process.env.SystemRoot ?? 'C:\\Windows', DAM_VOLUME_DIRECTORY: canonical}, windowsHide: true, timeout: 10000, maxBuffer: 4096
    })
    const evidence = JSON.parse(stdout.trim())
    if (!isQualifiedWindowsVolumeEvidence(evidence)) return { kind: 'unsupported' }
    const volume = await statfs(canonical)
    const availableBytes = volume.bavail * volume.bsize
    if (!Number.isSafeInteger(availableBytes) || availableBytes < 0 || volume.bsize <= 0) return { kind: 'not-assessed' }
    return { kind: 'qualified', scopeIdentity, qualificationGeneration: 'runtime:win32:ntfs:' + scopeIdentity,
      maxComponentUtf8Bytes: 255, maxCompletePathUtf16Units: 260,
      atomicReplace: 'qualified', durableCommit: 'qualified', mountBoundary: 'qualified', availableBytes }
  } catch { return { kind: 'not-assessed' } }
}
