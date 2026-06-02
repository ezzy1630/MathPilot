import { Sparkles } from 'lucide-react'
import { Button } from '../ui'
import { MathText } from './MathText'
import { HomeworkUpload } from './HomeworkUpload'
import type { ResourceRecord } from '../domain/types'

type FeedbackTone = 'correct' | 'wrong' | 'almost' | null | undefined

interface ActivityTeachingPanelProps {
  title: string
  body: string
  feedbackTone?: FeedbackTone
  feedbackNextSteps?: string[]
  wrongEscalation?: number
  attemptMode: string
  isDiagnostic: boolean
  codexBusy: boolean
  showSteps: boolean
  setShowSteps: (value: boolean) => void
  showReviewExplain: boolean
  showGraph: boolean
  graphExpression: string
  rankedResources: ResourceRecord[]
  developerModeEnabled?: boolean
  homeworkText?: string
  setHomeworkText?: (value: string) => void
  analyzeHomework?: (
    payload: { text: string; imageDataUrl?: string; imageFileName?: string },
    saveRaw?: boolean,
  ) => void | Promise<void>
  homeworkAnalyzing?: boolean
  onRequestHelp: (prompt: string) => void
  onCancelCodex?: () => void
  onTrySimilar: () => void
  onGeneratePacket?: () => void
}

export function ActivityTeachingPanel({
  title,
  body,
  feedbackTone,
  feedbackNextSteps,
  wrongEscalation,
  attemptMode,
  isDiagnostic,
  codexBusy,
  showSteps,
  setShowSteps,
  showReviewExplain,
  showGraph,
  graphExpression,
  rankedResources,
  developerModeEnabled,
  homeworkText,
  setHomeworkText,
  analyzeHomework,
  homeworkAnalyzing,
  onRequestHelp,
  onCancelCodex,
  onTrySimilar,
  onGeneratePacket,
}: ActivityTeachingPanelProps) {
  const toneClass =
    feedbackTone === 'correct'
      ? 'inspector-correct'
      : feedbackTone === 'wrong'
        ? 'inspector-wrong'
        : 'inspector-almost'

  return (
    <div className={`inspector-card ${toneClass}`}>
        <h2 className="inspector-title">{title}</h2>
        <MathText text={body} className="inspector-feedback-body" />
        {(wrongEscalation ?? 0) > 0 && feedbackTone !== 'correct' && (
          <p className="inspector-meta">
            Guided feedback · step {(wrongEscalation ?? 0) + 1} of 3
            {attemptMode === 'independent' && ' · try again before more help'}
            {attemptMode === 'review' && wrongEscalation! >= 2 && ' · explain after miss'}
          </p>
        )}
        {feedbackTone === 'correct' && (
          <section className="inspector-next">
            <h3>Try next</h3>
            <ul>
              {(feedbackNextSteps?.length
                ? feedbackNextSteps
                : ['Try a similar problem without hints to lock in the skill.']
              ).map((step) => (
                <li key={step}>
                  <MathText text={step} compact />
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="inspector-actions inspector-actions-primary">
          <Button variant="ghost" size="sm" onClick={() => setShowSteps(!showSteps)}>
            {showSteps ? 'Hide steps' : 'Add steps'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onRequestHelp('check my setup for this problem')}
            disabled={isDiagnostic}
          >
            Check setup
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Sparkles size={16} />}
            onClick={() => onRequestHelp('explain this problem')}
            disabled={codexBusy || isDiagnostic}
            loading={codexBusy}
          >
            Ask Codex
          </Button>
          {codexBusy && onCancelCodex && (
            <Button variant="ghost" size="sm" onClick={() => onCancelCodex()}>
              Cancel
            </Button>
          )}
        </div>
        <details className="inspector-more" aria-label="More help">
          <summary>More help</summary>
          <div className="inspector-actions">
            <Button variant="secondary" size="sm" onClick={onTrySimilar}>
              Try one like this
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onRequestHelp('build a repair step for this mistake')}
              disabled={isDiagnostic}
            >
              Build repair step
            </Button>
            {showReviewExplain && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  onRequestHelp('After a review miss, explain the concept without giving the full answer')
                }
                disabled={codexBusy || isDiagnostic}
              >
                Explain after miss
              </Button>
            )}
            {developerModeEnabled && onGeneratePacket && (
              <Button variant="ghost" size="sm" onClick={onGeneratePacket}>
                Prompt packet
              </Button>
            )}
          </div>
          {showGraph && (
            <div className="inspector-graph-links">
              <p className="meta-label">Graph tools</p>
              <div className="external-graph-links">
                <a
                  className="external-link"
                  href={`https://www.desmos.com/calculator?lang=en&expressions=${encodeURIComponent(graphExpression)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Desmos
                </a>
                <a className="external-link" href="https://www.geogebra.org/graphing?lang=en" target="_blank" rel="noreferrer">
                  GeoGebra
                </a>
                <a
                  className="external-link"
                  href={`https://www.wolframalpha.com/input?i=plot+${encodeURIComponent(graphExpression.replace(/^y=/, ''))}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WolframAlpha
                </a>
              </div>
            </div>
          )}
          {rankedResources.length > 0 && (
            <div className="inspector-resources">
              <p className="meta-label">Resources</p>
              <ul className="inspector-resource-list">
                {rankedResources.map((resource) => (
                  <li key={resource.id}>
                    <a href={resource.url} target="_blank" rel="noreferrer">
                      {resource.title}
                    </a>
                    <span className="inspector-resource-score">{Math.round(resource.effectivenessScore * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analyzeHomework && setHomeworkText && (
            <details className="inspector-upload">
              <summary>Upload work photo</summary>
              {homeworkAnalyzing && <p className="inspector-meta">Analyzing homework…</p>}
              <HomeworkUpload
                text={homeworkText ?? ''}
                onTextChange={setHomeworkText}
                onAnalyze={(payload, saveRaw) => void analyzeHomework(payload, saveRaw)}
                compact
              />
            </details>
          )}
        </details>
    </div>
  )
}
