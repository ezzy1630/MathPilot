import { AlertCircle, BookMarked, CheckCircle2, HelpCircle, Wrench } from 'lucide-react'
import type { HomeworkAnalysis } from '../domain/types'
import { MathText } from './MathText'

function resolveWrongStepIndex(analysis: HomeworkAnalysis): number | undefined {
  if (analysis.wrongStepIndex !== undefined) return analysis.wrongStepIndex
  if (analysis.steps?.length) {
    const idx = analysis.steps.findIndex((s) => !s.correct)
    if (idx >= 0) return idx
  }
  const feedback = analysis.stepFeedback
  if (!feedback?.length) return undefined
  const idx = feedback.findIndex((s) => !s.correct)
  return idx >= 0 ? idx : undefined
}

export function HomeworkResultCard({
  analysis,
  onStartRepair,
  onSaveWorkedExample,
}: {
  analysis: HomeworkAnalysis
  onStartRepair?: (skillId: string) => void
  onSaveWorkedExample?: (analysisId: string) => void
}) {
  const Icon =
    analysis.correctness === 'correct'
      ? CheckCircle2
      : analysis.correctness === 'incorrect'
        ? AlertCircle
        : HelpCircle
  const wrongStepIndex = resolveWrongStepIndex(analysis)
  const structuredSteps = analysis.steps ?? []

  return (
    <article className="homework-result-card panel" data-testid="homework-result-card">
      <header className="homework-result-head">
        <Icon size={20} aria-hidden />
        <div>
          <h3>{analysis.detectedTopic}</h3>
          <time dateTime={analysis.createdAt}>{new Date(analysis.createdAt).toLocaleString()}</time>
        </div>
      </header>
      <MathText text={analysis.feedbackSummary} className="homework-result-feedback" />
      {analysis.detectedProblems && analysis.detectedProblems.length > 1 && (
        <ul className="homework-multi-problems">
          {analysis.detectedProblems.map((problem) => (
            <li key={problem.label}>
              <strong>{problem.label}</strong>
              <MathText text={problem.problemText.slice(0, 120)} compact as="span" className="muted" />
            </li>
          ))}
        </ul>
      )}
      {structuredSteps.length > 0 && (
        <ol className="homework-steps-list" aria-label="Worked steps">
          {structuredSteps.map((step, index) => (
            <li
              key={`${step.label}-${index}`}
              className={
                wrongStepIndex === index || !step.correct
                  ? 'homework-step-wrong'
                  : 'homework-step-ok'
              }
            >
              <span className="homework-step-num">{step.label || `Step ${index + 1}`}</span>
              <MathText text={step.work} compact as="span" />
              {step.note && <MathText text={step.note} compact as="span" className="muted" />}
            </li>
          ))}
        </ol>
      )}
      {analysis.stepFeedback && analysis.stepFeedback.length > 0 && (
        <ul className="homework-step-feedback" aria-label="Step feedback">
          {analysis.stepFeedback.map((step, index) => (
            <li
              key={step.step}
              className={step.correct ? 'step-ok' : 'step-issue'}
              data-wrong-step={wrongStepIndex === index ? 'true' : undefined}
            >
              <strong>
                {step.step}
                {wrongStepIndex === index && !step.correct ? ' (first issue)' : ''}
              </strong>
              : <MathText text={step.note} compact as="span" />
            </li>
          ))}
        </ul>
      )}
      {analysis.mistakeTags.length > 0 && (
        <p className="eyebrow">
          Patterns: {analysis.mistakeTags.join(', ')}
        </p>
      )}
      <div className="action-row wrap">
        {analysis.repairRecommendation && onStartRepair && (
          <>
            <button
              type="button"
              className="primary"
              data-testid="homework-repair-cta"
              onClick={() => onStartRepair(analysis.repairRecommendation!.skillId)}
            >
              <Wrench size={18} aria-hidden />
              Start quick repair
            </button>
            <p className="muted">{analysis.repairRecommendation.reason}</p>
          </>
        )}
        {onSaveWorkedExample && !analysis.savedAsWorkedExample && (
          <button type="button" className="secondary" onClick={() => onSaveWorkedExample(analysis.id)}>
            <BookMarked size={18} aria-hidden />
            Save as worked example
          </button>
        )}
        {analysis.savedAsWorkedExample && <p className="muted">Saved as worked example.</p>}
      </div>
      <details className="collapsible-details">
        <summary>Extracted work</summary>
        <MathText text={analysis.extractedWorkSummary} compact as="p" />
      </details>
    </article>
  )
}
