import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
  disabled?: boolean
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

type DisplayRow =
  | { type: 'heading'; key: string; label: string }
  | {
      type: 'action'
      key: string
      label: string
      icon: NonNullable<PaletteCommand['icon']>
      sub?: ReactNode
      run: () => void
    }

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
  const [activeIndex, setActiveIndex] = useState(0)
  const [ftsRows, setFtsRows] = useState<Array<{ entityType: string; entityId: string; body: string }>>([])
  const [resourceHits, setResourceHits] = useState<ResourceSearchResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

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

  const searchHits = useMemo(() => {
    if (!state || query.trim().length < 2) return []
    return mergeSearchHits(state, query, ftsRows, 8)
  }, [state, query, ftsRows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const enabled = commands.filter((c) => !c.disabled)
    if (!q) return enabled
    return enabled.filter(
      (c) => c.label.toLowerCase().includes(q) || (c.keywords ?? '').toLowerCase().includes(q),
    )
  }, [commands, query])

  const displayRows = useMemo(() => {
    const out: DisplayRow[] = []
    const addHeading = (label: string) => {
      if (out.some((row) => row.type === 'heading' && row.label === label)) return
      out.push({ type: 'heading', key: `heading-${label}`, label })
    }
    const addActions = (
      heading: string,
      actions: Array<{
        key: string
        label: string
        icon: NonNullable<PaletteCommand['icon']>
        sub?: ReactNode
        run: () => void
      }>,
    ) => {
      if (!actions.length) return
      addHeading(heading)
      for (const action of actions) out.push({ type: 'action', ...action })
    }

    if (query.trim().length >= 2) {
      addActions(
        'Resources',
        resourceHits.map((hit) => ({
          key: `res-${hit.id}`,
          label: hit.title,
          icon: 'resources' as const,
          sub: (
            <span className="muted palette-hit-sub">
              {hit.source}
              {hit.dynamic ? ' · search' : ''}
            </span>
          ),
          run: () => window.open(hit.url, '_blank', 'noopener,noreferrer'),
        })),
      )
      addActions(
        'Results',
        searchHits.map((hit) => ({
          key: hit.id,
          label: hit.title,
          icon: 'review' as const,
          sub:
            hit.kind === 'problem' ? (
              <MathText text={hit.subtitle} compact className="muted palette-hit-sub" as="span" />
            ) : (
              <span className="muted palette-hit-sub">{hit.subtitle}</span>
            ),
          run: () => onSearchSelect?.(hit),
        })),
      )
    }

    if (!query) {
      addActions(
        'Recent',
        commands
          .filter((command) => !command.disabled && ['review', 'map', 'hw'].includes(command.id))
          .slice(0, 3)
          .map((command) => ({
            key: command.id,
            label: command.label,
            icon: command.icon ?? 'review',
            run: () => command.run(),
          })),
      )
    }

    for (const group of ['Learn', 'Navigate', 'Maintain'] as const) {
      addActions(
        group,
        filtered
          .filter((command) => (command.group ?? 'Learn') === group)
          .map((command) => ({
            key: command.id,
            label: command.label,
            icon: command.icon ?? 'review',
            run: () => command.run(),
          })),
      )
    }

    return out
  }, [commands, filtered, onSearchSelect, query, resourceHits, searchHits])

  const actionableOnly = displayRows.filter((row): row is Extract<DisplayRow, { type: 'action' }> => row.type === 'action')

  const selectionResetKey = `${query}|${actionableOnly.length}`
  const [prevSelectionResetKey, setPrevSelectionResetKey] = useState(selectionResetKey)
  if (selectionResetKey !== prevSelectionResetKey) {
    setPrevSelectionResetKey(selectionResetKey)
    setActiveIndex(0)
  }

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-palette-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  function runActive() {
    const row = actionableOnly[activeIndex]
    if (!row) return
    row.run()
    onClose()
  }

  let actionIndex = -1

  return (
    <AccessibleModal
      title="Search and commands"
      onClose={onClose}
      size="palette"
      className="command-palette-modal"
    >
      <input
        ref={inputRef}
        className="palette-search"
        type="search"
        placeholder="Search skills, problems, commands…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-activedescendant={
          actionableOnly.length ? `palette-option-${activeIndex}` : undefined
        }
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex((i) => Math.min(i + 1, Math.max(0, actionableOnly.length - 1)))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex((i) => Math.max(i - 1, 0))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            runActive()
          }
        }}
        aria-label="Search"
      />
      <div className="command-palette-body" ref={listRef}>
        {displayRows.map((row) => {
          if (row.type === 'heading') {
            return (
              <p key={row.key} className="meta-label palette-section-label">
                {row.label}
              </p>
            )
          }
          actionIndex += 1
          const index = actionIndex
          const Icon = paletteIcons[row.icon]
          return (
            <button
              key={row.key}
              id={`palette-option-${index}`}
              type="button"
              aria-selected={index === activeIndex}
              className={`palette-row ${index === activeIndex ? 'active' : ''}`}
              data-palette-index={index}
              onClick={() => {
                row.run()
                onClose()
              }}
            >
              <Icon size={16} />
              <span className="palette-row-text">
                <strong>{row.label}</strong>
                {row.sub}
              </span>
            </button>
          )
        })}
        {!actionableOnly.length && <p className="muted palette-empty">No matches</p>}
      </div>
      <p className="muted palette-hint">↑↓ to navigate · Enter to run · Esc to close</p>
    </AccessibleModal>
  )
}
