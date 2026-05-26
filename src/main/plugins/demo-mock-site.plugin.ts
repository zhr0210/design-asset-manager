import { Page } from 'playwright'
import { SitePlugin, AssetSearchResult } from './types'

export class DemoMockSitePlugin implements SitePlugin {
  public id = 'demo-mock'
  public name = 'Demo Mock Site'
  public baseUrl = 'https://app.tapnow.ai'
  public requiresAuth = false

  public buildSearchUrl(keyword: string): string {
    return `${this.baseUrl}/home?q=${encodeURIComponent(keyword)}`
  }

  public async parseSearchResults(page: Page): Promise<AssetSearchResult[]> {
    // Determine target query keyword from the active page URL
    const urlStr = page.url()
    const urlObj = new URL(urlStr)
    const keyword = urlObj.searchParams.get('q') || 'Design'

    // Premium visual assets collection
    const visualTemplates = [
      {
        titleSuffix: 'Minimalist Editorial Layout',
        thumb: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=600&q=80',
        w: 1600,
        h: 2400,
        type: 'JPG'
      },
      {
        titleSuffix: 'Holographic Neon 3D Geometry',
        thumb: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
        w: 2400,
        h: 1800,
        type: 'PNG'
      },
      {
        titleSuffix: 'Brutalist Website Interface Wireframe',
        thumb: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80',
        w: 1400,
        h: 1950,
        type: 'PNG'
      },
      {
        titleSuffix: 'Modern Interior Visual Concept',
        thumb: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80',
        w: 1920,
        h: 1280,
        type: 'JPG'
      },
      {
        titleSuffix: 'Cyberpunk Retro Futurism Glow',
        thumb: 'https://images.unsplash.com/photo-1515260268569-9271009adfdb?auto=format&fit=crop&w=600&q=80',
        w: 1920,
        h: 1080,
        type: 'JPG'
      },
      {
        titleSuffix: 'Abstract Fluid Acrylic Canvas',
        thumb: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=600&q=80',
        w: 1200,
        h: 1800,
        type: 'JPG'
      }
    ]

    // Simulate minor delay to look like active parsing
    await new Promise((resolve) => setTimeout(resolve, 300))

    return visualTemplates.map((tpl, idx) => ({
      id: `mock-res-${idx}-${Math.random().toString(36).substr(2, 5)}`,
      title: `${keyword} - ${tpl.titleSuffix}`,
      thumbnailUrl: tpl.thumb,
      imageUrl: tpl.thumb.replace('&w=600', '&w=1600'), // high resolution swap
      sourcePageUrl: `https://unsplash.com/photos/creative-mock-${idx}`,
      sourceSite: 'TapNow',
      width: tpl.w,
      height: tpl.h,
      fileType: tpl.type
    }))
  }
}
