import { Page } from 'playwright'
import { SitePlugin, AssetSearchResult } from './types'

export class GenericImagePagePlugin implements SitePlugin {
  public id = 'generic-image'
  public name = 'Generic Image Crawler'
  public baseUrl: string
  public requiresAuth: boolean
  private searchUrlTemplate: string

  constructor(site: { baseUrl: string; requiresAuth: boolean; searchUrlTemplate: string }) {
    this.baseUrl = site.baseUrl
    this.requiresAuth = site.requiresAuth
    this.searchUrlTemplate = site.searchUrlTemplate
  }

  public buildSearchUrl(keyword: string): string {
    return this.searchUrlTemplate.replace('{{keyword}}', encodeURIComponent(keyword))
  }

  public async parseSearchResults(page: Page): Promise<AssetSearchResult[]> {
    console.log(`[GenericImagePlugin] Initiating DOM extraction on page: ${page.url()}`)

    // Extract image elements inside the DOM
    const rawImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'))
      return imgs.map((img) => {
        // Support standard src and common lazy-load data attributes (data-src, data-lazy, srcset)
        const src =
          img.getAttribute('src') ||
          img.getAttribute('data-src') ||
          img.getAttribute('data-lazy-src') ||
          img.getAttribute('data-original') ||
          img.src ||
          ''

        const alt = img.getAttribute('alt') || img.getAttribute('title') || img.title || ''
        const width = img.naturalWidth || img.width || 0
        const height = img.naturalHeight || img.height || 0

        return { src, alt, width, height }
      })
    })

    const pageUrl = page.url()
    const urlObj = new URL(pageUrl)
    const siteDomain = urlObj.hostname.replace('www.', '')

    const results: AssetSearchResult[] = []

    for (const img of rawImages) {
      if (!img.src || img.src.startsWith('data:image')) {
        continue // Skip empty or base64 embedded canvas images
      }

      // Filter out tiny visual assets (icons, decorative spacers, tracking pixels) less than 100x100
      if (img.width > 0 && img.height > 0 && (img.width < 100 || img.height < 100)) {
        continue
      }

      // Resolve relative paths into absolute URLs
      let absoluteUrl = img.src
      try {
        if (!img.src.startsWith('http://') && !img.src.startsWith('https://')) {
          absoluteUrl = new URL(img.src, pageUrl).toString()
        }
      } catch (err) {
        console.warn(`[GenericImagePlugin] Failed to resolve absolute URL for src "${img.src}":`, err)
        continue
      }

      // Extract file type extension from URL
      let fileType = 'JPG'
      const lowercaseUrl = absoluteUrl.toLowerCase()
      if (lowercaseUrl.includes('.png')) {
        fileType = 'PNG'
      } else if (lowercaseUrl.includes('.webp')) {
        fileType = 'WEBP'
      } else if (lowercaseUrl.includes('.gif')) {
        fileType = 'GIF'
      } else if (lowercaseUrl.includes('.svg')) {
        fileType = 'SVG'
      }

      results.push({
        id: `gen-res-${Math.random().toString(36).substr(2, 9)}`,
        title: img.alt.trim() || `${siteDomain.split('.')[0].toUpperCase()} Graphic Asset`,
        thumbnailUrl: absoluteUrl,
        imageUrl: absoluteUrl,
        sourcePageUrl: pageUrl,
        sourceSite: siteDomain.charAt(0).toUpperCase() + siteDomain.slice(1),
        width: img.width || 800, // fallbacks
        height: img.height || 600,
        fileType
      })
    }

    console.log(`[GenericImagePlugin] Successfully parsed and filtered ${results.length} assets from DOM.`)
    return results
  }
}
