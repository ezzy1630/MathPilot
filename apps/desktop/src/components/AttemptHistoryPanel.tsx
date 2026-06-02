import { CheckCircle2, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { searchAppState } from '../domain/searchIndex'
import type { MathPilotState } from '../domain/types'
import { MathText } from './MathText'

export function AttemptHistoryPanel({
  state,
  onClose,
}: {
  state: MathPilotState
  onClose: () => void
}) {
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = state.attempts.map((attempt) => {
      const problem = state.problems[attempt.problemId]
      const skillName =
        attempt.skillIds.map((id) => state.skills[id]?.name ?? id).join(', ') || 'Unknown skill'
      return {
        id: attempt.id,
        skillName,
        problemTitle: problem?.title ?? attempt.problemId,
        answer: attempt.answer,
        correct: attempt.correct,
        createdAt: attempt.createdAt,
        mode: attempt.mode,
        mistakeTags: attempt.mistakeTags ?? [],
        haystack: `${skillName} ${problem?.title ?? ''} ${attempt.answer} ${(attempt.mistakeTags ?? []).join(' ')}`.toLowerCase(),
      }
    })
    if (q.length < 2) return base
    const ftsIds = new Set(searchAppState(state, query, 40).filter((h) => h.kind === 'attempt').map((h) => h.id.replace('attempt-', '')))
    return base.filter((row) => row.haystack.includes(q) || ftsIds.has(row.id))
  }, [state, query])

  return (
    <div className="attempt-history-panel">
      <input
        className="palette-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search attempts by skill, problem, or mistake tag…"
        aria-label="Search attempt history"
        data-testid="attempt-history-search"
      />
      <ul className="attempt-history-list" aria-label="Attempt history results">
        {rows.length === 0 && <li className="muted">No attempts match your search.</li>}
        {rows.map((row) => (
          <li key={row.id} data-testid="attempt-history-row">
            {row.correct ? <CheckCircle2 size={18} aria-hidden /> : <XCircle size={18} aria-hidden />}
            <div>
              <strong>{row.skillName}</strong>
              <span className="muted">
                {row.problemTitle} · {new Date(row.createdAt).toLocaleString()} · {row.mode}
              </span>
              {row.answer && (
                <MathText text={row.answer} compact className="attempt-history-answer" as="span" />
              )}
              {row.mistakeTags.length > 0 && (
                <span className="attempt-tags">{row.mistakeTags.join(', ')}</span>
              )}
            </div>
            <span className={`attempt-correctness ${row.correct ? 'ok' : 'miss'}`}>
              {row.correct ? 'Correct' : 'Needs repair'}
            </span>
          </li>
        ))}
      </ul>
      <button type="button" className="secondary" onClick={onClose}>
        Close
      </button>
    </div>
  )
}
