import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ClipboardList,
  Code2,
  Download,
  Eye,
  FolderOpen,
  HelpCircle,
  Map,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { primaryGraphExpression } from '../domain/graphPresets'
import { listBackups, restoreBackupPayload } from '../domain/persistence'
import type { MathfieldElement } from 'mathlive'
import { HomeworkUpload } from '../components/HomeworkUpload'
import { HomeworkResultCard } from '../components/HomeworkResultCard'
import { DesmosEmbed } from '../components/DesmosEmbed'
import { FormulaRecallPanel } from '../components/FormulaRecallPanel'
import { MathInput } from '../components/MathInput'
import { EmptyStateIllustration } from '../components/EmptyStateIllustration'
import { SimilarExamplePanel } from '../components/SimilarExamplePanel'
import { PrerequisiteTree } from '../components/PrerequisiteTree'
import { KnowledgeMapWheel } from '../components/KnowledgeMapWheel'
import { SessionChrome } from '../components/SessionChrome'
import { VideoEmbed } from '../components/VideoEmbed'
import { SignChart } from '../components/SignChart'
import { signChartForSkill } from '../domain/signChartData'
import { requiresShowWork } from '../domain/showWorkPolicy'
import { applySyllabusUpload } from '../domain/syllabusUpload'
import { MistakePatternsPanel } from '../components/MistakePatternsPanel'
import { TodayMasteryStrip } from '../components/TodayMasteryStrip'
import { ResourceEffectivenessPanel } from '../components/ResourceEffectivenessPanel'
import { chooseNextAction } from '../domain/learningEngine'
import { recordResourceHelpfulness } from '../domain/resourceLearning'
import { listTrustedResources, skillNamesForResource } from '../domain/resourceResolver'
import { exportState } from '../domain/storage'
import { currentSessionPhase, sessionPhaseLabel } from '../domain/dailySessionEngine'
import { checkPrerequisiteGate } from '../domain/sessionEngine'
import type { SessionPace } from '../domain/sessionEngine'
import { quickRepairExplanation, repairProgress } from '../domain/quickRepairEngine'
import { topResourcesForSkill } from '../domain/resourceLearning'
import { groupByArea, problemForSkill, readiness, areaReadiness } from '../lib/mapHelpers'
import { Button, MasteryBadge, SegmentedControl } from '../ui'
import { Modal } from '../ui/Modal'
import type { CourseFocus, MathPilotState, Problem } from '../domain/types'
import type { AppView } from '../app/types'

export function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick} aria-label={label}>
      {icon}
      <span>{label}</span>
    </button>
  )
}

export function Onboarding({
  chooseFocus,
  beginDiagnostic,
  step,
  setStep,
}: {
  chooseFocus: (focus: CourseFocus) => void
  beginDiagnostic: () => void
  step: 'welcome' | 'focus' | 'confirm_diagnostic' | 'diagnostic'
  setStep: (s: 'welcome' | 'focus' | 'confirm_diagnostic' | 'diagnostic') => void
}) {
  if (step === 'welcome') {
    return (
      <div className="onboarding">
        <div className="mark">
          <EmptyStateIllustration variant="welcome" />
        </div>
        <p className="eyebrow">Step 1 of 3</p>
        <h1>Set up your calculus desk</h1>
        <p className="lead">
          MathPilot keeps your progress local, finds the next useful problem, and updates the map from real work.
        </p>
        <button className="primary large" onClick={() => setStep('focus')}>
          Continue
        </button>
      </div>
    )
  }
  if (step === 'focus') {
    return (
      <div className="onboarding">
        <p className="eyebrow">Step 2 of 3</p>
        <h1>Choose your focus</h1>
        <p className="lead">MathPilot will run a short adaptive diagnostic to build your initial knowledge map.</p>
        <div className="choice-row">
          <button className="primary large" onClick={() => chooseFocus('Calculus 1')}>
            Calculus 1
          </button>
          <button className="secondary large" onClick={() => chooseFocus('Calculus 2')}>
            Calculus 2
          </button>
        </div>
      </div>
    )
  }
  if (step === 'confirm_diagnostic') {
    return (
      <div className="onboarding">
        <p className="eyebrow">Step 3 of 3</p>
        <h1>Start adaptive diagnostic</h1>
        <p className="lead">
          About 25 questions adapt to your answers and build your initial knowledge map. You can pause anytime — progress
          is saved locally.
        </p>
        <div className="choice-row">
          <button className="primary large" onClick={beginDiagnostic}>
            Start adaptive diagnostic
          </button>
          <button className="ghost" onClick={() => setStep('focus')}>
            Back
          </button>
        </div>
      </div>
    )
  }
  return null
}

