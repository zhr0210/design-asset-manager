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

export interface BrowserExtractorPlugin {
  id: string
  name: string
  matchDomains: string[]

  match(url: string): boolean

  extractAssets(context: ExtractContext): Promise<ExtractedAsset[]>
}

export interface ExtractContext {
  currentUrl: string
  pageTitle: string
  executeJavaScript<T>(code: string): Promise<T>
}

export interface ExtractedAsset {
  id: string
  title?: string
  thumbnailUrl: string
  previewUrl?: string
  downloadUrl?: string
  sourcePageUrl: string
  sourceSite: string
  width?: number
  height?: number
  fileType?: string
}
