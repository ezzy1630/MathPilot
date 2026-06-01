import { Brain } from 'lucide-react'

export function LoadingShell() {
  return (
    <main className="app-shell loading-shell">
      <div className="loading-card">
        <div className="loading-mark">
          <Brain size={32} />
        </div>
        <p className="loading-title">MathPilot</p>
        <p className="loading-sub">Loading your local profile…</p>
        <div className="loading-bar" aria-hidden>
          <span className="loading-bar-fill" />
        </div>
      </div>
    </main>
  )
}
