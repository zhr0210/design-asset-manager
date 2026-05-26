import { safeStorage } from 'electron'
import { join } from 'path'
import { existsSync, writeFileSync, readFileSync, unlinkSync, mkdirSync } from 'fs'
import { homedir } from 'os'

export class AuthStateService {
  private getAuthStatesDir(): string {
    const dir = join(homedir(), 'DesignAssetManager', 'auth_states')
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    return dir
  }

  private getFilePath(siteId: string): string {
    return join(this.getAuthStatesDir(), `${siteId}_state.json`)
  }

  public saveAuthState(siteId: string, stateObj: any): void {
    const filePath = this.getFilePath(siteId)
    const stateStr = JSON.stringify(stateObj)

    try {
      if (safeStorage.isEncryptionAvailable()) {
        console.log(`[SafeStorage] Encrypting credentials for site: ${siteId}`)
        const encryptedBuffer = safeStorage.encryptString(stateStr)
        writeFileSync(filePath, encryptedBuffer)
        return
      }
    } catch (e) {
      console.warn(`[SafeStorage] safeStorage.encryptString failed, falling back to plaintext:`, e)
    }

    console.warn(`[SafeStorage] Saving raw text for: ${siteId}`)
    writeFileSync(filePath, stateStr, 'utf-8')
  }

  public loadAuthState(siteId: string): any | null {
    const filePath = this.getFilePath(siteId)
    if (!existsSync(filePath)) {
      return null
    }

    try {
      const buffer = readFileSync(filePath)

      try {
        if (safeStorage.isEncryptionAvailable()) {
          console.log(`[SafeStorage] Decrypting credentials for site: ${siteId}`)
          const decryptedStr = safeStorage.decryptString(buffer)
          return JSON.parse(decryptedStr)
        }
      } catch (e) {
        console.warn(`[SafeStorage] safeStorage.decryptString failed, trying raw text parse:`, e)
      }

      const decryptedStr = buffer.toString('utf-8')
      return JSON.parse(decryptedStr)
    } catch (err) {
      console.error(`[SafeStorage] Failed to decrypt auth state for ${siteId}:`, err)
      return null
    }
  }

  public deleteAuthState(siteId: string): void {
    const filePath = this.getFilePath(siteId)
    if (existsSync(filePath)) {
      console.log(`[SafeStorage] Deleting auth state file for: ${siteId}`)
      unlinkSync(filePath)
    }
  }

  public getAuthStatePath(siteId: string): string {
    return this.getFilePath(siteId)
  }
}
