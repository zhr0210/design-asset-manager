import { getDatabase } from '../../../db'
import { TagService } from '../../tag.service'
import { AssetTagService } from '../../asset-tag.service'

export interface DbTagSuggestion {
  id: string
  asset_id: string
  tag_name: string
  tag_type: string
  source: string
  confidence: number
  status: string
  model_name: string
  raw_payload?: string
  created_at: string
  updated_at: string
}

export class MockAiTagService {
  private getDb() {
    return getDatabase()
  }

  private getTagService() {
    return new TagService()
  }

  private getAssetTagService() {
    return new AssetTagService()
  }

  // Generates and inserts mock tag suggestions to SQLite
  public generateSuggestionsForAsset(assetId: string): DbTagSuggestion[] {
    const db = this.getDb()
    const now = new Date().toISOString()

    // Clean up existing suggestions first for a fresh demo
    db.prepare('DELETE FROM tag_suggestions WHERE asset_id = ?').run(assetId)
    // Delete existing pending/rejected AI tags for this asset
    db.prepare("DELETE FROM asset_tags WHERE asset_id = ? AND source LIKE 'ai_%'").run(assetId)

    // Select random mock suggestions
    const rawSuggestions = [
      { name: '极简', type: 'style', source: 'ai_wd_tagger', confidence: 0.88, model: 'WD-Tagger-v3' },
      { name: '科技感', type: 'style', source: 'ai_wd_tagger', confidence: 0.74, model: 'WD-Tagger-v3' },
      { name: '黑金', type: 'color', source: 'ai_florence', confidence: 0.91, model: 'Florence-2-Large' },
      { name: '蓝紫色', type: 'color', source: 'ai_florence', confidence: 0.82, model: 'Florence-2-Large' },
      { name: '电商banner', type: 'usage', source: 'ai_joycaption', confidence: 0.85, model: 'JoyCaption-v2' },
      { name: 'PPT封面', type: 'usage', source: 'ai_joycaption', confidence: 0.68, model: 'JoyCaption-v2' },
      { name: '左文右图', type: 'layout', source: 'ai_qwen_vl', confidence: 0.79, model: 'Qwen2.5-VL-7B' },
      { name: '大面积留白', type: 'layout', source: 'ai_qwen_vl', confidence: 0.71, model: 'Qwen2.5-VL-7B' },
      { name: '办公场景', type: 'scene', source: 'ai_wd_tagger', confidence: 0.65, model: 'WD-Tagger-v3' }
    ]

    // Shuffle and pick 4-6 suggestions
    const shuffled = rawSuggestions.sort(() => 0.5 - Math.random())
    const count = 4 + Math.floor(Math.random() * 3) // 4 to 6
    const selected = shuffled.slice(0, count)

    const insertSuggestion = db.prepare(`
      INSERT INTO tag_suggestions (id, asset_id, tag_name, tag_type, source, confidence, status, model_name, raw_payload, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
    `)

    const tagService = this.getTagService()
    const assetTagService = this.getAssetTagService()

    const results: DbTagSuggestion[] = []

    db.transaction(() => {
      for (const item of selected) {
        const id = `sug-${Math.random().toString(36).substr(2, 9)}`
        
        insertSuggestion.run(
          id,
          assetId,
          item.name,
          item.type,
          item.source,
          item.confidence,
          item.model,
          JSON.stringify(item),
          now,
          now
        )

        // Ensure the tag itself exists in tags table, so we have a referenceable tagId.
        // We set is_system = 0 or we find the matching system tag if pre-seeded.
        const tagList = tagService.listTags({ searchQuery: item.name, type: item.type })
        let tagId = ''

        if (tagList.length > 0) {
          tagId = tagList[0].id
        } else {
          // Create tag dynamically
          const newTag = tagService.createTag({
            name: item.name,
            type: item.type,
            color: this.getDefaultColorForType(item.type)
          })
          tagId = newTag.id
        }

        // Insert into asset_tags as 'pending' to allow testing direct accept/reject
        assetTagService.addTagToAsset(assetId, tagId, {
          source: item.source,
          confidence: item.confidence,
          status: 'pending',
          modelName: item.model,
          createdBy: 'ai'
        })

        results.push({
          id,
          asset_id: assetId,
          tag_name: item.name,
          tag_type: item.type,
          source: item.source,
          confidence: item.confidence,
          status: 'pending',
          model_name: item.model,
          created_at: now,
          updated_at: now
        })
      }

      // Update assets columns for prompts and captions
      db.prepare(`
        UPDATE assets
        SET ai_tag_status = 'completed',
            ai_tagged_at = ?,
            ai_prompt_status = 'completed',
            ai_prompt = 'A beautiful flat design illustration showing a modern tech environment with minimalist icons and dynamic grids, glowing neon colors, highly detailed, style of premium digital UI art',
            ai_caption = 'A premium modern tech vector graphic featuring high-end digital styling.',
            ai_analysis_status = 'completed',
            ai_analysis_json = ?
        WHERE id = ?
      `).run(
        now,
        JSON.stringify({
          composition: 'Left text layout with wide empty margins on the right',
          colors: ['#0f172a', '#6366f1', '#10b981'],
          elements: ['Icons', 'Grid lines', 'Glowing blobs'],
          style: 'Minimalist Vector Glassmorphism'
        }),
        assetId
      )
    })()

    return results
  }

  public getSuggestionsForAsset(assetId: string): DbTagSuggestion[] {
    const db = this.getDb()
    return db.prepare('SELECT * FROM tag_suggestions WHERE asset_id = ?').all(assetId) as DbTagSuggestion[]
  }

  private getDefaultColorForType(type: string): string {
    const typeColorMap: Record<string, string> = {
      style: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
      color: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      usage: 'bg-blue-50 text-blue-700 border border-blue-200',
      layout: 'bg-amber-50 text-amber-700 border border-amber-200',
      scene: 'bg-rose-50 text-rose-700 border border-rose-200',
      source: 'bg-slate-100 text-slate-700 border border-slate-200',
      ai: 'bg-purple-50 text-purple-700 border border-purple-200',
      custom: 'bg-pink-50 text-pink-700 border border-pink-200'
    }
    return typeColorMap[type] || typeColorMap.custom
  }
}