export function TodayView({
  state,
  nextAction,
  startAction,
  setView,
  homeworkText,
  setHomeworkText,
  analyzeHomework,
  homeworkAnalyzing,
  showFormulaRecall,
  onFormulaRecallDone,
  onStartFormulaRecall,
  onWhy,
  setPace,
  sessionPace,
  diagnostic,
  onStartRepair,
  onOpenReport,
}: {
  state: MathPilotState
  nextAction: ReturnType<typeof chooseNextAction>
  startAction: () => void
  setView: (view: AppView) => void
  homeworkText: string
  setHomeworkText: (value: string) => void
  analyzeHomework: (
    payload: { text: string; imageDataUrl?: string; imageFileName?: string },
    saveRaw?: boolean,
  ) => void | Promise<void>
  homeworkAnalyzing: boolean
  showFormulaRecall: boolean
  onFormulaRecallDone: () => void
  onStartFormulaRecall: () => void
  onWhy: () => void
  setPace: (pace: SessionPace) => void
  sessionPace: SessionPace
  diagnostic?: MathPilotState['diagnostic']
  onStartRepair?: (skillId: string) => void
  onOpenReport?: () => void
}) {
  const paceLabels: Record<SessionPace, string> = {
    short: 'Short',
    normal: 'Normal',
    deep: 'Deep',
    low_energy: 'Low energy',
    high_focus: 'High focus',
    custom: 'Custom',
  }
  const primaryPaceOptions = (['short', 'normal', 'deep', 'low_energy'] as SessionPace[]).map((pace) => ({
    value: pace,
    label: paceLabels[pace],
  }))
  const due = state.reviewQueue.filter((item) => item.due <= new Date().toISOString().slice(0, 10)).length
  const weakCount = Object.values(state.mastery).filter((record) => record.masteryScore < 0.4).length
  const primarySkill = nextAction.skillIds[0] ? state.skills[nextAction.skillIds[0]] : undefined
  const readinessValue = readiness(state)
  const coachConstraint = primarySkill
    ? `${primarySkill.name} is the current constraint.`
    : `${state.currentFocus} calibration is the current constraint.`
  const actionLabel = diagnostic && !diagnostic.completed
    ? 'Resume diagnostic'
    : nextAction.kind === 'quick_repair'
      ? 'Start repair'
      : nextAction.kind === 'mixed_review'
        ? 'Start review'
        : 'Start session'
  const evidenceItems = [
    `${due} review${due === 1 ? '' : 's'} ready`,
    `${weakCount} weak skill${weakCount === 1 ? '' : 's'}`,
    `${readinessValue}% course readiness`,
  ]
  const homeworkSectionRef = useRef<HTMLElement>(null)

  return (
    <div className="page today-page">
      {due > 0 && state.preferences?.notificationsEnabled !== false && (
        <div className="review-nudge" role="status">
          <span>
            <strong>{due}</strong> review{due === 1 ? '' : 's'} ready — retrieval now protects what you learned.
          </span>
          <button type="button" className="secondary" onClick={startAction}>
            Start review
          </button>
        </div>
      )}
      <header className="coach-desk-header">
        <div>
          <p className="eyebrow">{state.profileName ? `Hi, ${state.profileName}` : 'Private calculus desk'}</p>
          <h1>Coach desk</h1>
          <p className="today-subtitle">{coachConstraint} MathPilot will keep the next move small and measurable.</p>
        </div>
      </header>

      <TodayMasteryStrip state={state} onOpenMap={() => setView('map')} />

      <section className="coach-desk" aria-label="Recommended next move">
        <div className="coach-desk-hero coach-primary">
          <p className="eyebrow">Recommended next move</p>
          <h2>{nextAction.title}</h2>
          <p className="coach-reason">{nextAction.reason}</p>
          <div className="coach-actions">
            <Button variant="primary" size="lg" icon={<Play size={18} />} onClick={startAction}>
              {actionLabel}
            </Button>
            <Button variant="ghost" size="lg" icon={<Eye size={18} />} onClick={onWhy}>
              Why this now
            </Button>
          </div>
        </div>
      </section>

      <section className="session-setup-row" aria-label="Session setup">
        <SegmentedControl
          label="Session pace"
          value={sessionPace}
          options={primaryPaceOptions}
          onChange={setPace}
        />
        <div className="coach-evidence" aria-label="Why this now">
          <p className="eyebrow">Why this now</p>
          {evidenceItems.map((item) => (
            <span key={item}>
              <ShieldCheck size={14} />
              {item}
            </span>
          ))}
        </div>
      </section>

      <nav className="desk-tools-list" aria-label="Desk tools">
        <button
          type="button"
          className="desk-tool-row"
          onClick={() => homeworkSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })}
        >
          <FolderOpen size={18} aria-hidden />
          <div className="desk-tool-row-text">
            <strong>Homework</strong>
            <span>Paste, drop, or type work to turn mistakes into repair.</span>
          </div>
          <ChevronRight size={18} className="desk-tool-row-chevron" aria-hidden />
        </button>
        <button type="button" className="desk-tool-row" onClick={() => setView('map')}>
          <Map size={18} aria-hidden />
          <div className="desk-tool-row-text">
            <strong>Map evidence</strong>
            <span>See where your knowledge map needs attention.</span>
          </div>
          <ChevronRight size={18} className="desk-tool-row-chevron" aria-hidden />
        </button>
        <button type="button" className="desk-tool-row" onClick={onStartFormulaRecall}>
          <Clock3 size={18} aria-hidden />
          <div className="desk-tool-row-text">
            <strong>Recall</strong>
            <span>Use formula recall when a rule is blocking the session.</span>
          </div>
          <ChevronRight size={18} className="desk-tool-row-chevron" aria-hidden />
        </button>
      </nav>

      <section className="coach-secondary-stack" aria-label="Desk tools" ref={homeworkSectionRef}>
        <HomeworkUpload
          text={homeworkText}
          onTextChange={setHomeworkText}
          onAnalyze={(p, saveRaw) => void analyzeHomework(p, saveRaw)}
          compact
        />
        {homeworkAnalyzing && <p className="eyebrow">Analyzing homework...</p>}
        {state.homeworkAnalyses[0] && (
          <HomeworkResultCard analysis={state.homeworkAnalyses[0]} onStartRepair={onStartRepair} />
        )}
        {showFormulaRecall && (
          <FormulaRecallPanel state={state} onComplete={() => onFormulaRecallDone()} />
        )}
      </section>

      {diagnostic?.completed && diagnostic.summary && (
        <p className="diagnostic-summary panel" style={{ marginBottom: 16 }}>
          <strong>Map snapshot:</strong> strong in {diagnostic.summary.strong.slice(0, 3).join(', ') || '—'} · focus{' '}
          {diagnostic.summary.weak.slice(0, 3).join(', ') || '—'}
        </p>
      )}

      <details className="today-more">
        <summary>Adjust and inspect</summary>
        <div className="today-more-body">
          <button type="button" className="secondary" onClick={() => setView('map')}>
            <Map size={18} />
            Open knowledge map
          </button>

          <details className="contextual-entry">
            <summary>Area readiness</summary>
            <div className="chip-row">
              {Object.keys(groupByArea(state))
                .slice(0, 8)
                .map((area) => (
                  <span className="area-chip" key={area}>
                    {area}
                    <strong>{areaReadiness(state, area)}%</strong>
                  </span>
                ))}
            </div>
          </details>

          <details className="contextual-entry">
            <summary>Adjust pace</summary>
            <div className="segmented" style={{ marginTop: 8 }}>
              {(Object.keys(paceLabels) as SessionPace[])
                .filter((key) => key !== 'custom')
                .map((pace) => (
                  <button
                    key={pace}
                    type="button"
                    className={sessionPace === pace ? 'active' : ''}
                    onClick={() => setPace(pace)}
                  >
                    {paceLabels[pace]}
                  </button>
                ))}
            </div>
          </details>

          {!showFormulaRecall && (
            <details className="contextual-entry">
              <summary>Formula recall (optional)</summary>
              <button type="button" className="secondary" style={{ marginTop: 8 }} onClick={onStartFormulaRecall}>
                Start formula recall
              </button>
            </details>
          )}

          {state.studyPlan && (
            <details className="contextual-entry" open>
              <summary>Study plan</summary>
              <p className="muted">{state.studyPlan.summary}</p>
              <ul className="signal-list">
                {state.studyPlan.steps.slice(0, 4).map((step) => (
                  <li key={step.skillId}>
                    <span>
                      {step.skillName}: {step.action}
                    </span>
                  </li>
                ))}
              </ul>
              {onOpenReport && (
                <button type="button" className="secondary" style={{ marginTop: 8 }} onClick={onOpenReport}>
                  Open progress report
                </button>
              )}
            </details>
          )}

          <details className="contextual-entry">
            <summary>Recent signal</summary>
            <section style={{ marginTop: 12 }}>
              <div className="panel">
                <div className="section-title compact">
                  <h2>Recent signal</h2>
                </div>
                <ul className="signal-list">
                  {state.attempts.slice(0, 4).map((attempt) => (
                    <li key={attempt.id}>
                      <CheckCircle2 size={17} />
                      <span>
                        {state.problems[attempt.problemId]?.title ?? attempt.problemId}:{' '}
                        {attempt.correct ? 'accepted' : 'needs repair'}
                      </span>
                    </li>
                  ))}
                  {!state.attempts.length && (
                    <li>
                      <ClipboardList size={17} />
                      <span>No attempts yet. Start the diagnostic to create the first map.</span>
                    </li>
                  )}
                </ul>
              </div>
            </section>
          </details>
        </div>
      </details>

      {state.advancedMode && (
        <>
          <section className="today-advanced-grid">
            <MistakePatternsPanel state={state} />
            <ResourceEffectivenessPanel state={state} />
          </section>
          <section className="panel" style={{ marginTop: 16 }}>
            <div className="section-title compact">
              <h2>Advanced overview</h2>
              <p className="muted">Weak skills, upcoming review, and recent mistakes.</p>
            </div>
            <ul className="signal-list">
              {Object.values(state.mastery)
                .filter((m) => m.masteryScore < 0.45)
                .slice(0, 5)
                .map((m) => (
                  <li key={m.skillId}>
                    <span>
                      {state.skills[m.skillId]?.name}: {Math.round(m.masteryScore * 100)}% ({m.masteryState})
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}

export function ActivityView({
  problem,
  state,
  answer,
  setAnswer,
  feedback,
  feedbackTone,
  feedbackNextSteps,
  hintCount,
  setHintCount,
  submitAnswer,
  generatePacket,
  requestHelp,
  codexBusy,
  mathFieldRef,
  startAction,
  diagnosticProgress,
  quickRepair,
  sessionPhase,
  confidence,
  setConfidence,
  showSteps,
  setShowSteps,
  steps,
  setSteps,
  lostOpen,
  setLostOpen,
  onVideoPostCheck,
  onVideoInterrupt,
  homeworkText,
  setHomeworkText,
  analyzeHomework,
  homeworkAnalyzing,
}: {
  problem?: Problem
  state: MathPilotState
  answer: string
  setAnswer: (value: string) => void
  feedback: string
  feedbackTone?: 'correct' | 'almost' | 'wrong' | null
  feedbackNextSteps?: string[]
  hintCount: number
  setHintCount: (value: number) => void
  submitAnswer: () => void
  generatePacket: (task: string) => void
  requestHelp: (task: string) => void
  codexBusy: boolean
  mathFieldRef: RefObject<MathfieldElement | null>
  startAction: (problemId?: string) => void
  diagnosticProgress?: string
  quickRepair?: MathPilotState['quickRepair']
  sessionPhase?: ReturnType<typeof currentSessionPhase>
  confidence: number
  setConfidence: (n: number) => void
  showSteps: boolean
  setShowSteps: (v: boolean) => void
  steps: string[]
  setSteps: (s: string[]) => void
  lostOpen: boolean
  setLostOpen: (v: boolean) => void
  onVideoPostCheck: (passed: boolean) => void
  onVideoInterrupt?: (reason: string) => void
  homeworkText?: string
  setHomeworkText?: (value: string) => void
  analyzeHomework?: (
    payload: { text: string; imageDataUrl?: string; imageFileName?: string },
    saveRaw?: boolean,
  ) => void | Promise<void>
  homeworkAnalyzing?: boolean
}) {
  const [rawInput, setRawInput] = useState(false)
  const insertSymbol = (symbol: string) => {
    const field = mathFieldRef.current
    if (field?.executeCommand) {
      field.executeCommand(['insert', symbol])
      setAnswer(field.value)
    } else {
      setAnswer(`${answer}${symbol}`)
    }
  }
  if (quickRepair?.phase === 'explain') {
    const skill = state.skills[quickRepair.skillId]
    const explain = skill ? quickRepairExplanation(skill) : { summary: '', steps: [] }
    return (
      <div className="page activity-page">
        <SessionChrome state={state} />
        <header className="topbar">
          <div>
            <p className="eyebrow">Quick repair</p>
            <h1>{skill?.name}</h1>
            <p className="diagnostic-progress">{repairProgress(quickRepair)}</p>
          </div>
        </header>
        <section className="panel repair-explain">
          <p className="lead">{explain.summary}</p>
          <ol className="repair-steps">
            {explain.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <button type="button" className="primary large" onClick={submitAnswer}>
            Continue to worked examples
          </button>
        </section>
      </div>
    )
  }

  if (!problem) {
    return (
      <div className="empty-state">
        <EmptyStateIllustration variant="activity" />
        <h1>Ready when you are</h1>
        <p className="muted">Tap Continue on Today to pick up where MathPilot left off.</p>
        <button type="button" className="primary large" onClick={() => startAction()}>
          Start recommended work
        </button>
      </div>
    )
  }

  const skill = state.skills[problem.skillIds[0]]
  const hintLabels = ['Hint', 'Stronger hint', 'Partial solution', 'Full explanation']
  const mathToolGroups = [
    {
      label: 'Core',
      symbols: [
        { label: '^', value: '^' },
        { label: '√', value: '\\sqrt{}' },
        { label: 'a/b', value: '\\frac{}{}' },
        { label: '|x|', value: '|x|' },
      ],
    },
    {
      label: 'Calculus',
      symbols: [
        { label: 'lim', value: '\\lim_{x\\to }' },
        { label: 'Σ', value: '\\sum_{n=1}^{\\infty}' },
        { label: '∫', value: '\\int' },
        { label: 'd/dx', value: '\\frac{d}{dx}' },
      ],
    },
    {
      label: 'Trig',
      symbols: [
        { label: 'sin', value: '\\sin' },
        { label: 'cos', value: '\\cos' },
        { label: 'tan', value: '\\tan' },
        { label: 'sec', value: '\\sec' },
      ],
    },
    {
      label: 'Greek',
      symbols: [
        { label: 'π', value: '\\pi' },
        { label: 'θ', value: '\\theta' },
        { label: 'Δ', value: '\\Delta' },
        { label: 'λ', value: '\\lambda' },
      ],
    },
    {
      label: 'Linear',
      symbols: [
        { label: 'vec', value: '\\vec{v}' },
        { label: 'matrix', value: '\\begin{pmatrix}a\\\\b\\end{pmatrix}' },
        { label: '·', value: '\\cdot' },
        { label: '×', value: '\\times' },
      ],
    },
    {
      label: 'Piecewise',
      symbols: [{ label: 'cases', value: '\\begin{cases} & \\\\ & \\end{cases}' }],
    },
  ]
  const signChart = signChartForSkill(problem.skillIds[0])
  const isDiagnostic = Boolean(diagnosticProgress && state.diagnostic && !state.diagnostic.completed)
  const inspectorTitle = feedback
    ? feedbackTone === 'correct'
      ? 'Keep moving'
      : 'Next move'
    : isDiagnostic
      ? 'Diagnostic focus'
      : 'Teaching inspector'
  const inspectorBody = feedback
    ? isDiagnostic
      ? 'Answer recorded. Keep moving so the map can calibrate.'
      : feedback
    : isDiagnostic
      ? 'Work cleanly. Diagnostics only need enough feedback to calibrate the map.'
      : 'Use a hint if you are blocked. If the setup feels unsteady, mark that you are lost.'
  const graphExpression = primaryGraphExpression(problem)
  const showGraph = Boolean(
    graphExpression &&
      problem.skillIds.some(
        (id) => id.includes('graph') || id.includes('derivative') || id.includes('optimization') || id.includes('area'),
      ),
  )
  const showWorkRequired = requiresShowWork(state, problem)

  const readOnly =
    quickRepair?.phase === 'example_1' ||
    quickRepair?.phase === 'example_2' ||
    Boolean(state.readOnlyExample)
  const videoResource =
    sessionPhase === 'resource_watch' && problem.skillIds[0]
      ? topResourcesForSkill(state, problem.skillIds[0])[0]
      : undefined

  return (
    <div className="page activity-page">
      <SessionChrome state={state} diagnosticProgress={diagnosticProgress} />
      <header className="topbar activity-topbar">
        <div>
          <p className="eyebrow">
            {quickRepair ? 'Quick repair' : sessionPhase ? sessionPhaseLabel(sessionPhase) : problem.mode.replace('_', ' ')}
          </p>
          <h1>{skill?.name ?? problem.title}</h1>
          {quickRepair && <p className="diagnostic-progress">{repairProgress(quickRepair)}</p>}
        </div>
        <div className="status-pill">{problem.title}</div>
      </header>

      {sessionPhase === 'resource_watch' && videoResource && (
        <VideoEmbed
          resource={videoResource}
          activeMode={state.preferences?.activeVideoMode ?? 'sometimes'}
          onInterrupt={(reason) => onVideoInterrupt?.(reason)}
          onCompletePostCheck={onVideoPostCheck}
        />
      )}

      {readOnly && (
        <section className="panel worked-example-readonly">
          <p className="eyebrow">Worked example — read only</p>
          <ol>
            {(problem.workedExample ?? []).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
          <button type="button" className="primary" onClick={submitAnswer}>
            Continue to practice
          </button>
        </section>
      )}

      {!readOnly && (
      <section
        key={problem.id}
        className="problem-layout activity-studio problem-enter"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || !event.shiftKey)) {
            event.preventDefault()
            submitAnswer()
          }
        }}
      >
        <div className="problem-main">
          <section className="problem-card" aria-label="Current problem">
            <div className="problem-card-head">
              <p className="meta-label">Problem</p>
              <span>{problem.answerType === 'choice' ? 'Choose' : problem.answerType === 'text' ? 'Explain' : 'Compute'}</span>
            </div>
            <p className="prompt">{problem.prompt}</p>
          </section>
          {showWorkRequired && !showSteps && (
            <p className="eyebrow show-work-note">Show-your-work recommended — add steps before checking.</p>
          )}
          {problem.answerType === 'expression' && (
            <>
              <div className="math-input-head">
                <div>
                  <strong>Answer</strong>
                  <span>{rawInput ? 'Raw LaTeX mode' : 'Math field mode'}</span>
                </div>
                <button type="button" className="secondary small" onClick={() => setRawInput(!rawInput)}>
                  {rawInput ? 'Use math field' : 'Raw LaTeX'}
                </button>
              </div>
              {!rawInput && (
                <div className="math-toolbar compact" aria-label="Math input helpers">
                  {mathToolGroups
                    .filter((group) => group.label === 'Core' || group.label === 'Calculus')
                    .map((group) => (
                    <div className="math-tool-group" key={group.label}>
                      <span>{group.label}</span>
                      <div>
                        {group.symbols.map((symbol) => (
                          <button key={symbol.value} type="button" className="secondary" onClick={() => insertSymbol(symbol.value)}>
                            {symbol.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    ))}
                  <details className="symbol-drawer">
                    <summary>More symbols</summary>
                    <div className="symbol-drawer-groups">
                      {mathToolGroups
                        .filter(
                          (group) =>
                            group.label === 'Trig' ||
                            group.label === 'Greek' ||
                            group.label === 'Linear' ||
                            group.label === 'Piecewise',
                        )
                        .map((group) => (
                          <div className="math-tool-group" key={group.label}>
                            <span>{group.label}</span>
                            <div>
                              {group.symbols.map((symbol) => (
                                <button
                                  key={symbol.value}
                                  type="button"
                                  className="secondary"
                                  onClick={() => insertSymbol(symbol.value)}
                                >
                                  {symbol.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </details>
                </div>
              )}
              {rawInput ? (
                <textarea
                  className="conceptual-input latex-input"
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Type raw LaTeX, for example \\frac{x^2}{2}+C"
                  rows={3}
                />
              ) : (
                <MathInput ref={mathFieldRef} value={answer} onChange={setAnswer} placeholder="Type your answer" />
              )}
            </>
          )}
          {problem.answerType === 'text' && (
            <textarea
              className="conceptual-input"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Type your explanation or method name…"
              rows={3}
            />
          )}
          {problem.answerType === 'choice' && problem.choices && (
            <div className="choice-grid">
              {problem.choices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  className={`secondary ${answer === choice ? 'active' : ''}`}
                  onClick={() => setAnswer(choice)}
                >
                  {choice}
                </button>
              ))}
            </div>
          )}
          {showSteps &&
            steps.map((step, index) => (
              <MathInput
                key={`step-${index}`}
                value={step}
                onChange={(latex) => {
                  const next = [...steps]
                  next[index] = latex
                  setSteps(next)
                }}
                placeholder={`Step ${index + 1}`}
              />
            ))}
          {(state.diagnostic || problem.mode === 'mixed_review') && (
            <div className="confidence-row" role="radiogroup" aria-label="Confidence">
              <span>Confidence</span>
              {[
                [1, 'Guess'],
                [2, 'Low'],
                [3, 'Unsure'],
                [4, 'Good'],
                [5, 'Certain'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={confidence === value}
                  className={`confidence-chip ${confidence === value ? 'active' : ''}`}
                  onClick={() => setConfidence(Number(value))}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <section className="answer-dock" aria-label="Answer actions">
            <div className="activity-primary-actions">
              <Button variant="primary" onClick={submitAnswer}>
                Check answer
              </Button>
              <Button variant="secondary" icon={<HelpCircle size={18} />} onClick={() => setHintCount(hintCount + 1)}>
                {hintLabels[Math.min(hintCount, hintLabels.length - 1)]}
              </Button>
              <Button variant="secondary" onClick={() => setLostOpen(true)}>
                I&apos;m lost
              </Button>
            </div>
          </section>
          {lostOpen && (
            <div className="lost-panel panel">
              <p className="eyebrow">What feels stuck?</p>
              <p className="muted">Pick one — MathPilot will suggest a method, not a full solution.</p>
              <div className="lost-grid">
                {[
                  "I don't know what method to use",
                  "I don't know the first step",
                  "I made progress but got stuck",
                  "I don't understand the concept",
                  'My answer looks right but was marked wrong',
                  'I need a similar example',
                  'I forgot a formula',
                ].map((label) => (
                  <button
                    key={label}
                    type="button"
                    className="secondary lost-chip"
                    onClick={() => {
                      if (label === 'I need a similar example') {
                        startAction(problemForSkill(state, problem.skillIds[0], problem.mode))
                        setLostOpen(false)
                        return
                      }
                      void requestHelp(`I'm lost: ${label}`)
                      setLostOpen(false)
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <aside className="teaching-inspector" role="complementary" aria-label="Teaching inspector">
          <div
            className={`inspector-card ${
              feedbackTone === 'correct' ? 'inspector-correct' : feedbackTone === 'wrong' ? 'inspector-wrong' : 'inspector-almost'
            }`}
          >
            <p className="meta-label">Teaching inspector</p>
            <h3>{inspectorTitle}</h3>
            <p>{inspectorBody}</p>
            <section className="inspector-next">
              <h4>Try next</h4>
              <ul>
                {(feedbackNextSteps?.length ? feedbackNextSteps : ['Recheck the setup before doing more algebra.']).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </section>
            <div className="inspector-actions">
              <Button variant="ghost" size="sm" onClick={() => setShowSteps(!showSteps)}>
                {showSteps ? 'Hide steps' : 'Add steps'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => requestHelp('check my setup for this problem')} disabled={isDiagnostic}>
                Check setup
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Sparkles size={16} />}
                onClick={() => requestHelp('explain this problem')}
                disabled={codexBusy || isDiagnostic}
              >
                {codexBusy ? 'Getting help...' : 'Ask Codex'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => startAction(problemForSkill(state, problem.skillIds[0], problem.mode))}
              >
                Try one like this
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => requestHelp('build a repair step for this mistake')}
                disabled={isDiagnostic}
              >
                Build repair step
              </Button>
              {state.developerModeEnabled && (
                <Button variant="ghost" size="sm" onClick={() => generatePacket('explain current problem attempt')}>
                  Prompt packet
                </Button>
              )}
            </div>
            {analyzeHomework && setHomeworkText && (
              <details className="inspector-upload">
                <summary>Upload work photo</summary>
                {homeworkAnalyzing && <p className="eyebrow">Analyzing homework...</p>}
                <HomeworkUpload
                  text={homeworkText ?? ''}
                  onTextChange={setHomeworkText}
                  onAnalyze={(p, saveRaw) => void analyzeHomework(p, saveRaw)}
                  compact
                />
              </details>
            )}
          </div>
          {feedbackTone !== 'correct' && (
            <SimilarExamplePanel
              problem={problem}
              onTrySimilar={() => startAction(problemForSkill(state, problem.skillIds[0], problem.mode))}
            />
          )}
          {showGraph && <DesmosEmbed expression={graphExpression} />}
          {signChart && (
            <div className="mini-panel">
              <h3>Sign chart</h3>
              <SignChart intervals={signChart.intervals} testPoint={signChart.testPoint} />
            </div>
          )}
        </aside>
      </section>
      )}
    </div>
  )
}

export function KnowledgeMap({
  state,
  groups,
  startAction,
  onSkillSelect,
  expandedAreas,
  setExpandedAreas,
  highlightSkillIds = [],
  viewMode = 'wheel',
  onToggleView,
}: {
  state: MathPilotState
  groups: ReturnType<typeof groupByArea>
  startAction: (problemId?: string) => void
  onSkillSelect?: (skillId: string) => void
  expandedAreas: Record<string, boolean>
  setExpandedAreas: (v: Record<string, boolean>) => void
  highlightSkillIds?: string[]
  viewMode?: 'wheel' | 'list' | 'tree'
  onToggleView?: () => void
}) {
  const [filter, setFilter] = useState('')
  const areaGroups = groups
  const weakestArea = Object.keys(areaGroups)
    .map((area) => ({ area, score: areaReadiness(state, area) }))
    .sort((a, b) => a.score - b.score)[0]
  const weakestSkill = Object.values(state.skills)
    .filter((skill) => state.mastery[skill.id]?.masteryScore < 0.45)
    .sort((a, b) => (state.mastery[a.id]?.masteryScore ?? 0) - (state.mastery[b.id]?.masteryScore ?? 0))[0]
  const handleSkill = (id: string) => (onSkillSelect ? onSkillSelect(id) : startAction(problemForSkill(state, id)))
  const needle = filter.trim().toLowerCase()
  const filteredGroups = Object.fromEntries(
    Object.entries(groups).map(([area, records]) => [
      area,
      needle
        ? records.filter(
            (r) =>
              state.skills[r.skill.id]?.name.toLowerCase().includes(needle) || r.skill.id.includes(needle),
          ).sort((a, b) => a.mastery.masteryScore - b.mastery.masteryScore)
        : [...records].sort((a, b) => a.mastery.masteryScore - b.mastery.masteryScore),
    ]),
  )
  const viewLabel =
    viewMode === 'wheel' ? 'List view' : viewMode === 'list' ? 'Tree view' : 'Wheel view'

  return (
    <div className="page map-page">
      <header className="topbar">
        <div>
          <p className="eyebrow">Knowledge map</p>
          <h1>{state.currentFocus}</h1>
          <input
            className="map-filter"
            placeholder="Filter skills…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter skills"
          />
        </div>
        <div className="status-pill">
          Readiness {readiness(state)}%
          {onToggleView && (
            <button type="button" className="ghost" style={{ marginLeft: 8 }} onClick={onToggleView}>
              {viewLabel}
            </button>
          )}
        </div>
      </header>
      <section className="map-evidence" aria-label="Recommendation evidence">
        <div>
          <p className="eyebrow">Recommendation evidence</p>
          <h2>{weakestSkill ? weakestSkill.name : 'Map calibration'}</h2>
          <p>
            {weakestArea
              ? `${weakestArea.area} is the lowest-readiness area at ${weakestArea.score}%.`
              : 'Complete a session to sharpen the map.'}
          </p>
        </div>
        {weakestSkill && <MasteryBadge state={state.mastery[weakestSkill.id]?.masteryState ?? 'Unknown'} />}
      </section>
      {viewMode === 'wheel' && (
        <KnowledgeMapWheel
          state={state}
          groups={filteredGroups}
          highlightSkillIds={highlightSkillIds}
          onSkillSelect={handleSkill}
        />
      )}
      {viewMode === 'tree' && (
        <PrerequisiteTree
          state={state}
          groups={filteredGroups}
          onSkillSelect={handleSkill}
          highlightSkillIds={highlightSkillIds}
          filter={filter}
        />
      )}
      {viewMode === 'list' && (
      <div className="map-wheel">
        {Object.entries(filteredGroups).map(([area, records]) => {
          const average = areaReadiness(state, area)
          const open = expandedAreas[area] ?? true
          return (
            <section className="map-section" key={area}>
              <div
                className="map-section-head"
                onClick={() => setExpandedAreas({ ...expandedAreas, [area]: !open })}
                onKeyDown={(e) => e.key === 'Enter' && setExpandedAreas({ ...expandedAreas, [area]: !open })}
                role="button"
                tabIndex={0}
              >
                <h2>{area}</h2>
                <span>{average}%</span>
              </div>
              {open &&
                records.map(({ skill, mastery }) => (
                  <button
                    className={`skill-row ${mastery.masteryScore < 0.4 ? 'weak' : ''} ${highlightSkillIds.includes(skill.id) ? 'weak' : ''}`}
                    key={skill.id}
                    onClick={() => handleSkill(skill.id)}
                  >
                    <span>{skill.name}</span>
                    <MasteryBadge state={mastery.masteryState} />
                  </button>
                ))}
            </section>
          )
        })}
      </div>
      )}
      <div className="map-legend" aria-label="Mastery legend">
        {(['Unknown', 'Weak', 'Learning', 'Developing', 'Solid', 'Mastered', 'Decayed'] as const).map((stateName) => (
          <MasteryBadge key={stateName} state={stateName} />
        ))}
      </div>
    </div>
  )
}

export function Resources({
  state,
  update,
}: {
  state: MathPilotState
  update: (state: MathPilotState) => void
}) {
  const [policy, setPolicy] = useState<string>('')
  const [resources, setResources] = useState<MathPilotState['resources'][string][]>([])
  useEffect(() => {
    void import('../domain/configLoader').then((m) =>
      m.loadSourcesConfig().then((c) => {
        setPolicy(c.policy)
        void listTrustedResources(state).then(setResources)
      }),
    )
  }, [state])
  return (
    <div className="page">
      <header className="topbar">
        <div>
          <p className="eyebrow">Resources</p>
          <h1>Trusted sources</h1>
          {policy && <p className="muted">{policy}</p>}
        </div>
        <div className="status-pill">
          <Search size={17} />
          {resources.length} trusted · ranked by outcome
        </div>
      </header>
      {resources.length === 0 && (
        <section className="resource-empty" aria-label="No resources">
          <BookOpen size={22} />
          <div>
            <h2>No ranked resources yet</h2>
            <p>Start a session or repair a skill. MathPilot will rank resources when they are useful for the current blocker.</p>
          </div>
        </section>
      )}
      <div className="resource-list">
        {resources.map((resource) => {
          const linkedSkills = skillNamesForResource(state, resource)
          return (
          <div className="resource-row" key={resource.id}>
            <a href={resource.url} target="_blank" rel="noreferrer" className="resource-link">
              <BookOpen size={20} />
              <span>
                <strong>{resource.title}</strong>
                <small>
                  {resource.source} · {resource.duration} · effectiveness {Math.round(resource.effectivenessScore * 100)}%
                  {linkedSkills.length > 0 && ` · ${linkedSkills.slice(0, 3).join(', ')}`}
                </small>
              </span>
            </a>
            <div className="resource-helpfulness">
              <span className="muted">Helpful?</span>
              <button
                type="button"
                className="ghost small"
                onClick={() => update(recordResourceHelpfulness(state, resource.id, true))}
              >
                Yes
              </button>
              <button
                type="button"
                className="ghost small"
                onClick={() => update(recordResourceHelpfulness(state, resource.id, false))}
              >
                No
              </button>
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}

export function PrerequisiteModal({
  gate,
  onRepair,
  onTestOut,
  onOverride,
  onClose,
}: {
  gate: ReturnType<typeof checkPrerequisiteGate>
  onRepair: () => void
  onTestOut: () => void
  onOverride: () => void
  onClose: () => void
}) {
  if (!gate.blocked) return null
  return (
    <Modal title="Strengthen the foundation first" onClose={onClose}>
      <p className="eyebrow">Before you continue</p>
      <p className="lead">
        <strong>{gate.targetSkillName}</strong> builds on <strong>{gate.weakSkillName}</strong>. Your map shows{' '}
        {gate.weakSkillName} is not solid yet — pushing ahead usually means harder problems and slower progress.
      </p>
      <p className="muted">A 10–15 minute quick repair now will make the next topic feel much smoother.</p>
      <div className="action-row">
        <button type="button" className="primary" onClick={onRepair}>
          Start quick repair
        </button>
        <button type="button" className="secondary" onClick={onTestOut}>
          Test-out quiz
        </button>
        <button type="button" className="ghost" onClick={onOverride}>
          Continue anyway
        </button>
      </div>
    </Modal>
  )
}

export function SettingsView({
  state,
  update,
  chooseFocus,
  reset,
  openDeveloper,
  codexPaste,
  setCodexPaste,
  onApplyCodexPaste,
}: {
  state: MathPilotState
  update: (state: MathPilotState) => void
  chooseFocus: (focus: CourseFocus) => void
  reset: () => void
  openDeveloper: () => void
  codexPaste: string
  setCodexPaste: (v: string) => void
  onApplyCodexPaste: () => void
}) {
  const [resetConfirm, setResetConfirm] = useState('')
  return (
    <div className="page">
      <header className="topbar">
        <div>
          <p className="eyebrow">Local profile</p>
          <h1>Settings</h1>
        </div>
      </header>
      <section className="settings-grid">
        <div className="settings-group">
          <h2>Profile</h2>
          <div className="settings-row">
            <label htmlFor="profile-name">Name</label>
            <input
              id="profile-name"
              type="text"
              value={state.profileName}
              onChange={(e) => update({ ...state, profileName: e.target.value })}
            />
          </div>
        </div>

        <div className="settings-group">
          <h2>Preferences</h2>
          <div className="settings-row">
            <label htmlFor="tone-select">Tone</label>
            <select
              id="tone-select"
              value={state.preferences?.tone ?? 'warm'}
              onChange={(e) =>
                update({
                  ...state,
                  preferences: {
                    tone: e.target.value as 'direct' | 'warm',
                    gamificationLevel: state.preferences?.gamificationLevel ?? 'minimal',
                    notificationsEnabled: state.preferences?.notificationsEnabled ?? false,
                    reportsMode: state.preferences?.reportsMode ?? 'on_demand_only',
                    activeVideoMode: state.preferences?.activeVideoMode ?? 'sometimes',
                    theme: state.preferences?.theme ?? 'system',
                  },
                })
              }
            >
              <option value="warm">Warm</option>
              <option value="direct">Direct</option>
            </select>
          </div>
          <div className="settings-row">
            <label htmlFor="gamification-select">Gamification</label>
            <select
              id="gamification-select"
              value={state.preferences?.gamificationLevel ?? 'minimal'}
              onChange={(e) =>
                update({
                  ...state,
                  preferences: {
                    tone: state.preferences?.tone ?? 'warm',
                    gamificationLevel: e.target.value as 'minimal' | 'light',
                    notificationsEnabled: state.preferences?.notificationsEnabled ?? false,
                    reportsMode: state.preferences?.reportsMode ?? 'on_demand_only',
                    activeVideoMode: state.preferences?.activeVideoMode ?? 'sometimes',
                    theme: state.preferences?.theme ?? 'system',
                  },
                })
              }
            >
              <option value="minimal">Minimal</option>
              <option value="light">Light</option>
            </select>
          </div>
          <div className="settings-row">
            <label htmlFor="active-video-select">Active video</label>
            <select
              id="active-video-select"
              value={state.preferences?.activeVideoMode ?? 'sometimes'}
              onChange={(e) =>
                update({
                  ...state,
                  preferences: {
                    tone: state.preferences?.tone ?? 'warm',
                    gamificationLevel: state.preferences?.gamificationLevel ?? 'minimal',
                    notificationsEnabled: state.preferences?.notificationsEnabled ?? false,
                    reportsMode: state.preferences?.reportsMode ?? 'on_demand_only',
                    theme: state.preferences?.theme ?? 'system',
                    activeVideoMode: e.target.value as 'never' | 'sometimes' | 'active',
                  },
                })
              }
            >
              <option value="never">Never</option>
              <option value="sometimes">Sometimes</option>
              <option value="active">Active</option>
            </select>
          </div>
          <div className="settings-row">
            <label htmlFor="theme-select">Theme</label>
            <select
              id="theme-select"
              value={state.preferences?.theme ?? 'system'}
              onChange={(e) =>
                update({
                  ...state,
                  preferences: {
                    tone: state.preferences?.tone ?? 'warm',
                    gamificationLevel: state.preferences?.gamificationLevel ?? 'minimal',
                    notificationsEnabled: state.preferences?.notificationsEnabled ?? false,
                    reportsMode: state.preferences?.reportsMode ?? 'on_demand_only',
                    activeVideoMode: state.preferences?.activeVideoMode ?? 'sometimes',
                    theme: e.target.value as 'system' | 'light' | 'dark',
                  },
                })
              }
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div className="settings-row">
            <label htmlFor="reports-select">Reports</label>
            <select
              id="reports-select"
              value={state.preferences?.reportsMode ?? 'on_demand_only'}
              onChange={(e) =>
                update({
                  ...state,
                  preferences: {
                    tone: state.preferences?.tone ?? 'warm',
                    gamificationLevel: state.preferences?.gamificationLevel ?? 'minimal',
                    notificationsEnabled: state.preferences?.notificationsEnabled ?? false,
                    reportsMode: e.target.value as 'on_demand_only' | 'weekly',
                    activeVideoMode: state.preferences?.activeVideoMode ?? 'sometimes',
                    theme: state.preferences?.theme ?? 'system',
                  },
                })
              }
            >
              <option value="on_demand_only">On demand only</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div className="settings-row">
            <span>Study reminders</span>
            <label className="toggle">
              <input
                type="checkbox"
                checked={state.preferences?.notificationsEnabled ?? false}
                onChange={(event) =>
                  update({
                    ...state,
                    preferences: {
                      tone: state.preferences?.tone ?? 'warm',
                      gamificationLevel: state.preferences?.gamificationLevel ?? 'minimal',
                      notificationsEnabled: event.target.checked,
                      reportsMode: state.preferences?.reportsMode ?? 'on_demand_only',
                      activeVideoMode: state.preferences?.activeVideoMode ?? 'sometimes',
                      theme: state.preferences?.theme ?? 'system',
                    },
                  })
                }
              />
            </label>
          </div>
          <div className="settings-row">
            <span>Syllabus week</span>
            <select
              value={state.syllabus?.currentWeek ?? 1}
              onChange={(e) =>
                update({
                  ...state,
                  syllabus: {
                    ...(state.syllabus ?? { course: state.currentFocus, items: [] }),
                    currentWeek: Number(e.target.value),
                  },
                })
              }
            >
              {Array.from({ length: 8 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  Week {w}
                </option>
              ))}
            </select>
          </div>
          <div className="settings-row settings-row-stack">
            <span>Upload syllabus</span>
            <textarea
              className="syllabus-upload"
              placeholder="Paste syllabus lines (Week 1: Limits, Week 2: Derivatives…)"
              rows={4}
              onBlur={(e) => {
                const text = e.target.value.trim()
                if (text.length > 20) update(applySyllabusUpload(state, text))
              }}
            />
          </div>
          <div className="settings-row">
            <span>Syllabus topics</span>
            <span className="muted">{state.syllabus?.items.length ?? 0} mapped</span>
          </div>
          <div className="settings-row">
            <span>Advanced view</span>
            <label className="toggle">
              <input
                type="checkbox"
                checked={state.advancedMode}
                onChange={(event) => update({ ...state, advancedMode: event.target.checked })}
              />
            </label>
          </div>
        </div>

        <div className="settings-group">
          <h2>Course</h2>
          <div className="settings-row">
            <span>Focus</span>
            <div className="action-row">
              <button type="button" className="secondary" onClick={() => chooseFocus('Calculus 1')}>
                Calculus 1
              </button>
              <button type="button" className="secondary" onClick={() => chooseFocus('Calculus 2')}>
                Calculus 2
              </button>
            </div>
          </div>
        </div>

        <div className="settings-group">
          <h2>Developer</h2>
          <div className="settings-row">
            <span>Tools &amp; logs</span>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                const ok = window.confirm(
                  'Enable Developer mode? This exposes Codex packets, backups, restore controls, and future code-change workflows. Use it only when you want to inspect or change local app internals.',
                )
                if (ok) {
                  update({ ...state, developerModeEnabled: true })
                  openDeveloper()
                }
              }}
            >
              <Code2 size={18} />
              Enable
            </button>
          </div>
          <div className="settings-row" style={{ display: 'block' }}>
            <span>Codex paste-back</span>
            <textarea
              rows={3}
              style={{ width: '100%', marginTop: 8 }}
              value={codexPaste}
              onChange={(e) => setCodexPaste(e.target.value)}
              placeholder="Paste Codex JSON response…"
            />
            <button type="button" className="secondary" style={{ marginTop: 8 }} onClick={onApplyCodexPaste}>
              Apply response
            </button>
          </div>
        </div>

        <div className="settings-group">
          <h2>Data</h2>
          <div className="settings-row" style={{ display: 'block' }}>
            <span>Export or reset local profile</span>
            <input
              style={{ width: '100%', marginTop: 8 }}
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder="Type RESET to confirm wipe"
            />
            <div className="action-row" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  const url = URL.createObjectURL(exportState(state))
                  const link = document.createElement('a')
                  link.href = url
                  link.download = 'mathpilot-export.json'
                  link.click()
                }}
              >
                <Download size={18} />
                Export
              </button>
              <button
                type="button"
                className="danger"
                disabled={resetConfirm !== 'RESET'}
                onClick={() => {
                  reset()
                  setResetConfirm('')
                }}
              >
                <RotateCcw size={18} />
                Reset
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export function DeveloperView({
  state,
  packet,
  generatePacket,
  runMaintenance,
  onGenerateProblem,
  onRestoreBackup,
}: {
  state: MathPilotState
  packet: string
  generatePacket: (task: string) => void
  runMaintenance: () => void
  onGenerateProblem: (skillId: string) => void
  onRestoreBackup?: (payload: string) => void
}) {
  const [backups, setBackups] = useState<string[]>([])

  useEffect(() => {
    void listBackups().then(setBackups)
  }, [state.maintenanceRuns?.length])

  return (
    <div className="page developer-page">
      <header className="topbar">
        <div>
          <p className="eyebrow">Developer mode</p>
          <h1>Logs and AI packets</h1>
        </div>
        <div className="action-row">
          <button className="secondary" onClick={() => generatePacket('maintenance summary and next repair recommendation')}>
            <Sparkles size={18} />
            Create packet
          </button>
          <button className="secondary" onClick={runMaintenance}>
            Run maintenance
          </button>
          <button className="secondary" onClick={() => onGenerateProblem('chain_rule')}>
            Generate test problem
          </button>
        </div>
      </header>
      <section className="two-column">
        <div className="panel">
          <h2>Prompt packet</h2>
          <pre className="packet">{packet || 'No packet drafted yet.'}</pre>
        </div>
        <div className="panel">
          <h2>Backups</h2>
          <ul className="log-list">
            {backups.length === 0 && <li>No backups on disk yet — run maintenance first.</li>}
            {backups.map((file) => (
              <li key={file}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    void restoreBackupPayload(file).then((payload) => {
                      if (payload && onRestoreBackup) onRestoreBackup(payload)
                    })
                  }}
                >
                  Restore {file}
                </button>
              </li>
            ))}
          </ul>
          <h2>Changelog</h2>
          <ul className="log-list">
            {state.changelog.slice(0, 10).map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
          <h2>AI calls</h2>
          <ul className="log-list">
            {state.aiCalls.map((call) => (
              <li key={call.id}>
                {call.createdAt}: {call.task} ({call.status})
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
