import { ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ResourceRecord } from '../domain/types'

const PREDICTION_PROMPTS = [
  'What is the main idea this video is building toward?',
  'What would you do on the next similar problem?',
  'Name one common mistake students make here.',
]

function embedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`
    }
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed${u.pathname}`
    }
  } catch {
    return null
  }
  return null
}

export function VideoEmbed({
  resource,
  onCompletePostCheck,
  activeMode = 'sometimes',
  onInterrupt,
}: {
  resource: ResourceRecord
  onCompletePostCheck: (passed: boolean) => void
  activeMode?: 'never' | 'sometimes' | 'active'
  onInterrupt?: (reason: string) => void
}) {
  const [watched, setWatched] = useState(false)
  const [interruptShown, setInterruptShown] = useState(false)
  const [predictionIndex, setPredictionIndex] = useState(0)
  const [predictionAnswer, setPredictionAnswer] = useState('')
  const embed = embedUrl(resource.url)
  const predictionPrompt = PREDICTION_PROMPTS[predictionIndex % PREDICTION_PROMPTS.length]

  useEffect(() => {
    if (activeMode === 'never') return
    const delayMs = activeMode === 'active' ? 45_000 : 90_000
    const timer = window.setTimeout(() => {
      if (!watched && !interruptShown) {
        setInterruptShown(true)
        onInterrupt?.('Pause — can you state the main idea in one sentence?')
      }
    }, delayMs)
    return () => window.clearTimeout(timer)
  }, [activeMode, watched, interruptShown, onInterrupt])

  if (activeMode === 'never') {
    return (
      <div className="video-embed panel video-embed-passive">
        <h3>{resource.title}</h3>
        <p className="muted">{resource.source} · {resource.duration}</p>
        <p className="eyebrow">Passive mode — open externally if you want to watch.</p>
        <a href={resource.url} target="_blank" rel="noreferrer" className="secondary">
          <ExternalLink size={16} aria-hidden /> Open video
        </a>
      </div>
    )
  }

  return (
    <div className="video-embed panel" data-testid="video-embed">
      <h3>{resource.title}</h3>
      <p className="muted">{resource.source} · {resource.duration}</p>
      {activeMode === 'active' && (
        <p className="eyebrow">Active video — prediction questions and pauses keep you engaged.</p>
      )}
      {activeMode === 'active' && !watched && (
        <div className="video-prediction panel-inset" role="group" aria-label="Prediction before watching">
          <p className="meta-label">Before you watch</p>
          <p>{predictionPrompt}</p>
          <textarea
            rows={2}
            value={predictionAnswer}
            onChange={(e) => setPredictionAnswer(e.target.value)}
            placeholder="Write a short prediction…"
            aria-label="Video prediction answer"
          />
          <button
            type="button"
            className="ghost small"
            onClick={() => setPredictionIndex((i) => i + 1)}
          >
            Different prompt
          </button>
        </div>
      )}
      {embed ? (
        <iframe title={resource.title} src={embed} className="video-frame" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
      ) : (
        <a href={resource.url} target="_blank" rel="noreferrer" className="secondary">
          <ExternalLink size={16} aria-hidden /> Open video
        </a>
      )}
      {interruptShown && !watched && (
        <div className="help-toolbar" style={{ marginTop: 12 }}>
          <p className="eyebrow">Active check-in</p>
          <p className="muted">{predictionPrompt}</p>
          <button type="button" className="primary" onClick={() => setWatched(true)}>
            I can explain the main idea
          </button>
          <button type="button" className="secondary" onClick={() => setInterruptShown(false)}>
            Keep watching
          </button>
        </div>
      )}
      {!watched ? (
        <button type="button" className="primary" style={{ marginTop: 12 }} onClick={() => setWatched(true)}>
          I finished watching
        </button>
      ) : (
        <div className="help-toolbar" style={{ marginTop: 12 }}>
          <p className="eyebrow">Quick check (required before continuing)</p>
          <button type="button" className="primary" onClick={() => onCompletePostCheck(true)}>
            I can explain the main idea
          </button>
          <button type="button" className="secondary" onClick={() => onCompletePostCheck(false)}>
            I need another pass
          </button>
        </div>
      )}
    </div>
  )
}
