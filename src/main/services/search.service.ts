import { chromium } from 'playwright'
import { SiteService } from './site.service'
import { AuthStateService } from './auth-state.service'
import { DemoMockSitePlugin } from '../plugins/demo-mock-site.plugin'
import { GenericImagePagePlugin } from '../plugins/generic-image-page.plugin'
import { SitePlugin, AssetSearchResult } from '../plugins/types'

export class SearchService {
  private siteService = new SiteService()
  private authStateService = new AuthStateService()

  public async runSearch(siteId: string, keyword: string): Promise<AssetSearchResult[]> {
    console.log(`[SearchService] Executing search crawler for site: ${siteId}, keyword: ${keyword}`)

    // 1. Resolve site configurations from SQLite database
    const dbSites = this.siteService.listSites()
    const site = dbSites.find((s) => s.id === siteId)

    if (!site) {
      throw new Error(`无法找到注册网站配置: ${siteId}`)
    }

    // 2. Select matching crawler plugin
    let plugin: SitePlugin
    if (siteId === 'tapnow') {
      plugin = new DemoMockSitePlugin()
    } else {
      plugin = new GenericImagePagePlugin({
        baseUrl: site.base_url,
        requiresAuth: site.requires_auth === 1,
        searchUrlTemplate: site.search_url_template
      })
    }

    // 3. Check for secure storageState cookie paths
    let storageState: any = null
    if (site.requires_auth === 1 && site.auth_status === 'logged') {
      console.log(`[SearchService] Active authorization found. Loading storageState for: ${siteId}`)
      storageState = this.authStateService.loadAuthState(siteId)
    }

    // 4. Launch headless Playwright context in background
    console.log(`[SearchService] Starting headless Chrome scraper process...`)
    const browser = await chromium.launch({
      headless: true,
      channel: 'chrome', // Crucial: Launches local system's official Chrome browser for security bypasses
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox'
      ]
    })

    try {
      const contextOptions: any = {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }

      // Inject secure cookies state directly into background无头浏览器!
      if (storageState) {
        contextOptions.storageState = storageState
      }

      const context = await browser.newContext(contextOptions)
      const page = await context.newPage()

      // Compile search url query string
      const searchUrl = plugin.buildSearchUrl(keyword)
      console.log(`[SearchService] Directing browser to: ${searchUrl}`)
      
      await page.goto(searchUrl, {
        waitUntil: 'load', // Wait until initial elements are ready
        timeout: 30000
      })

      // Wait for page resources to settle
      console.log(`[SearchService] Waiting for ajax dynamic content load...`)
      try {
        await page.waitForLoadState('networkidle', { timeout: 6000 })
      } catch (e) {
        console.log(`[SearchService] Network idle wait timed out or finished, continuing...`)
      }

      // Smooth scroll simulation to trigger lazy loading images
      console.log(`[SearchService] Performing scroll to trigger image lazy loads...`)
      try {
        // Scroll down twice to ensure dynamic pinterest grid triggers loading
        await page.evaluate(() => window.scrollBy(0, 1200))
        await page.waitForTimeout(1500)
        await page.evaluate(() => window.scrollBy(0, 1200))
        await page.waitForTimeout(1500)
      } catch (e) {
        // Safe ignore
      }

      // 5. Parse search results using modular site plugin
      const results = await plugin.parseSearchResults(page)
      
      // Clean up browser context
      await context.close()
      await browser.close()

      return results
    } catch (err) {
      console.error(`[SearchService] Scraper error for ${siteId}:`, err)
      try {
        await browser.close()
      } catch (e) {}
      throw err
    }
  }
}
