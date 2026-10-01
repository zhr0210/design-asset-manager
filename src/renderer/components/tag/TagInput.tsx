import {createPortal} from 'react-dom'
import {useUIStore} from '../../stores/ui.store'
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { Plus, Search } from 'lucide-react'
import { projectAssetTagInput, type AssetTagPickerOption } from '../../../shared/workflows/asset-tagging.workflow'
import { useAssetStore, Tag } from '../../stores/asset.store'

interface TagInputProps {
  onSelectTag: (tagId: string) => void
  onAddCustomTag: (tagName: string) => void
  placeholder?: string
  excludeTagNames?: string[]
}

export default function TagInput({
  onSelectTag,
  onAddCustomTag,
  placeholder = '添加标签...',
  excludeTagNames = []
}: TagInputProps) {
  const theme=useUIStore(s=>s.theme)
  const dropdownRef=useRef<HTMLDivElement>(null)
  const tags = useAssetStore((s) => s.tags)
  const [inputValue, setInputValue] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [dropdownPosition, setDropdownPosition] = useState<React.CSSProperties>({})
  
  const containerRef = useRef<HTMLDivElement>(null)

  const tagInput = projectAssetTagInput(tags, { inputValue, excludeTagNames, limit: 8 })
  const filteredSuggestions = tagInput.suggestions
  const shouldRenderDropdown = showDropdown && (inputValue.trim() !== '' || filteredSuggestions.length > 0)

  useEffect(() => {
    // Reset index on filter change
    setHighlightedIndex(0)
  }, [inputValue])

  useEffect(() => {
    // Click outside handler
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node) && !dropdownRef.current?.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useLayoutEffect(() => {
    if (!shouldRenderDropdown) return

    const updateDropdownPosition = () => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const gap = 6
      const maxHeight = 240
      const availableBelow = window.innerHeight - rect.bottom - gap
      const availableAbove = rect.top - gap
      const openUp = availableBelow < 160 && availableAbove > availableBelow
      const scroll=containerRef.current?.closest('[data-inspector-scroll]')?.getBoundingClientRect()
      if(rect.bottom<0||rect.top>window.innerHeight||(scroll&&(rect.bottom<scroll.top||rect.top>scroll.bottom))){setShowDropdown(false);return}
      const height = Math.max(0, Math.min(maxHeight, (openUp ? availableAbove : availableBelow)-8))

      setDropdownPosition({
        position: 'fixed',
        left: Math.max(8,Math.min(rect.left,window.innerWidth-rect.width-8)),
        width: Math.min(rect.width,window.innerWidth-16),
        top: openUp ? undefined : rect.bottom + gap,
        bottom: openUp ? window.innerHeight - rect.top + gap : undefined,
        maxHeight: height
      })
    }

    updateDropdownPosition()
    window.addEventListener('resize', updateDropdownPosition)
    window.addEventListener('scroll', updateDropdownPosition, true)
    return () => {
      window.removeEventListener('resize', updateDropdownPosition)
      window.removeEventListener('scroll', updateDropdownPosition, true)
    }
  }, [shouldRenderDropdown, inputValue, filteredSuggestions.length])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) =>
        prev < filteredSuggestions.length + (tagInput.hasExactMatch ? 0 : 1) - 1 ? prev + 1 : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSuggestions.length + (tagInput.hasExactMatch ? 0 : 1) - 1
      )
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = inputValue.trim()
      if (!trimmed) return

      const isCreateOptionActive = tagInput.canCreate && highlightedIndex === filteredSuggestions.length

      if (filteredSuggestions.length > 0 && highlightedIndex < filteredSuggestions.length) {
        // Select highlighted tag
        onSelectTag(filteredSuggestions[highlightedIndex].tag.id)
        setInputValue('')
        setShowDropdown(false)
      } else if (isCreateOptionActive || tagInput.canCreate) {
        // Trigger quick create custom
        onAddCustomTag(trimmed)
        setInputValue('')
        setShowDropdown(false)
      } else {
        // Exact match exists and highlighted index is not out of bounds
        const matched = tags.find(t => t.name.toLowerCase() === trimmed.toLowerCase())
        if (matched) {
          onSelectTag(matched.id)
          setInputValue('')
          setShowDropdown(false)
        }
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }

  const handleSelectSuggestion = (option: AssetTagPickerOption<Tag>) => {
    onSelectTag(option.tag.id)
    setInputValue('')
    setShowDropdown(false)
  }

  const handleCreateCustom = () => {
    const trimmed = inputValue.trim()
    if (trimmed) {
      onAddCustomTag(trimmed)
      setInputValue('')
      setShowDropdown(false)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full asset-tag-input">
      <div className="relative tag-input-field">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setShowDropdown(true)
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-9 pr-4 py-1.5 text-[11.5px] font-medium rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all"
        />
      </div>

      {shouldRenderDropdown && createPortal(
       <div className={`gallery-design minimal-prototype tag-input-layer ${theme==='dark'?'dark':''}`}>
        <div
          ref={dropdownRef}
          role="listbox" aria-label="标签建议"
          onMouseDown={e=>e.preventDefault()}
          className="tag-suggestions fixed z-[9999] rounded-xl backdrop-blur shadow-xl overflow-y-auto p-1 font-sans"
          style={dropdownPosition}
        >
          {/* Autocomplete tags list */}
          {filteredSuggestions.map((option, idx) => (
            <button
              role="option" aria-selected={highlightedIndex===idx}
              key={option.tag.id}
              onClick={() => handleSelectSuggestion(option)}
              onMouseEnter={() => setHighlightedIndex(idx)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-[11.5px] font-medium flex items-center justify-between transition-colors ${
                highlightedIndex === idx
                  ? 'active'
                  : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${option.colorDotClass}`} />
                <span>{option.tag.name}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider scale-90">
                {option.typeBadgeLabel}
              </span>
            </button>
          ))}

          {/* Quick creation of a new tag option */}
          {tagInput.canCreate && (
            <button
              role="option" aria-selected={highlightedIndex===filteredSuggestions.length}
              onClick={handleCreateCustom}
              onMouseEnter={() => setHighlightedIndex(filteredSuggestions.length)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border-t border-slate-50 mt-1 transition-colors ${
                highlightedIndex === filteredSuggestions.length
                  ? 'active'
                  : ''
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{tagInput.createLabel}</span>
            </button>
          )}

          {filteredSuggestions.length === 0 && tagInput.hasExactMatch && (
            <div className="px-3 py-2 text-[10.5px] text-slate-400 font-medium text-center">
              {tagInput.duplicateLabel}
            </div>
          )}
        </div></div>,containerRef.current?.closest('dialog')??document.body
      )}
    </div>
  )
}
