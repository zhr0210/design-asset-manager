import React from 'react'
import { Tag as TagIcon, Plus } from 'lucide-react'
import { useAssetStore } from '../../stores/asset.store'
import TagChip from '../tag/TagChip'
import TagInput from '../tag/TagInput'
import {
  CUSTOM_ASSET_TAG_COLOR_CLASS,
  projectAssetTaggingConfirmedTags
} from '../../../shared/workflows/asset-tagging.workflow'

interface AssetTagPanelProps {
  assetId: string
}

export default function AssetTagPanel({ assetId }: AssetTagPanelProps) {
  const assetRelations = useAssetStore((s) => s.assetRelations)
  const { addTagToAsset, removeTagFromAsset, createTag, addActiveTagSearchQuery } = useAssetStore()

  const relations = assetRelations[assetId] || []
  const confirmedTagProjection = React.useMemo(
    () => projectAssetTaggingConfirmedTags(relations),
    [relations]
  )

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
        color: CUSTOM_ASSET_TAG_COLOR_CLASS
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

  return (
    <div className="space-y-3.5 font-sans">
      <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 shrink-0">
        <TagIcon className="w-3.5 h-3.5 text-slate-400" />
        <span>素材标签管理</span>
      </span>

      {/* Tags grid chips list */}
      <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto px-0.5 py-0.5">
        {confirmedTagProjection.items.map((tag) => (
          <TagChip
            key={tag.relationId}
            name={tag.tagName}
            type={tag.tagType}
            colorClass={tag.tagColor}
            source={tag.source}
            confidence={tag.confidence}
            status={tag.status}
            modelName={tag.modelName}
            onRemove={() => handleRemoveTag(tag.tagId)}
            onClick={() => addActiveTagSearchQuery(tag.searchQuery)}
          />
        ))}

        {confirmedTagProjection.items.length === 0 && (
          <span className="text-[11px] text-slate-400 font-medium italic block py-0.5">
            {confirmedTagProjection.emptyLabel}
          </span>
        )}
      </div>

      {/* Autocomplete dynamic Input */}
      <div className="pt-1.5">
        <TagInput
          onSelectTag={handleSelectExistingTag}
          onAddCustomTag={handleCreateAndAddTag}
          excludeTagNames={confirmedTagProjection.activeTagNames}
          placeholder="搜索或输入后按回车快速添加标签..."
        />
      </div>
    </div>
  )
}
