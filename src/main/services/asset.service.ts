import { getDatabase } from '../db'
import fs from 'fs'
import path from 'path'

import { TagSearchService } from './tag-search.service'
import { ColorPaletteService } from './color-palette.service'
import { ImageNormalizeService } from './image-normalize.service'
import { ImageMetadataService } from './image-metadata.service'

export function tryGetImageDimensions(filePath: string): { width: number; height: number } | null {
  try {
    const resolvedPath = filePath.startsWith('~') 
      ? filePath.replace('~', process.env.USERPROFILE || process.env.HOME || '')
      : filePath
      
    if (!fs.existsSync(resolvedPath)) return null
    const buffer = fs.readFileSync(resolvedPath)
    
    // 1. Check PNG header
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      const width = buffer.readUInt32BE(16)
      const height = buffer.readUInt32BE(20)
      return { width, height }
    }
    
    // 2. Check JPEG header and find SOF0/SOF2 marker
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2
      while (offset + 9 < buffer.length) {
        const marker = buffer.readUInt16BE(offset)
        if (marker === 0xffd9) break // End of image
        if (marker === 0xffda) break // Start of scan
        
        const length = buffer.readUInt16BE(offset + 2)
        if ((marker >= 0xffc0 && marker <= 0xffc3) || (marker >= 0xffc5 && marker <= 0xffc7) || (marker >= 0xffc9 && marker <= 0xffcb) || (marker >= 0xffcd && marker <= 0xffcf)) {
          const height = buffer.readUInt16BE(offset + 5)
          const width = buffer.readUInt16BE(offset + 7)
          return { width, height }
        }
        offset += 2 + length
      }
    }
  } catch (e) {
    // Ignore dimension parsing failures
  }
  return null
}

export interface DbAsset {
  id: string
  title: string
  file_name: string
  file_path: string
  thumbnail_path: string
  source_site_id: string
  source_site_name: string
  source_page_url?: string
  original_url?: string
  width?: number
  height?: number
  file_size?: number
  file_type?: string
  dominant_color?: string
  ai_tag_status?: string
  ai_tagged_at?: string
  ai_prompt_status?: string
  ai_prompt?: string
  ai_caption?: string
  ai_analysis_status?: string
  ai_analysis_json?: string
  last_tag_updated_at?: string
  color_palette_json?: string
  original_path?: string
  normalized_path?: string
  original_format?: string
  normalized_format?: string
  has_alpha?: number
  color_space?: string
  normalize_status?: string
  normalized_at?: string
  image_metadata_json?: string
  created_at: string
  updated_at: string
  tags?: string[]
}

export interface DbTag {
  id: string
  name: string
  normalized_name?: string
  slug?: string
  type?: string
  color: string
  description?: string
  shorthand?: string
  aliases?: string
  parent_id?: string
  is_category?: number
  is_system?: number
  usage_count?: number
  created_at: string
  updated_at?: string
}

export class AssetService {
  private getDb() {
    return getDatabase()
  }

  public listAssets(filters?: { keyword?: string; siteId?: string; tagName?: string; includePending?: boolean }): DbAsset[] {
    const db = this.getDb()
    const searchService = new TagSearchService()

    // 1. Delegate tag syntax query to TagSearchService
    if (filters?.keyword && (filters.keyword.includes(':') || filters.keyword.startsWith('special:'))) {
      const queries = filters.keyword.split(/\s+/).filter(Boolean)
      let results = searchService.searchAssetsByTags(queries, filters.includePending)

      if (filters.siteId) {
        results = results.filter((a) => a.source_site_id === filters.siteId)
      }
      return results
    }

    // 2. Standard search query execution
    let query = 'SELECT a.* FROM assets a'
    const params: any[] = []
    const clauses: string[] = []
    const statusClause = filters?.includePending ? "(at.status = 'confirmed' OR at.status = 'pending')" : "at.status = 'confirmed'"

    if (filters?.tagName) {
      query += `
        JOIN asset_tags at ON a.id = at.asset_id
        JOIN tags t ON at.tag_id = t.id
      `
      clauses.push(`t.name = ? AND ${statusClause}`)
      params.push(filters.tagName)
    }

    if (filters?.keyword) {
      clauses.push('(a.title LIKE ? OR a.source_site_name LIKE ?)')
      params.push(`%${filters.keyword}%`, `%${filters.keyword}%`)
    }

    if (filters?.siteId) {
      clauses.push('a.source_site_id = ?')
      params.push(filters.siteId)
    }

    if (clauses.length > 0) {
      query += ' WHERE ' + clauses.join(' AND ')
    }

    query += ' ORDER BY a.created_at DESC'

    const assets = db.prepare(query).all(...params) as DbAsset[]

    // Populate tags for each asset
    return searchService.populateTagsForAssets(assets, filters?.includePending)
  }

