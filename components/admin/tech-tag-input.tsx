'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Plus, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TechTagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  disabled?: boolean
  placeholder?: string
}

export function TechTagInput({
  value,
  onChange,
  suggestions = [],
  disabled = false,
  placeholder = 'Type a technology...',
}: TechTagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const trimmed = inputValue.trim()
  const lowerTrimmed = trimmed.toLowerCase()

  const filtered = trimmed
    ? suggestions.filter(
        (s) =>
          s.toLowerCase().includes(lowerTrimmed) &&
          !value.some((v) => v.toLowerCase() === s.toLowerCase()),
      )
    : suggestions.filter(
        (s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()),
      )

  const showDropdown = open && (filtered.length > 0 || trimmed.length > 0)
  const exactMatch = suggestions.some((s) => s.toLowerCase() === lowerTrimmed)
  const canCreate = trimmed.length > 0 && !value.some((v) => v.toLowerCase() === lowerTrimmed)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const addTag = useCallback(
    (tag: string) => {
      const normalized = tag.trim()
      if (!normalized) return
      if (value.some((v) => v.toLowerCase() === normalized.toLowerCase())) return
      onChange([...value, normalized])
      setInputValue('')
      setOpen(true)
      inputRef.current?.focus()
    },
    [value, onChange],
  )

  const removeTag = useCallback(
    (tag: string) => {
      onChange(value.filter((v) => v !== tag))
    },
    [value, onChange],
  )

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return

    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (canCreate) {
        addTag(trimmed)
      } else if (filtered.length === 1) {
        addTag(filtered[0])
      }
      return
    }

    if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      removeTag(value[value.length - 1])
      return
    }

    if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Tag container / input area */}
      <div
        onClick={() => {
          if (!disabled) {
            setOpen(true)
            inputRef.current?.focus()
          }
        }}
        className={cn(
          'min-h-[42px] w-full flex flex-wrap gap-1.5 px-3 py-2 rounded-xl border border-border bg-background transition-all cursor-text',
          open && 'ring-2 ring-brand/30 border-brand',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: '#f4a29518', color: '#f4a295', border: '1px solid #f4a29530' }}
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeTag(tag)
                }}
                className="w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-[#f4a295]/20 transition-colors"
              >
                <X size={9} />
              </button>
            )}
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent text-foreground text-sm placeholder:text-muted-foreground outline-none"
        />
      </div>

      {/* Hint */}
      {!disabled && (
        <p className="text-[10px] text-muted-foreground mt-1 ml-0.5">
          Press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd> or{' '}
          <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">,</kbd> to add &middot;{' '}
          <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Backspace</kbd> to remove last
        </p>
      )}

      {/* Suggestions dropdown */}
      {showDropdown && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          <div className="max-h-44 overflow-y-auto">
            {filtered.length > 0 && (
              <>
                <p className="px-3.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Suggestions
                </p>
                {filtered.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      addTag(s)
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-left text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Plus size={12} className="shrink-0 opacity-50" />
                    {s}
                  </button>
                ))}
              </>
            )}

            {canCreate && !exactMatch && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  addTag(trimmed)
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3.5 py-2 text-sm text-left transition-colors hover:bg-muted',
                  filtered.length > 0 && 'border-t border-border/50',
                )}
                style={{ color: '#f4a295' }}
              >
                <Plus size={12} className="shrink-0" />
                Add &ldquo;<strong>{trimmed}</strong>&rdquo;
              </button>
            )}

            {filtered.length === 0 && !canCreate && (
              <p className="px-3.5 py-3 text-xs text-muted-foreground text-center">
                {suggestions.length === 0
                  ? 'No suggestions yet. Type to add your first tech tag.'
                  : 'All suggestions already added.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
