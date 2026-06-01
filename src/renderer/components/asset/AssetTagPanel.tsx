import React from 'react'
import { Tag as TagIcon, Plus } from 'lucide-react'
import { useAssetStore } from '../../stores/asset.store'
import TagChip from '../tag/TagChip'
import TagInput from '../tag/TagInput'

interface AssetTagPanelProps {
  assetId: string
}

export default function AssetTagPanel({ assetId }: AssetTagPanelProps) {
  const assetRelations = useAssetStore((s) => s.assetRelations)
  const { addTagToAsset, removeTagFromAsset, createTag, addActiveTagSearchQuery } = useAssetStore()

  const relations = assetRelations[assetId] || []
  
  // Deduplicate relations by tag_id so we never show duplicate chips
  const uniqueRelations = React.useMemo(() => {
    const seen = new Set<string>()
    return relations.filter((r) => {
      if (seen.has(r.tag_id)) return false
      seen.add(r.tag_id)
      return true
    })
  }, [relations])

  // Confirmed tags display
  const confirmedRelations = uniqueRelations.filter((r) => r.status === 'confirmed')

  const handleSelectExistingTag = async (tagId: string) => {
    try {
      await addTagToAsset(assetId, tagId, {
        source: 'manual',
        status: 'confirmed'
      })
    } catch (e) {
      console.error(e)
    }
  }

  const handleCreateAndAddTag = async (tagName: string) => {
    try {
      // Create new tag on-the-fly inside custom type category
      const newTag = await createTag({
        name: tagName,
        type: 'custom',
        color: 'bg-pink-50 text-pink-700 border border-pink-200'
      })
      
      if (newTag) {
        await addTagToAsset(assetId, newTag.id, {
          source: 'manual',
          status: 'confirmed'
        })
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeTagFromAsset(assetId, tagId)
    } catch (e) {
      console.error(e)
    }
  }

  // Active manual/confirmed tag names to exclude from input autocomplete suggestions list
  const activeTagNames = confirmedRelations.map((r) => r.tag_name)

  return (
    <div className="space-y-3.5 font-sans">
      <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 shrink-0">
        <TagIcon className="w-3.5 h-3.5 text-slate-400" />
        <span>素材标签管理</span>
      </span>

      {/* Tags grid chips list */}
      <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto px-0.5 py-0.5">
        {confirmedRelations.map((rel) => (
          <TagChip
            key={rel.id}
            name={rel.tag_name}
            type={rel.tag_type}
            colorClass={rel.tag_color}
            source={rel.source}
            confidence={rel.confidence}
            status={rel.status}
            modelName={rel.model_name || undefined}
            onRemove={() => handleRemoveTag(rel.tag_id)}
            onClick={() => addActiveTagSearchQuery(`tag:${rel.tag_name}`)}
          />
        ))}

        {confirmedRelations.length === 0 && (
          <span className="text-[11px] text-slate-400 font-medium italic block py-0.5">
            暂无已确认标签，请在下方添加或开启 AI 特征反推。
          </span>
        )}
      </div>

      {/* Autocomplete dynamic Input */}
      <div className="pt-1.5">
        <TagInput
          onSelectTag={handleSelectExistingTag}
          onAddCustomTag={handleCreateAndAddTag}
          excludeTagNames={activeTagNames}
          placeholder="搜索或输入后按回车快速添加标签..."
        />
      </div>
    </div>
  )
}
