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
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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
      const height = Math.max(120, Math.min(maxHeight, openUp ? availableAbove : availableBelow))

      setDropdownPosition({
        position: 'fixed',
        left: rect.left,
        width: rect.width,
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
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
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

      {shouldRenderDropdown && (
        <div
          className="fixed z-[9999] rounded-xl border border-slate-100 bg-white/95 backdrop-blur shadow-xl overflow-y-auto p-1 font-sans"
          style={dropdownPosition}
        >
          {/* Autocomplete tags list */}
          {filteredSuggestions.map((option, idx) => (
            <button
              key={option.tag.id}
              onClick={() => handleSelectSuggestion(option)}
              onMouseEnter={() => setHighlightedIndex(idx)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-[11.5px] font-medium flex items-center justify-between transition-colors ${
                highlightedIndex === idx
                  ? 'bg-brand-50 text-brand-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
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
              onClick={handleCreateCustom}
              onMouseEnter={() => setHighlightedIndex(filteredSuggestions.length)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 border-t border-slate-50 mt-1 transition-colors ${
                highlightedIndex === filteredSuggestions.length
                  ? 'bg-brand-50 text-brand-700 font-bold'
                  : 'text-brand-500 hover:bg-slate-50'
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
        </div>
      )}
    </div>
  )
}
