import React, { useState, useEffect, useRef } from 'react'
import { Plus, Search } from 'lucide-react'
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
  
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter matches in database tags
  const filteredSuggestions = tags
    .filter((tag) => {
      const matchSearch = tag.name.toLowerCase().includes(inputValue.toLowerCase()) || 
                          tag.aliases.some(a => a.toLowerCase().includes(inputValue.toLowerCase()))
      const notExcluded = !excludeTagNames.includes(tag.name)
      return matchSearch && notExcluded
    })
    .slice(0, 8)

  const hasExactMatch = tags.some(
    (tag) => tag.name.toLowerCase() === inputValue.trim().toLowerCase()
  )

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) =>
        prev < filteredSuggestions.length + (hasExactMatch ? 0 : 1) - 1 ? prev + 1 : 0
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSuggestions.length + (hasExactMatch ? 0 : 1) - 1
      )
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = inputValue.trim()
      if (!trimmed) return

      const isCreateOptionActive = !hasExactMatch && highlightedIndex === filteredSuggestions.length

      if (filteredSuggestions.length > 0 && highlightedIndex < filteredSuggestions.length) {
        // Select highlighted tag
        onSelectTag(filteredSuggestions[highlightedIndex].id)
        setInputValue('')
        setShowDropdown(false)
      } else if (isCreateOptionActive || !hasExactMatch) {
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

  const handleSelectSuggestion = (tag: Tag) => {
    onSelectTag(tag.id)
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

      {showDropdown && (inputValue.trim() !== '' || filteredSuggestions.length > 0) && (
        <div className="absolute z-40 top-full left-0 w-full mt-1.5 rounded-xl border border-slate-100 bg-white/95 backdrop-blur shadow-xl max-h-60 overflow-y-auto p-1 font-sans">
          {/* Autocomplete tags list */}
          {filteredSuggestions.map((tag, idx) => (
            <button
              key={tag.id}
              onClick={() => handleSelectSuggestion(tag)}
              onMouseEnter={() => setHighlightedIndex(idx)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-[11.5px] font-medium flex items-center justify-between transition-colors ${
                highlightedIndex === idx
                  ? 'bg-brand-50 text-brand-700 font-bold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${tag.color.split(' ')[0] || 'bg-slate-400'}`} />
                <span>{tag.name}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider scale-90">
                {tag.type}
              </span>
            </button>
          ))}

          {/* Quick creation of a new tag option */}
          {!hasExactMatch && inputValue.trim() !== '' && (
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
              <span>快速创建新标签 &quot;{inputValue.trim()}&quot;</span>
            </button>
          )}

          {filteredSuggestions.length === 0 && hasExactMatch && (
            <div className="px-3 py-2 text-[10.5px] text-slate-400 font-medium text-center">
              该标签已添加
            </div>
          )}
        </div>
      )}
    </div>
  )
}
