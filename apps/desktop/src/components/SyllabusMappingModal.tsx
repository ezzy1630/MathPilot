import type { MathPilotState } from '../domain/types'

export function SyllabusMappingModal({
  state,
  onToggleTopic,
  onDone,
}: {
  state: MathPilotState
  onToggleTopic: (topic: string, accepted: boolean) => void
  onDone: () => void
}) {
  const mapping = state.syllabusMapping ?? []
  const dates = state.syllabus?.extractedDates ?? []
  const exams = state.syllabus?.extractedExams ?? []

  if (!mapping.length) return null

  return (
    <div className="syllabus-mapping-modal" data-testid="syllabus-mapping-panel">
      <p className="lead">Review topics extracted from your syllabus. Uncheck any you want to ignore.</p>
      {(dates.length > 0 || exams.length > 0) && (
        <div className="syllabus-extract-meta">
          {dates.length > 0 && <p className="muted">Dates: {dates.join(', ')}</p>}
          {exams.length > 0 && <p className="muted">Exams: {exams.join('; ')}</p>}
        </div>
      )}
      <ul className="syllabus-mapping-list">
        {mapping.map((entry) => (
          <li key={entry.topic}>
            <label>
              <input
                type="checkbox"
                checked={entry.accepted}
                onChange={(e) => onToggleTopic(entry.topic, e.target.checked)}
                aria-label={`Accept topic ${entry.topic}`}
              />
              <span>
                <strong>{entry.topic}</strong>
                <small className="muted">
                  {entry.skillIds.map((id) => state.skills[id]?.name ?? id).join(', ')}
                </small>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <button type="button" className="primary" onClick={onDone} data-testid="syllabus-mapping-done">
        Save alignment
      </button>
    </div>
  )
}
