import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {
  detectPlatform,
  getPlatformProfile,
  normalizePlatformArch,
  normalizePlatformName
} from '../src/main/platform/platform-detector'

assert.equal(normalizePlatformName('win32'), 'win32')
assert.equal(normalizePlatformName('sunos'), 'unknown')
assert.equal(normalizePlatformArch('arm64'), 'arm64')
assert.equal(normalizePlatformArch('ia32'), 'unknown')

assert.equal(getPlatformProfile('win32', 'x64'), 'windows-x64')
assert.equal(getPlatformProfile('win32', 'arm64'), 'windows-arm64')
assert.equal(getPlatformProfile('darwin', 'arm64'), 'macos-apple-silicon')
assert.equal(getPlatformProfile('darwin', 'x64'), 'macos-intel')
assert.equal(getPlatformProfile('linux', 'x64'), 'linux-x64')
assert.equal(getPlatformProfile('linux', 'arm64'), 'unknown')

const mac = detectPlatform('darwin', 'arm64')
assert.equal(mac.isMacOS, true)
assert.equal(mac.isAppleSilicon, true)
assert.equal(mac.profile, 'macos-apple-silicon')

const windows = detectPlatform('win32', 'x64')
assert.equal(windows.isWindows, true)
assert.equal(windows.profile, 'windows-x64')

const source = await fs.readFile('src/main/platform/platform-detector.ts', 'utf8')
assert.match(source, /const PLATFORM_PROFILE_RULES: PlatformProfileRule\[\]/)
assert.match(source, /platform: 'win32'[\s\S]*arch: 'x64'[\s\S]*profile: 'windows-x64'/)
assert.match(source, /platform: 'win32'[\s\S]*arch: 'arm64'[\s\S]*profile: 'windows-arm64'/)
assert.match(source, /platform: 'darwin'[\s\S]*arch: 'arm64'[\s\S]*profile: 'macos-apple-silicon'/)
assert.match(source, /platform: 'darwin'[\s\S]*arch: 'x64'[\s\S]*profile: 'macos-intel'/)
assert.match(source, /platform: 'linux'[\s\S]*arch: 'x64'[\s\S]*profile: 'linux-x64'/)
assert.match(source, /PLATFORM_PROFILE_RULES\.find/)
assert.doesNotMatch(source, /if \(platform === 'win32' && arch === 'x64'\)/)
assert.doesNotMatch(source, /if \(platform === 'darwin' && arch === 'arm64'\)/)
