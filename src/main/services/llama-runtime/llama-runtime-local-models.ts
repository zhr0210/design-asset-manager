import fs from 'fs'

export function isCompleteDownloadedArtifact(filePath: string): boolean {
  return getDownloadedArtifactState(filePath) === 'downloaded'
}

export function getDownloadedArtifactState(filePath: string): 'missing' | 'downloading' | 'downloaded' {
  if (!filePath || !fs.existsSync(filePath)) {
    return 'missing'
  }

  if (fs.existsSync(`${filePath}.aria2`)) {
    return 'downloading'
  }

  try {
    return fs.statSync(filePath).size > 0 ? 'downloaded' : 'missing'
  } catch {
    return 'missing'
  }
}