  public async saveAsset(asset: Omit<DbAsset, 'created_at' | 'updated_at' | 'tags'>, tagsList: string[] = []): Promise<DbAsset> {
    const db = this.getDb()
    const now = new Date().toISOString()

    const existing = db.prepare('SELECT * FROM assets WHERE id = ?').get(asset.id) as DbAsset | undefined

    let finalAsset = { ...asset }
    let originalPath = asset.original_path || asset.file_path
    let normalizedPath = asset.normalized_path || asset.file_path
    let thumbnailPath = asset.thumbnail_path
    let originalFormat = asset.original_format || asset.file_type || 'jpeg'
    let normalizedFormat = asset.normalized_format || 'jpeg'
    let hasAlpha = asset.has_alpha || 0
    let colorSpace = asset.color_space || 'srgb'
    let normalizeStatus = asset.normalize_status || 'not_started'
    let normalizedAt = asset.normalized_at || ''
    let imageMetadataJson = asset.image_metadata_json || ''

    // 1. Run image normalization (EXIF correction, sRGB conversion, multi-path structuring)
    const resolvedOriginal = ImageMetadataService.resolvePath(originalPath)
    if (fs.existsSync(resolvedOriginal)) {
      try {
        const normRes = await ImageNormalizeService.normalize(originalPath, asset.id)
        originalPath = normRes.originalPath
        normalizedPath = normRes.normalizedPath
        thumbnailPath = normRes.thumbnailPath
        originalFormat = normRes.originalFormat
        normalizedFormat = normRes.normalizedFormat
        hasAlpha = normRes.hasAlpha ? 1 : 0
        colorSpace = normRes.colorSpace
        normalizeStatus = normRes.normalizeStatus
        normalizedAt = normRes.processedAt
        imageMetadataJson = JSON.stringify(normRes)

        // Standardize primary file_path to the clean normalized version!
        // This ensures all downstream AI / OCR / Palette processes naturally consume sRGB safe buffer.
        finalAsset.file_path = normalizedPath
        finalAsset.thumbnail_path = thumbnailPath
        finalAsset.width = normRes.normalizedWidth
        finalAsset.height = normRes.normalizedHeight
      } catch (normErr) {
        console.error('[AssetService] Image normalization during save failed:', normErr)
      }
    }

    // Try to parse real image dimensions from the physical file on disk if not set
    const dims = tryGetImageDimensions(finalAsset.file_path)
    const finalWidth = dims ? dims.width : (finalAsset.width || null)
    const finalHeight = dims ? dims.height : (finalAsset.height || null)

    db.transaction(() => {
      if (existing) {
        db.prepare(`
          UPDATE assets
          SET title = ?, file_name = ?, file_path = ?, thumbnail_path = ?, source_site_id = ?, source_site_name = ?,
              source_page_url = ?, original_url = ?, width = ?, height = ?, file_size = ?, file_type = ?, dominant_color = ?,
              original_path = ?, normalized_path = ?, original_format = ?, normalized_format = ?, has_alpha = ?, color_space = ?,
              normalize_status = ?, normalized_at = ?, image_metadata_json = ?, updated_at = ?
          WHERE id = ?
        `).run(
          finalAsset.title,
          finalAsset.file_name,
          finalAsset.file_path,
          finalAsset.thumbnail_path,
          finalAsset.source_site_id,
          finalAsset.source_site_name,
          finalAsset.source_page_url || null,
          finalAsset.original_url || null,
          finalWidth,
          finalHeight,
          finalAsset.file_size || null,
          finalAsset.file_type || null,
          finalAsset.dominant_color || null,
          originalPath,
          normalizedPath,
          originalFormat,
          normalizedFormat,
          hasAlpha,
          colorSpace,
          normalizeStatus,
          normalizedAt,
          imageMetadataJson || null,
          now,
          finalAsset.id
        )
      } else {
        db.prepare(`
          INSERT INTO assets (
            id, title, file_name, file_path, thumbnail_path, source_site_id, source_site_name, source_page_url, original_url,
            width, height, file_size, file_type, dominant_color, ai_tag_status, ai_prompt_status, ai_analysis_status,
            original_path, normalized_path, original_format, normalized_format, has_alpha, color_space, normalize_status, normalized_at, image_metadata_json,
            created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, 'not_started', 'not_started', 'not_started',
            ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?
          )
        `).run(
          finalAsset.id,
          finalAsset.title,
          finalAsset.file_name,
          finalAsset.file_path,
          finalAsset.thumbnail_path,
          finalAsset.source_site_id,
          finalAsset.source_site_name,
          finalAsset.source_page_url || null,
          finalAsset.original_url || null,
          finalWidth,
          finalHeight,
          finalAsset.file_size || null,
          finalAsset.file_type || null,
          finalAsset.dominant_color || null,
          originalPath,
          normalizedPath,
          originalFormat,
          normalizedFormat,
          hasAlpha,
          colorSpace,
          normalizeStatus,
          normalizedAt,
          imageMetadataJson || null,
          now,
          now
        )
      }

      // Re-map ONLY manual tags to preserve AI predictions and suggestions!
      db.prepare("DELETE FROM asset_tags WHERE asset_id = ? AND source = 'manual'").run(finalAsset.id)

      for (const tagName of tagsList) {
        if (!tagName.trim()) continue

        // Check if tag already exists in tags
        let tagRecord = db.prepare('SELECT * FROM tags WHERE name = ?').get(tagName) as DbTag | undefined

        if (!tagRecord) {
          const tagId = `tag-custom-${Math.random().toString(36).substr(2, 9)}`
          const tagColors = [
            'bg-rose-50 text-rose-700 border border-rose-200',
            'bg-slate-100 text-slate-700 border border-slate-200',
            'bg-indigo-50 text-indigo-700 border border-indigo-200',
            'bg-amber-50 text-amber-700 border border-amber-200'
          ]
          const chosenColor = tagColors[Math.floor(Math.random() * tagColors.length)]
          const normalized = tagName.toLowerCase().trim()

          db.prepare(`
            INSERT INTO tags (id, name, normalized_name, slug, type, color, description, aliases, is_system, usage_count, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'custom', ?, '', ?, 0, 0, ?, ?)
          `).run(
            tagId,
            tagName,
            normalized,
            normalized,
            chosenColor,
            JSON.stringify([]),
            now,
            now
          )
          tagRecord = { id: tagId, name: tagName, color: chosenColor, created_at: now }
        }

        // Insert association with all required columns
        const assetTagId = `${finalAsset.id}_${tagRecord.id}_manual`
        db.prepare(`
          INSERT OR IGNORE INTO asset_tags (id, asset_id, tag_id, source, confidence, status, created_by, created_at, updated_at)
          VALUES (?, ?, ?, 'manual', 1.0, 'confirmed', 'user', ?, ?)
        `).run(assetTagId, finalAsset.id, tagRecord.id, now, now)

        // Increment usage count of the tag
        db.prepare('UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?').run(tagRecord.id)
      }
    })()

    // Automatically trigger background color palette extraction if the asset lacks a valid color palette
    const hasPalette = existing && existing.color_palette_json && 
                       existing.color_palette_json !== '' && 
                       !existing.color_palette_json.includes('NAN') &&
                       !existing.color_palette_json.includes('null')

    if (!hasPalette) {
      const paletteService = new ColorPaletteService()
      paletteService.extractAndSavePalette(finalAsset.id, finalAsset.file_path).catch((err) => {
        console.error('[AssetService] Background color palette extraction failed:', err)
      })
    }

    return {
      ...finalAsset,
      tags: tagsList,
      created_at: existing ? existing.created_at : now,
      updated_at: now
    }
  }

  public deleteAsset(id: string): void {
    const db = this.getDb()
    db.transaction(() => {
      db.prepare('DELETE FROM asset_tags WHERE asset_id = ?').run(id)
      db.prepare('DELETE FROM assets WHERE id = ?').run(id)
    })()
  }

  public listTags(): DbTag[] {
    const db = this.getDb()
    return db.prepare('SELECT * FROM tags ORDER BY name ASC').all() as DbTag[]
  }
}
