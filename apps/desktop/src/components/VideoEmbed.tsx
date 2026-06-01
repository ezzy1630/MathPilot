import { ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ResourceRecord } from '../domain/types'

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
  const embed = embedUrl(resource.url)

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

  return (
    <div className="video-embed panel">
      <h3>{resource.title}</h3>
      <p className="muted">{resource.source} · {resource.duration}</p>
      {activeMode === 'active' && (
        <p className="eyebrow">Active video — you will be paused to retrieve the main idea.</p>
      )}
      {embed ? (
        <iframe title={resource.title} src={embed} className="video-frame" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
      ) : (
        <a href={resource.url} target="_blank" rel="noreferrer" className="secondary">
          <ExternalLink size={16} /> Open video
        </a>
      )}
      {interruptShown && !watched && (
        <div className="help-toolbar" style={{ marginTop: 12 }}>
          <p className="eyebrow">Active check-in</p>
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
