import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const testParent = path.join(process.cwd(), 'dist-temp', 'tests')
await fs.mkdir(testParent, { recursive: true })
const testRoot = await fs.mkdtemp(
  path.join(testParent, 'image-normalize-source-retention-')
)
const previousHome = process.env.HOME
const previousUserProfile = process.env.USERPROFILE

try {
  process.env.HOME = testRoot
  process.env.USERPROFILE = testRoot
  assert.equal(os.homedir(), testRoot)

  const libraryDir = path.join(testRoot, 'DesignAssetManager', 'library')
  const sourcePath = path.join(libraryDir, 'source-retention.svg')
  const managedOriginalPath = path.join(
    libraryDir,
    'original',
    'source-retention.svg'
  )
  const sourceBytes = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="#fff"/></svg>'
  )

  await fs.mkdir(libraryDir, { recursive: true })
  await fs.writeFile(sourcePath, sourceBytes)

  const { ImageNormalizeService } = await import(
    '../src/main/services/image-normalize.service'
  )
  const result = await ImageNormalizeService.normalize(
    sourcePath,
    'source-retention-test'
  )

  assert.equal(result.normalizeStatus, 'completed')
  assert.deepEqual(await fs.readFile(sourcePath), sourceBytes)
  assert.deepEqual(await fs.readFile(managedOriginalPath), sourceBytes)
  assert.ok(
    (
      await fs.stat(
        path.join(
          libraryDir,
          'normalized',
          'source-retention.jpg'
        )
      )
    ).isFile()
  )
  assert.ok(
    (
      await fs.stat(
        path.join(
          libraryDir,
          'thumbnails',
          'source-retention.webp'
        )
      )
    ).isFile()
  )

  const normalizeSource = await fs.readFile(
    'src/main/services/image-normalize.service.ts',
    'utf8'
  )
  assert.doesNotMatch(
    normalizeSource,
    /fs\.(?:unlinkSync|rmSync|renameSync)\(\s*resolvedOriginal\b/
  )
} finally {
  if (previousHome === undefined) {
    delete process.env.HOME
  } else {
    process.env.HOME = previousHome
  }

  if (previousUserProfile === undefined) {
    delete process.env.USERPROFILE
  } else {
    process.env.USERPROFILE = previousUserProfile
  }

  await fs.rm(testRoot, { recursive: true, force: true })
}
