import React from 'react'
import { Compass, Sliders, Sparkles, Tag as TagIcon } from 'lucide-react'
import { projectAssetLibrarySidebar } from '../../../shared/workflows/asset-tagging.workflow'
import type { Asset, Tag } from '../../stores/asset.store'

type LibrarySidebarProps = {
  selectedAsset: Asset | null
  assetsCount: number
  tags: Tag[]
  activeTagSearchQueries: string[]
  clearActiveTagSearchQueries(): void
  addActiveTagSearchQuery(query: string): void
  removeActiveTagSearchQuery(query: string): void
  aiPendingEnabled?: boolean
}

export default function LibrarySidebar({ assetsCount, tags, activeTagSearchQueries,
  clearActiveTagSearchQueries, addActiveTagSearchQuery, removeActiveTagSearchQuery,
  aiPendingEnabled = true
}: LibrarySidebarProps) {
  const projection = projectAssetLibrarySidebar(tags, { activeQueries: activeTagSearchQueries, assetsCount })
  return <nav data-testid="library-sidebar" className="library-collection-rail" aria-label="素材筛选">
    <div className="collection-shortcuts">
      {projection.shortcuts.filter(item => aiPendingEnabled || item.code !== 'ai_pending').map(item => {
        const Icon = item.iconKey === 'sparkles' ? Sparkles : item.iconKey === 'compass' ? Compass : Sliders
        return <button key={item.code} type="button" className="collection-filter" aria-pressed={item.isActive}
          onClick={item.query ? () => addActiveTagSearchQuery(item.query!) : clearActiveTagSearchQueries}>
          <Icon aria-hidden="true" /><span>{item.label}</span>{item.countLabel && <span>{item.countLabel}</span>}
        </button>
      })}
    </div>
    <div className="collection-tags">
      {projection.groups.flatMap(group => group.items).map(item => <button key={item.tag.id} type="button"
        className="collection-filter" aria-pressed={item.isActive}
        onClick={() => item.isActive ? removeActiveTagSearchQuery(item.query) : addActiveTagSearchQuery(item.query)}>
        <TagIcon aria-hidden="true" /><span>{item.tag.name}</span>
      </button>)}
      {tags.length === 0 && <span className="ui-meta whitespace-nowrap">添加标签，让灵感更容易找回</span>}
    </div>
  </nav>
}
