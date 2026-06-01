import { AlertCircle, CheckCircle2, HelpCircle, Wrench } from 'lucide-react'
import type { HomeworkAnalysis } from '../domain/types'

export function HomeworkResultCard({
  analysis,
  onStartRepair,
}: {
  analysis: HomeworkAnalysis
  onStartRepair?: (skillId: string) => void
}) {
  const Icon =
    analysis.correctness === 'correct'
      ? CheckCircle2
      : analysis.correctness === 'incorrect'
        ? AlertCircle
        : HelpCircle

  return (
    <article className="homework-result-card panel">
      <header className="homework-result-head">
        <Icon size={20} />
        <div>
          <h3>{analysis.detectedTopic}</h3>
          <time dateTime={analysis.createdAt}>{new Date(analysis.createdAt).toLocaleString()}</time>
        </div>
      </header>
      <p className="homework-result-feedback">{analysis.feedbackSummary}</p>
      {analysis.stepFeedback && analysis.stepFeedback.length > 0 && (
        <ul className="homework-step-feedback">
          {analysis.stepFeedback.map((step) => (
            <li key={step.step} className={step.correct ? 'step-ok' : 'step-issue'}>
              <strong>{step.step}</strong>: {step.note}
            </li>
          ))}
        </ul>
      )}
      {analysis.mistakeTags.length > 0 && (
        <p className="eyebrow">
          Patterns: {analysis.mistakeTags.join(', ')}
        </p>
      )}
      {analysis.repairRecommendation && onStartRepair && (
        <div className="action-row">
          <button
            type="button"
            className="primary"
            onClick={() => onStartRepair(analysis.repairRecommendation!.skillId)}
          >
            <Wrench size={18} />
            Start quick repair
          </button>
          <p className="muted">{analysis.repairRecommendation.reason}</p>
        </div>
      )}
      <details className="collapsible-details">
        <summary>Extracted work</summary>
        <p>{analysis.extractedWorkSummary}</p>
      </details>
    </article>
  )
}
