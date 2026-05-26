import { chromium, BrowserContext } from 'playwright'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { AuthStateService } from './auth-state.service'

export class PlaywrightService {
  private static activeContexts = new Map<string, BrowserContext>()
  private authStateService = new AuthStateService()

  private getProfileDir(siteId: string): string {
    const dir = join(homedir(), 'DesignAssetManager', 'profiles', siteId)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    return dir
  }

  public async startLogin(siteId: string, baseUrl: string): Promise<void> {
    const existing = PlaywrightService.activeContexts.get(siteId)
    if (existing) {
      try {
        await existing.close()
      } catch (e) {
        // Safe ignore
      }
      PlaywrightService.activeContexts.delete(siteId)
    }

    const profileDir = this.getProfileDir(siteId)
    console.log(`[Playwright] Launching Chrome in active memory at: ${profileDir}`)

    const context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      channel: 'chrome',
      viewport: null,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--start-maximized'
      ]
    })

    PlaywrightService.activeContexts.set(siteId, context)

    const page = context.pages()[0] || (await context.newPage())
    console.log(`[Playwright] Navigating context to: ${baseUrl}`)
    await page.goto(baseUrl)
  }

  public async completeLogin(siteId: string): Promise<string> {
    const context = PlaywrightService.activeContexts.get(siteId)
    const statePath = this.authStateService.getAuthStatePath(siteId)

    if (!context) {
      console.log(`[Playwright] No active context in memory for ${siteId}, but profile exists. Gracefully returning path.`)
      return statePath
    }

    try {
      console.log(`[Playwright] Fetching storageState for site: ${siteId}`)
      let storageState: any = null

      try {
        storageState = await context.storageState()
      } catch (stateErr) {
        console.warn(
          `[Playwright] Could not fetch storageState (browser might be closed), but Chrome persists cookies automatically on disk in profile folder.`,
          stateErr
        )
      }

      if (storageState) {
        // Encrypt and save storageState as a backup state file
        try {
          this.authStateService.saveAuthState(siteId, storageState)
        } catch (encryptErr) {
          console.warn(`[Playwright] Encryption helper encountered error:`, encryptErr)
        }
      }

      // Clean up browser context safely
      try {
        await context.close()
      } catch (closeErr) {
        // Safe ignore if already closed
      }

      PlaywrightService.activeContexts.delete(siteId)
      return statePath
    } catch (err) {
      console.error(`[Playwright] Graceful capture fallback triggered for ${siteId}:`, err)
      PlaywrightService.activeContexts.delete(siteId)
      return statePath
    }
  }
}
