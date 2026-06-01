import fs from 'fs'
import path from 'path'
import { homedir } from 'os'

export class ImageMetadataService {
  /**
   * Resolves a local path (including home directory abbreviation '~')
   * to a fully qualified absolute file system path.
   */
  public static resolvePath(filePath: string): string {
    if (!filePath) return ''
    if (filePath.startsWith('~')) {
      return filePath.replace('~', homedir())
    }
    return path.resolve(filePath)
  }

  /**
   * Checks if the resolved file path exists on the local file system.
   */
  public static exists(filePath: string): boolean {
    const resolved = this.resolvePath(filePath)
    return fs.existsSync(resolved)
  }
}
