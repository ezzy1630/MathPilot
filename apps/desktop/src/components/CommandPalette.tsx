import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Clock3, FileText, Map, Search, Settings, Sparkles, Wrench } from 'lucide-react'
import { AccessibleModal } from './AccessibleModal'
import { MathText } from './MathText'
import { searchResources, type ResourceSearchResult } from '@mathpilot/content-engine'
import { mergeSearchHits, searchViaFts, type SearchHit } from '../domain/searchIndex'
import type { MathPilotState } from '../domain/types'

export interface PaletteCommand {
  id: string
  label: string
  keywords?: string
  group?: 'Learn' | 'Navigate' | 'Maintain'
  icon?: 'homework' | 'review' | 'map' | 'resources' | 'diagnostic' | 'settings' | 'maintain' | 'report' | 'developer'
  run: () => void
}

const paletteIcons = {
  homework: FileText,
  review: Clock3,
  map: Map,
  resources: BookOpen,
  diagnostic: Sparkles,
  settings: Settings,
  maintain: Wrench,
  report: Search,
  developer: Wrench,
} satisfies Record<NonNullable<PaletteCommand['icon']>, typeof Search>

export function CommandPalette({
  commands,
  onClose,
  state,
  onSearchSelect,
}: {
  commands: PaletteCommand[]
  onClose: () => void
  state?: MathPilotState
  onSearchSelect?: (hit: SearchHit) => void
}) {
  const [query, setQuery] = useState('')
  const [ftsRows, setFtsRows] = useState<Array<{ entityType: string; entityId: string; body: string }>>([])
  const [resourceHits, setResourceHits] = useState<ResourceSearchResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!state || query.trim().length < 2) return
    let cancelled = false
    void searchViaFts(query, 8).then((rows) => {
      if (!cancelled) setFtsRows(rows)
    })
    return () => {
      cancelled = true
    }
  }, [state, query])

  useEffect(() => {
    if (!state || query.trim().length < 2) return
    let cancelled = false
    void searchResources(query, { resources: state.resources }, { limit: 4 }).then((results) => {
      if (!cancelled) setResourceHits(results)
    })
    return () => {
      cancelled = true
    }
  }, [state, query])

  const effectiveResourceHits = query.trim().length < 2 ? [] : resourceHits

  const searchHits = useMemo(() => {
    if (!state || query.trim().length < 2) return []
    return mergeSearchHits(state, query, ftsRows, 8)
  }, [state, query, ftsRows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || (c.keywords ?? '').toLowerCase().includes(q),
    )
  }, [commands, query])
  const groupedCommands = useMemo(() => {
    const groups: Array<NonNullable<PaletteCommand['group']>> = ['Learn', 'Navigate', 'Maintain']
    return groups
      .map((group) => ({ group, commands: filtered.filter((command) => (command.group ?? 'Learn') === group) }))
      .filter((group) => group.commands.length > 0)
  }, [filtered])
  const recentCommands = commands.filter((command) => ['review', 'map', 'hw'].includes(command.id)).slice(0, 3)

  return (
    <AccessibleModal title="Search & commands" onClose={onClose}>
      <input
        ref={inputRef}
        className="palette-search"
        type="search"
        placeholder="Search skills, problems, commands…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search"
      />
      {effectiveResourceHits.length > 0 && (
        <>
          <p className="meta-label" style={{ marginTop: 12 }}>
            Resources
          </p>
          <ul className="palette-list">
            {effectiveResourceHits.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  onClick={() => {
                    window.open(hit.url, '_blank', 'noopener,noreferrer')
                    onClose()
                  }}
                >
                  <BookOpen size={16} />
                  <strong>{hit.title}</strong>
                  <span className="muted palette-hit-sub">
                    {hit.source}
                    {hit.dynamic ? ' · search' : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {searchHits.length > 0 && (
        <>
          <p className="meta-label" style={{ marginTop: 12 }}>
            Results
          </p>
          <ul className="palette-list">
            {searchHits.map((hit) => (
            <li key={hit.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSearchSelect?.(hit)
                    onClose()
                  }}
                >
                  <Search size={16} />
                  <strong>{hit.title}</strong>
                  {hit.kind === 'problem' ? (
                    <MathText text={hit.subtitle} compact className="muted palette-hit-sub" as="span" />
                  ) : (
                    <span className="muted palette-hit-sub">{hit.subtitle}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {!query && (
        <>
          <p className="meta-label" style={{ marginTop: 12 }}>
            Recent
          </p>
          <ul className="palette-list palette-recents">
            {recentCommands.map((command) => {
              const Icon = paletteIcons[command.icon ?? 'review']
              return (
                <li key={command.id}>
                  <button
                    type="button"
                    onClick={() => {
                      command.run()
                      onClose()
                    }}
                  >
                    <Icon size={16} />
                    <span>{command.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
      {groupedCommands.map(({ group, commands }) => (
        <div className="palette-group" key={group}>
          <p className="meta-label">{group}</p>
          <ul className="palette-list">
            {commands.map((command) => {
              const Icon = paletteIcons[command.icon ?? 'review']
              return (
                <li key={command.id}>
                  <button
                    type="button"
                    onClick={() => {
                      command.run()
                      onClose()
                    }}
                  >
                    <Icon size={16} />
                    <span>{command.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      {!filtered.length && !searchHits.length && !effectiveResourceHits.length && (
        <p className="muted">No matches</p>
      )}
      <p className="muted palette-hint">Esc to close · ⌘K anytime</p>
    </AccessibleModal>
  )
}
