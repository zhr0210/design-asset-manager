import { Page } from 'playwright'

export interface AssetSearchResult {
  id: string
  title?: string
  thumbnailUrl: string
  imageUrl?: string
  sourcePageUrl: string
  sourceSite: string
  width?: number
  height?: number
  fileType?: string
}

export interface SitePlugin {
  id: string
  name: string
  baseUrl: string
  requiresAuth: boolean

  buildSearchUrl(keyword: string, page?: number): string

  parseSearchResults(page: Page): Promise<AssetSearchResult[]>

  getDownloadUrl?(page: Page, item: AssetSearchResult): Promise<string>
}
