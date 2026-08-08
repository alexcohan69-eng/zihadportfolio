'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Check, ChevronDown, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CreatableSelectProps {
  value: string
  onChange: (value: string) => void
  categories: string[]
  onCreateCategory: (name: string) => Promise<boolean>
  disabled?: boolean
}

export function CreatableSelect({
  value,
  onChange,
  categories,
  onCreateCategory,
  disabled,
}: CreatableSelectProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [creating, setCreating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = inputValue.trim()
    ? categories.filter((c) => c.toLowerCase().includes(inputValue.toLowerCase().trim()))
    : categories

  const trimmed = inputValue.trim().toLowerCase()
  const exactMatch = categories.some((c) => c.toLowerCase() === trimmed)
  const showCreate = trimmed.length > 0 && !exactMatch

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setInputValue('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleOpen() {
    if (disabled) return
    setOpen(true)
    setInputValue('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleSelect(cat: string) {
    onChange(cat)
    setOpen(false)
    setInputValue('')
  }

  const handleCreate = useCallback(async () => {
    if (!trimmed || creating) return
    setCreating(true)
    const success = await onCreateCategory(trimmed)
    setCreating(false)
    if (success) {
      onChange(trimmed)
      setOpen(false)
      setInputValue('')
    }
  }, [trimmed, creating, onCreateCategory, onChange])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    if (e.key === 'Enter') {
      e.preventDefault()
      if (showCreate) {
        handleCreate()
      } else if (filtered.length === 1) {
        handleSelect(filtered[0])
      }
    }
    if (e.key === 'Escape') {
      setOpen(false)
      setInputValue('')
    }
  }

  const displayValue = value
    ? value.charAt(0).toUpperCase() + value.slice(1)
    : 'Select or create...'

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand',
          value ? 'text-foreground' : 'text-muted-foreground',
          disabled && 'opacity-50 cursor-not-allowed',
          open && 'ring-2 ring-brand/30 border-brand',
        )}
      >
        <span className="capitalize">{displayValue}</span>
        <ChevronDown
          size={14}
          className={cn('text-muted-foreground transition-transform shrink-0', open && 'rotate-180')}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          {/* Search/Create input */}
          <div className="p-2 border-b border-border">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search or type to create..."
              className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand/40"
            />
          </div>

          <div className="max-h-48 overflow-y-auto">
            {/* Existing categories */}
            {filtered.length > 0 ? (
              filtered.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleSelect(cat)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3.5 py-2 text-sm text-left transition-colors hover:bg-muted',
                    value === cat ? 'text-foreground font-medium' : 'text-muted-foreground',
                  )}
                >
                  <Check
                    size={13}
                    className={cn('shrink-0', value === cat ? 'opacity-100' : 'opacity-0')}
                    style={{ color: '#f4a295' }}
                  />
                  <span className="capitalize">{cat}</span>
                </button>
              ))
            ) : !showCreate ? (
              <p className="px-3.5 py-3 text-xs text-muted-foreground text-center">
                No categories yet
              </p>
            ) : null}

            {/* Create new option */}
            {showCreate && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-sm text-left transition-colors hover:bg-muted border-t border-border/50 disabled:opacity-60"
                style={{ color: '#f4a295' }}
              >
                {creating ? (
                  <Loader2 size={13} className="shrink-0 animate-spin" />
                ) : (
                  <Plus size={13} className="shrink-0" />
                )}
                <span>
                  {creating ? 'Creating...' : (
                    <>Create &ldquo;<strong>{trimmed}</strong>&rdquo;</>
                  )}
                </span>
              </button>
            )}

            {/* Empty state with zero categories */}
            {categories.length === 0 && !showCreate && (
              <div className="px-3.5 py-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">No categories exist yet.</p>
                <p className="text-xs text-muted-foreground">Type a name above to create one.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
