import {
  BookOpen,
  CheckCircle2,
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
import { useEffect, useState, type ReactNode, type RefObject } from 'react'
import {
  builtInGraphKindForSkill,
  builtInGraphPropsForProblem,
  graphPresetsForProblem,
  primaryGraphExpression,
} from '../domain/graphPresets'
import { BuiltInGraph } from '../components/BuiltInGraph'
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
import { attemptModeForActivity } from '../domain/activityAttemptMode'
import { requiresShowWork } from '../domain/showWorkPolicy'
import { applySyllabusUpload } from '../domain/syllabusUpload'
import { MistakePatternsPanel } from '../components/MistakePatternsPanel'
import { MasteryDimensionBars } from '../components/MasteryDimensionBars'
import { TodayMasteryStrip } from '../components/TodayMasteryStrip'
import { ResourceEffectivenessPanel } from '../components/ResourceEffectivenessPanel'
import { chooseNextAction } from '../domain/learningEngine'
import { recordResourceHelpfulness } from '../domain/resourceLearning'
import { listTrustedResources, skillNamesForResource } from '../domain/resourceResolver'
import {
  createPromptPacket,
  ensureMemoryLoaded,
  wrapPacketForChatGPT,
  wrapPacketForGemini,
} from '../domain/aiAdapter'
import { loadSkillsForPrompt } from '../domain/skillLoader'
import { exportState } from '../domain/storage'
import { currentSessionPhase, sessionPhaseLabel } from '../domain/dailySessionEngine'
import { checkPrerequisiteGate } from '../domain/sessionEngine'
import type { SessionPace } from '../domain/sessionEngine'
import { quickRepairExplanation, repairProgress } from '../domain/quickRepairEngine'
import { rankResourcesForSkill, searchResources, type ResourceSearchResult } from '@mathpilot/content-engine'
import { energyPaceHint, parseBevelImport } from '../domain/healthIntegrations'
import { markProblemDeprecated } from '../domain/problemBank'
import { groupByArea, problemForSkill, readiness, areaReadiness } from '../lib/mapHelpers'
import { Button, MasteryBadge, Modal, SegmentedControl } from '@mathpilot/ui'
import { CustomPaceModal } from '../components/CustomPaceModal'
import type { CourseFocus, MathPilotState, Problem, ResourceRecord } from '../domain/types'
import type { AppView } from '../app/types'

function shouldShowConfidencePrompts(state: MathPilotState, problem?: Problem): boolean {
  const mode = state.preferences?.confidencePrompts ?? 'review_only'
  if (mode === 'off') return false
  if (state.diagnostic && !state.diagnostic.completed) return true
  if (problem?.mode === 'mixed_review') return true
  if (mode === 'often') return Boolean(problem && problem.mode !== 'resource_watch')
  return false
}

function mergePreferences(
  state: MathPilotState,
  patch: Partial<NonNullable<MathPilotState['preferences']>>,
): MathPilotState['preferences'] {
  return {
    tone: state.preferences?.tone ?? 'warm',
    gamificationLevel: state.preferences?.gamificationLevel ?? 'minimal',
    notificationsEnabled: state.preferences?.notificationsEnabled ?? false,
    activeVideoMode: state.preferences?.activeVideoMode ?? 'sometimes',
    theme: state.preferences?.theme ?? 'system',
    confidencePrompts: state.preferences?.confidencePrompts ?? 'review_only',
    ...patch,
    reportsMode: 'on_demand_only',
  }
}

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
    <button
      type="button"
      className={`nav-button ${active ? 'active' : ''}`}
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
    >
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
  onRefreshCoachInsight,
  coachInsightRefreshing,
  setPace,
  setCustomPace,
  sessionPace,
  diagnostic,
  onStartRepair,
  onOpenReport,
  onSaveWorkedExample,
  onOpenHomework,
  onOpenHistory,
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
  onRefreshCoachInsight?: () => void
  coachInsightRefreshing?: boolean
  setPace: (pace: SessionPace) => void
  setCustomPace: (adjustments: NonNullable<MathPilotState['customPaceAdjustments']>) => void
  sessionPace: SessionPace
  diagnostic?: MathPilotState['diagnostic']
  onStartRepair?: (skillId: string) => void
  onOpenReport?: () => void
  onSaveWorkedExample?: (analysisId: string) => void
  onOpenHomework?: () => void
  onOpenHistory?: () => void
}) {
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [customPaceOpen, setCustomPaceOpen] = useState(false)
  const paceLabels: Record<SessionPace, string> = {
    short: 'Short',
    normal: 'Normal',
    deep: 'Deep',
    low_energy: 'Low energy',
    high_focus: 'High focus',
    custom: 'Custom',
  }
  const primaryPaceOptions = (['short', 'normal', 'deep', 'low_energy', 'custom'] as SessionPace[]).map((pace) => ({
    value: pace,
    label: paceLabels[pace],
  }))

  function handlePaceChange(pace: SessionPace) {
    if (pace === 'custom') {
      setCustomPaceOpen(true)
      return
    }
    setPace(pace)
  }
  const due = state.reviewQueue.filter((item) => item.due <= new Date().toISOString().slice(0, 10)).length
  const weakCount = Object.values(state.mastery).filter((record) => record.masteryScore < 0.4).length
  const primarySkill = nextAction.skillIds[0] ? state.skills[nextAction.skillIds[0]] : undefined
  const readinessValue = readiness(state)
  const narrative =
    state.coachInsight?.narrative ??
    state.studyPlan?.summary ??
    (primarySkill
      ? `${primarySkill.name} is the current constraint.`
      : `${state.currentFocus} calibration is the current constraint.`)
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
  const areaEntries = Object.keys(groupByArea(state)).slice(0, 8)

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
        </div>
      </header>

      <section className="coach-desk" aria-label="Recommended next move">
        <div className="coach-desk-hero coach-primary">
          <p className="eyebrow">Continue</p>
          <h2>{nextAction.title}</h2>
          <p className="coach-reason today-narrative">{narrative}</p>
          <p className="muted coach-reason">{nextAction.reason}</p>
          <div className="coach-actions today-primary-actions">
            <Button
              variant="primary"
              size="lg"
              icon={<Play size={18} />}
              onClick={startAction}
              aria-label={`Continue: ${actionLabel} — ${nextAction.title}`}
              data-testid="today-continue"
            >
              Continue
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={startAction}
              aria-label={`Start: ${actionLabel}`}
              data-testid="today-start"
            >
              {actionLabel}
            </Button>
            <Button variant="ghost" size="lg" icon={<Eye size={18} />} onClick={onWhy}>
              Why this now
            </Button>
            {onRefreshCoachInsight && (
              <Button
                variant="ghost"
                size="lg"
                onClick={onRefreshCoachInsight}
                disabled={coachInsightRefreshing}
                data-testid="refresh-coach-insight"
              >
                {coachInsightRefreshing ? 'Refreshing…' : 'Refresh coach insight'}
              </Button>
            )}
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setAdjustOpen((open) => !open)}
              aria-expanded={adjustOpen}
              data-testid="today-adjust"
            >
              Adjust
            </Button>
            <Button variant="ghost" size="lg" icon={<Map size={18} />} onClick={() => setView('map')}>
              Map
            </Button>
          </div>
          {adjustOpen && (
            <div className="today-adjust-panel" aria-label="Session pace">
              <SegmentedControl
                label="Session pace"
                value={sessionPace}
                options={primaryPaceOptions}
                onChange={handlePaceChange}
              />
              {sessionPace === 'custom' && (
                <button type="button" className="secondary" onClick={() => setCustomPaceOpen(true)}>
                  Edit custom pace settings
                </button>
              )}
              <div className="coach-evidence">
                {evidenceItems.map((item) => (
                  <span key={item}>
                    <ShieldCheck size={14} aria-hidden />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <TodayMasteryStrip state={state} onOpenMap={() => setView('map')} />

      <details className="today-more">
        <summary>More for today</summary>
        <div className="today-more-body">
          {diagnostic?.completed && diagnostic.summary && (
            <p className="diagnostic-summary panel">
              <strong>Map snapshot:</strong> strong in {diagnostic.summary.strong.slice(0, 3).join(', ') || '—'} · focus{' '}
              {diagnostic.summary.weak.slice(0, 3).join(', ') || '—'}
            </p>
          )}
          <button type="button" className="secondary prominent-homework" onClick={onOpenHomework}>
            <FolderOpen size={18} aria-hidden />
            Upload or review homework
          </button>
          {onOpenHistory && (
            <button type="button" className="secondary" onClick={onOpenHistory} data-testid="today-open-history">
              <Search size={18} aria-hidden />
              Attempt history
            </button>
          )}
          <details className="contextual-entry">
            <summary>Homework results</summary>
            <div className="today-collapsed-section">
              {onOpenHomework ? (
                <button type="button" className="secondary" onClick={onOpenHomework}>
                  <FolderOpen size={18} />
                  Open homework upload
                </button>
              ) : (
                <>
                  <HomeworkUpload
                    text={homeworkText}
                    onTextChange={setHomeworkText}
                    onAnalyze={(p, saveRaw) => void analyzeHomework(p, saveRaw)}
                    compact
                  />
                  {homeworkAnalyzing && <p className="eyebrow">Analyzing homework...</p>}
                  {state.homeworkAnalyses[0] && (
                    <HomeworkResultCard
                      analysis={state.homeworkAnalyses[0]}
                      onStartRepair={onStartRepair}
                      onSaveWorkedExample={onSaveWorkedExample}
                    />
                  )}
                </>
              )}
            </div>
          </details>

          <details className="contextual-entry">
            <summary>Formula recall</summary>
            <div className="today-collapsed-section">
              {showFormulaRecall ? (
                <FormulaRecallPanel state={state} onComplete={() => onFormulaRecallDone()} />
              ) : (
                <button type="button" className="secondary" onClick={onStartFormulaRecall}>
                  Start formula recall
                </button>
              )}
            </div>
          </details>

          <details className="contextual-entry">
            <summary>Area readiness</summary>
            <div className="chip-row">
              {areaEntries.map((area) => (
                <span className="area-chip" key={area}>
                  {area}
                  <strong>{areaReadiness(state, area)}%</strong>
                </span>
              ))}
            </div>
          </details>

          <button type="button" className="secondary" onClick={() => setView('map')}>
            <Map size={18} />
            Open knowledge map
          </button>

          <details className="contextual-entry">
            <summary>Adjust pace</summary>
            <div className="segmented" style={{ marginTop: 8 }}>
              {(Object.keys(paceLabels) as SessionPace[])
                .filter((key) => key !== 'high_focus')
                .map((pace) => (
                  <button
                    key={pace}
                    type="button"
                    className={sessionPace === pace ? 'active' : ''}
                    onClick={() => handlePaceChange(pace)}
                  >
                    {paceLabels[pace]}
                  </button>
                ))}
            </div>
          </details>

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
      {customPaceOpen && (
        <CustomPaceModal
          initial={state.customPaceAdjustments}
          onClose={() => setCustomPaceOpen(false)}
          onSave={(adjustments) => {
            setCustomPace(adjustments)
            setCustomPaceOpen(false)
          }}
        />
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
  cancelCodex,
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
  wrongEscalation = 0,
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
  cancelCodex?: () => void
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
  wrongEscalation?: number
}) {
  const [rawInput, setRawInput] = useState(false)
  const [graphOpen, setGraphOpen] = useState(false)
  const [graphPresetIndex, setGraphPresetIndex] = useState(0)
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
        { label: '∫', value: '\\int' },
        { label: 'd/dx', value: '\\frac{d}{dx}' },
        { label: '∞', value: '\\infty' },
      ],
    },
    {
      label: 'Series',
      symbols: [
        { label: 'Σ', value: '\\sum_{n=1}^{\\infty}' },
        { label: 'Σ_k', value: '\\sum_{k=0}^{\\infty}' },
        { label: 'a_n', value: 'a_n' },
        { label: 'S_n', value: 'S_n' },
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
        { label: 'α', value: '\\alpha' },
        { label: 'β', value: '\\beta' },
        { label: 'σ', value: '\\sigma' },
        { label: 'Δ', value: '\\Delta' },
      ],
    },
    {
      label: 'Vectors',
      symbols: [
        { label: 'vec', value: '\\vec{}' },
        { label: '·', value: '\\cdot' },
        { label: '×', value: '\\times' },
        { label: 'matrix', value: '\\begin{pmatrix}a\\\\b\\end{pmatrix}' },
      ],
    },
    {
      label: 'Parametric',
      symbols: [
        { label: 'x(t)', value: 'x\\left(t\\right)' },
        { label: 'y(t)', value: 'y\\left(t\\right)' },
        { label: 'dy/dx', value: '\\frac{dy/dt}{dx/dt}' },
        { label: 'dt', value: '\\,dt' },
      ],
    },
    {
      label: 'Piecewise',
      symbols: [
        { label: 'cases', value: '\\begin{cases} & \\\\ & \\end{cases}' },
        { label: 'for', value: '\\quad\\text{for}\\quad' },
      ],
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
      : feedbackTone === 'correct'
        ? feedback
        : feedback
    : isDiagnostic
      ? 'Work cleanly. Diagnostics only need enough feedback to calibrate the map.'
      : 'Use a hint if you are blocked. If the setup feels unsteady, mark that you are lost.'
  const graphExpression = primaryGraphExpression(problem)
  const graphPresets = graphPresetsForProblem(problem)
  const builtInGraphKind = builtInGraphKindForSkill(problem.skillIds[0])
  const builtInGraphProps = builtInGraphPropsForProblem(problem, graphPresetIndex)
  const showGraph = Boolean(
    builtInGraphKind ||
      (graphExpression &&
        problem.skillIds.some(
          (id) =>
            id.includes('graph') ||
            id.includes('derivative') ||
            id.includes('optimization') ||
            id.includes('area') ||
            id.includes('integral') ||
            id.includes('riemann') ||
            id.includes('taylor') ||
            id.includes('slope') ||
            id.includes('series') ||
            id.includes('polar') ||
            id.includes('parametric') ||
            id === 'related_rates',
        )),
  )
  const showWorkRequired = requiresShowWork(state, problem)
  const activeGraphExpression =
    graphPresets[graphPresetIndex]?.expression ?? graphExpression

  const readOnly =
    quickRepair?.phase === 'example_1' ||
    quickRepair?.phase === 'example_2' ||
    Boolean(state.readOnlyExample)
  const videoResource =
    sessionPhase === 'resource_watch' && problem.skillIds[0]
      ? rankResourcesForSkill(state, problem.skillIds[0], undefined, 1)[0]
      : undefined
  const rankedResources = problem.skillIds[0]
    ? rankResourcesForSkill(state, problem.skillIds[0], undefined, 4)
    : []
  const attemptMode = attemptModeForActivity(problem.mode)
  const showReviewExplain =
    attemptMode === 'review' && (wrongEscalation ?? 0) >= 2 && feedbackTone !== 'correct'

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
                    .filter((group) => group.label === 'Core' || group.label === 'Calculus' || group.label === 'Series')
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
                            group.label === 'Vectors' ||
                            group.label === 'Parametric' ||
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
          {shouldShowConfidencePrompts(state, problem) && (
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
          <p className="keyboard-submit-hint muted" id="keyboard-submit-hint">
            Press Enter to check your answer (Shift+Enter for a new line in text fields).
          </p>
          <section className="answer-dock" aria-label="Answer actions" aria-describedby="keyboard-submit-hint">
            <div className="activity-primary-actions">
              <Button variant="primary" onClick={submitAnswer} aria-label="Check answer and submit">
                Check answer
              </Button>
              <Button variant="secondary" icon={<HelpCircle size={18} />} onClick={() => setHintCount(hintCount + 1)}>
                {hintLabels[Math.min(hintCount, hintLabels.length - 1)]}
              </Button>
              {showGraph && (
                <Button variant="secondary" onClick={() => setGraphOpen(!graphOpen)}>
                  {graphOpen ? 'Hide graph' : 'Show graph'}
                </Button>
              )}
              {(feedbackTone === 'wrong' || feedbackTone === 'almost') && (
                <Button
                  variant="secondary"
                  onClick={() =>
                    requestHelp(
                      'Why is my answer wrong? Explain the likely mistake without revealing the full solution.',
                    )
                  }
                  disabled={isDiagnostic}
                >
                  Why is my answer wrong?
                </Button>
              )}
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
                  { label: "I don't know what method to use", prompt: "I'm lost: I don't know what method to use" },
                  { label: "I don't understand the question", prompt: "I don't understand the question — explain what it is asking without solving it" },
                  { label: "I don't know the first step", prompt: "I'm lost: I don't know the first step" },
                  { label: "I made progress but got stuck", prompt: "I'm lost: I made progress but got stuck" },
                  { label: "I don't understand the concept", prompt: "I'm lost: I don't understand the concept" },
                  { label: "I'm not sure", prompt: "I'm not sure — suggest one small next thinking step only" },
                  { label: 'My answer looks right but was marked wrong', prompt: "I'm lost: My answer looks right but was marked wrong" },
                  { label: 'I need a similar example', prompt: 'similar_example' },
                  { label: 'I forgot a formula', prompt: "I'm lost: I forgot a formula" },
                ].map(({ label, prompt }) => (
                  <button
                    key={label}
                    type="button"
                    className="secondary lost-chip"
                    onClick={() => {
                      if (prompt === 'similar_example') {
                        startAction(problemForSkill(state, problem.skillIds[0], problem.mode))
                        setLostOpen(false)
                        return
                      }
                      void requestHelp(prompt)
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
            {(wrongEscalation ?? 0) > 0 && feedbackTone !== 'correct' && (
              <p className="eyebrow feedback-escalation" data-testid="feedback-escalation">
                Guided feedback · step {(wrongEscalation ?? 0) + 1} of 3
                {attemptMode === 'independent' && ' · try again before more help'}
                {attemptMode === 'review' && wrongEscalation! >= 2 && ' · explain-after-miss'}
              </p>
            )}
            {feedbackTone === 'correct' && (
              <section className="inspector-next">
                <h4>Try next</h4>
                <ul>
                  {(feedbackNextSteps?.length ? feedbackNextSteps : ['Try a similar problem without hints to lock in the skill.']).map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </section>
            )}
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
              {codexBusy && cancelCodex && (
                <Button variant="ghost" size="sm" onClick={() => cancelCodex()}>
                  Cancel Codex
                </Button>
              )}
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
              {showReviewExplain && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => requestHelp('After a review miss, explain the concept without giving the full answer')}
                  disabled={codexBusy || isDiagnostic}
                >
                  Explain after miss
                </Button>
              )}
              {state.developerModeEnabled && (
                <Button variant="ghost" size="sm" onClick={() => generatePacket('explain current problem attempt')}>
                  Prompt packet
                </Button>
              )}
            </div>
            {showGraph && (
              <div className="inspector-graph-links">
                <p className="meta-label">External graph tools</p>
                <div className="external-graph-links">
                  <a
                    className="desmos-link"
                    href={`https://www.desmos.com/calculator?lang=en&expressions=${encodeURIComponent(graphExpression)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Desmos
                  </a>
                  <a className="desmos-link" href="https://www.geogebra.org/graphing?lang=en" target="_blank" rel="noreferrer">
                    GeoGebra
                  </a>
                  <a
                    className="desmos-link"
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
              <div className="inspector-resources" aria-label="Ranked resources for this skill">
                <p className="meta-label">Resources for this skill</p>
                <ul className="inspector-resource-list">
                  {rankedResources.map((resource: ResourceRecord) => (
                    <li key={resource.id}>
                      <a href={resource.url} target="_blank" rel="noreferrer">
                        {resource.title}
                      </a>
                      <span className="muted">{Math.round(resource.effectivenessScore * 100)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {analyzeHomework && setHomeworkText && (
              <details className="inspector-upload" open>
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
          {showGraph && graphOpen && (
            <div className="graph-panel">
              {graphPresets.length > 1 && (
                <div className="graph-preset-row">
                  {graphPresets.map((preset, index) => (
                    <button
                      key={preset.label}
                      type="button"
                      className={`secondary ${graphPresetIndex === index ? 'active' : ''}`}
                      onClick={() => setGraphPresetIndex(index)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}
              {graphPresets[graphPresetIndex]?.notes && (
                <p className="muted graph-preset-notes">{graphPresets[graphPresetIndex]?.notes}</p>
              )}
              <DesmosEmbed expression={activeGraphExpression} />
              {builtInGraphProps && (
                <BuiltInGraph {...builtInGraphProps} />
              )}
            </div>
          )}
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
                    className={`skill-row ${mastery.masteryScore < 0.4 ? 'weak' : ''} ${highlightSkillIds.includes(skill.id) ? 'weak' : ''} ${state.advancedMode ? 'skill-row-advanced' : ''}`}
                    key={skill.id}
                    onClick={() => handleSkill(skill.id)}
                    aria-label={`${skill.name}, ${Math.round(mastery.masteryScore * 100)}% mastery, ${mastery.masteryState}`}
                  >
                    <span className="skill-row-main">
                      <span>{skill.name}</span>
                      {state.advancedMode && <MasteryDimensionBars mastery={mastery} />}
                    </span>
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
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ResourceSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [resources, setResources] = useState<MathPilotState['resources'][string][]>([])
  useEffect(() => {
    void import('../domain/configLoader').then((m) =>
      m.loadSourcesConfig().then((c) => {
        setPolicy(c.policy)
        void listTrustedResources(state).then(setResources)
      }),
    )
  }, [state])
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) return
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setSearching(true)
    })
    void searchResources(trimmed, { resources: state.resources }, { limit: 12 }).then((results) => {
      if (!cancelled) {
        setSearchResults(results)
        setSearching(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [query, state.resources])

  const displaySearchResults = query.trim().length < 2 ? [] : searchResults
  const displayResources: Array<ResourceRecord & { dynamic?: boolean }> =
    query.trim().length >= 2
      ? displaySearchResults.map((hit) => ({
          id: hit.id,
          title: hit.title,
          source: hit.source,
          url: hit.url,
          duration: hit.dynamic ? 'Search' : '—',
          format: 'video' as const,
          effectivenessScore: hit.rankScore,
          notes: hit.dynamic ? 'Dynamic search result' : '',
          skillIds: [] as string[],
          dynamic: hit.dynamic,
        }))
      : resources
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
          {query.trim().length >= 2
            ? `${displayResources.length} result${displayResources.length === 1 ? '' : 's'}`
            : `${resources.length} trusted · ranked by outcome`}
        </div>
      </header>
      <section className="panel resource-search-panel">
        <label htmlFor="resource-search" className="meta-label">
          Search resources
        </label>
        <input
          id="resource-search"
          className="map-filter"
          type="search"
          placeholder="Search by topic, skill, or source…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search resources"
          data-testid="resource-search"
        />
        {searching && <p className="muted">Searching…</p>}
      </section>
      <section className="panel external-tools-panel">
        <h2>External graph tools</h2>
        <div className="external-graph-links">
          <a className="desmos-link" href="https://www.desmos.com/calculator?lang=en" target="_blank" rel="noreferrer">
            Desmos
          </a>
          <a className="desmos-link" href="https://www.geogebra.org/graphing?lang=en" target="_blank" rel="noreferrer">
            GeoGebra
          </a>
          <a className="desmos-link" href="https://www.wolframalpha.com/" target="_blank" rel="noreferrer">
            WolframAlpha
          </a>
        </div>
      </section>
      {displayResources.length === 0 && (
        <section className="resource-empty" aria-label="No resources">
          <BookOpen size={22} />
          <div>
            <h2>{query.trim().length >= 2 ? 'No matches' : 'No ranked resources yet'}</h2>
            <p>
              {query.trim().length >= 2
                ? 'Try a broader topic or check dynamic YouTube results above.'
                : 'Start a session or repair a skill. MathPilot will rank resources when they are useful for the current blocker.'}
            </p>
          </div>
        </section>
      )}
      <div className="resource-list">
        {displayResources.map((resource) => {
          const linkedSkills = resource.skillIds.length > 0 ? skillNamesForResource(state, resource) : []
          const isDynamic = Boolean(resource.dynamic)
          return (
          <div className="resource-row" key={resource.id}>
            <a href={resource.url} target="_blank" rel="noreferrer" className="resource-link">
              <BookOpen size={20} />
              <span>
                <strong>{resource.title}</strong>
                <small>
                  {resource.source} · {resource.duration} · effectiveness {Math.round(resource.effectivenessScore * 100)}%
                  {isDynamic && ' · dynamic search'}
                  {linkedSkills.length > 0 && ` · ${linkedSkills.slice(0, 3).join(', ')}`}
                </small>
              </span>
            </a>
            {!isDynamic && (
            <div className="resource-helpfulness">
              <span className="muted">Was this helpful?</span>
              <button
                type="button"
                className="ghost small"
                onClick={() => update(recordResourceHelpfulness(state, resource.id, 'yes'))}
              >
                Yes
              </button>
              <button
                type="button"
                className="ghost small"
                onClick={() => update(recordResourceHelpfulness(state, resource.id, 'kind_of'))}
              >
                Kind of
              </button>
              <button
                type="button"
                className="ghost small"
                onClick={() => update(recordResourceHelpfulness(state, resource.id, 'no'))}
              >
                No
              </button>
            </div>
            )}
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

function ManualPacketCopyRow({
  state,
  label,
  variant,
}: {
  state: MathPilotState
  label: string
  variant: 'chatgpt' | 'gemini'
}) {
  const [status, setStatus] = useState<string | null>(null)
  return (
    <div className="settings-row">
      <span>{label}</span>
      <button
        type="button"
        className="secondary"
        onClick={() => {
          void (async () => {
            const memory = await ensureMemoryLoaded()
            const skills = await loadSkillsForPrompt('manual_review', [])
            const base = createPromptPacket(state, 'manual_review', undefined, undefined, memory, skills)
            const text = variant === 'chatgpt' ? wrapPacketForChatGPT(base) : wrapPacketForGemini(base)
            try {
              await navigator.clipboard.writeText(text)
              setStatus('Copied')
            } catch {
              setStatus('Copy failed')
            }
          })()
        }}
      >
        <ClipboardList size={18} />
        Copy
      </button>
      {status && <span className="muted">{status}</span>}
    </div>
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
  onSyllabusUploaded,
}: {
  state: MathPilotState
  update: (state: MathPilotState) => void
  chooseFocus: (focus: CourseFocus) => void
  reset: () => void
  openDeveloper: () => void
  codexPaste: string
  setCodexPaste: (v: string) => void
  onApplyCodexPaste: () => void
  onSyllabusUploaded?: () => void
}) {
  const [resetConfirm, setResetConfirm] = useState('')
  const [syllabusDraft, setSyllabusDraft] = useState('')
  const [bevelDraft, setBevelDraft] = useState('')
  const mapping = state.syllabusMapping ?? []
  const syllabusDates = state.syllabus?.extractedDates ?? []
  const syllabusExams = state.syllabus?.extractedExams ?? []

  function toggleMappingTopic(topic: string, accepted: boolean) {
    if (!state.syllabusMapping?.length) return
    const nextMapping = state.syllabusMapping.map((entry) =>
      entry.topic === topic ? { ...entry, accepted } : entry,
    )
    const acceptedItems = nextMapping
      .filter((entry) => entry.accepted)
      .map((entry, index) => ({
        week: index + 1,
        topic: entry.topic,
        skillIds: entry.skillIds,
      }))
    update({
      ...state,
      syllabusMapping: nextMapping,
      syllabus: state.syllabus
        ? {
            ...state.syllabus,
            items: acceptedItems,
          }
        : state.syllabus,
    })
  }

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
                  preferences: mergePreferences(state, { tone: e.target.value as 'direct' | 'warm' }),
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
                  preferences: mergePreferences(state, {
                    gamificationLevel: e.target.value as 'minimal' | 'light',
                  }),
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
                  preferences: mergePreferences(state, {
                    activeVideoMode: e.target.value as 'never' | 'sometimes' | 'active',
                  }),
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
                  preferences: mergePreferences(state, {
                    theme: e.target.value as 'system' | 'light' | 'dark',
                  }),
                })
              }
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div className="settings-row">
            <label htmlFor="confidence-prompts-select">Confidence prompts</label>
            <select
              id="confidence-prompts-select"
              value={state.preferences?.confidencePrompts ?? 'review_only'}
              onChange={(e) =>
                update({
                  ...state,
                  preferences: mergePreferences(state, {
                    confidencePrompts: e.target.value as 'off' | 'review_only' | 'often',
                  }),
                })
              }
            >
              <option value="off">Off</option>
              <option value="review_only">Review & diagnostic only</option>
              <option value="often">Often</option>
            </select>
          </div>
          <div className="settings-row settings-row-stack">
            <label htmlFor="bevel-import">Bevel energy import (optional)</label>
            <textarea
              id="bevel-import"
              className="syllabus-upload"
              placeholder='Paste Bevel JSON {"score": 72} or a number'
              rows={2}
              value={bevelDraft}
              onChange={(e) => setBevelDraft(e.target.value)}
              onBlur={() => {
                const snap = parseBevelImport(bevelDraft)
                const hint = energyPaceHint(snap ?? undefined)
                if (hint) {
                  update({ ...state, sessionPace: hint })
                }
              }}
            />
            <p className="muted">Adjusts today&apos;s pace from imported energy (§8.3). HealthKit is not available in this desktop build.</p>
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
                    preferences: mergePreferences(state, {
                      notificationsEnabled: event.target.checked,
                    }),
                  })
                }
              />
            </label>
          </div>
          <div className="settings-row">
            <span>Study block reminder</span>
            <label className="toggle">
              <input
                type="checkbox"
                checked={state.preferences?.studyPlanReminderEnabled ?? false}
                onChange={(event) =>
                  update({
                    ...state,
                    preferences: mergePreferences(state, {
                      studyPlanReminderEnabled: event.target.checked,
                    }),
                  })
                }
              />
            </label>
          </div>
          <div className="settings-row">
            <label htmlFor="study-block-time">Study block time</label>
            <input
              id="study-block-time"
              type="time"
              value={state.preferences?.studyBlockTime ?? '18:00'}
              disabled={!state.preferences?.studyPlanReminderEnabled}
              onChange={(event) =>
                update({
                  ...state,
                  preferences: mergePreferences(state, {
                    studyBlockTime: event.target.value,
                  }),
                })
              }
            />
          </div>
          <div className="settings-row settings-row-stack">
            <span>Study block days</span>
            <div className="study-block-days">
              {[
                { day: 0, label: 'Sun' },
                { day: 1, label: 'Mon' },
                { day: 2, label: 'Tue' },
                { day: 3, label: 'Wed' },
                { day: 4, label: 'Thu' },
                { day: 5, label: 'Fri' },
                { day: 6, label: 'Sat' },
              ].map(({ day, label }) => {
                const selected = (state.preferences?.studyBlockDays ?? [1, 2, 3, 4, 5]).includes(day)
                return (
                  <label key={day} className="study-block-day">
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={!state.preferences?.studyPlanReminderEnabled}
                      onChange={(event) => {
                        const current = state.preferences?.studyBlockDays ?? [1, 2, 3, 4, 5]
                        const nextDays = event.target.checked
                          ? [...new Set([...current, day])].sort((a, b) => a - b)
                          : current.filter((value) => value !== day)
                        update({
                          ...state,
                          preferences: mergePreferences(state, {
                            studyBlockDays: nextDays,
                          }),
                        })
                      }}
                    />
                    {label}
                  </label>
                )
              })}
            </div>
          </div>
          <div className="settings-row">
            <span>Plan to study today</span>
            <label className="toggle">
              <input
                type="checkbox"
                checked={state.plannedStudyToday === new Date().toISOString().slice(0, 10)}
                onChange={(event) =>
                  update({
                    ...state,
                    plannedStudyToday: event.target.checked
                      ? new Date().toISOString().slice(0, 10)
                      : undefined,
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
              placeholder="Paste syllabus lines (Week 1: Limits, Midterm 3/15, Week 2: Derivatives…)"
              rows={4}
              value={syllabusDraft}
              onChange={(e) => setSyllabusDraft(e.target.value)}
              onBlur={() => {
                const text = syllabusDraft.trim()
                if (text.length > 20) {
                  update(applySyllabusUpload(state, text))
                  onSyllabusUploaded?.()
                }
              }}
            />
          </div>
          {mapping.length > 0 && (
            <div className="settings-row settings-row-stack syllabus-mapping-panel">
              <span>Review extracted syllabus</span>
              {(syllabusDates.length > 0 || syllabusExams.length > 0) && (
                <div className="syllabus-extract-meta">
                  {syllabusDates.length > 0 && (
                    <p className="muted">
                      Dates: {syllabusDates.join(', ')}
                    </p>
                  )}
                  {syllabusExams.length > 0 && (
                    <p className="muted">
                      Exams: {syllabusExams.join('; ')}
                    </p>
                  )}
                </div>
              )}
              <ul className="syllabus-mapping-list">
                {mapping.map((entry) => (
                  <li key={entry.topic}>
                    <label>
                      <input
                        type="checkbox"
                        checked={entry.accepted}
                        onChange={(event) => toggleMappingTopic(entry.topic, event.target.checked)}
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
            </div>
          )}
          <div className="settings-row">
            <span>Syllabus topics</span>
            <span className="muted">
              {mapping.filter((entry) => entry.accepted).length || state.syllabus?.items.length || 0} active
            </span>
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
          <h2>Keyboard shortcuts</h2>
          <dl className="keyboard-shortcuts-list">
            <div className="settings-row">
              <dt>Command palette</dt>
              <dd>
                <kbd>⌘</kbd> <kbd>K</kbd> or <kbd>Ctrl</kbd> <kbd>K</kbd>
              </dd>
            </div>
            <div className="settings-row">
              <dt>Submit answer</dt>
              <dd>
                <kbd>Enter</kbd> or <kbd>⌘</kbd> <kbd>Enter</kbd>
              </dd>
            </div>
            <div className="settings-row">
              <dt>Close modal / dialog</dt>
              <dd>
                <kbd>Esc</kbd>
              </dd>
            </div>
            <div className="settings-row">
              <dt>Knowledge map wheel</dt>
              <dd>Tab through area nodes, then skill nodes; <kbd>Enter</kbd> or <kbd>Space</kbd> to select</dd>
            </div>
          </dl>
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
        </div>

        <div className="settings-group">
          <h2>Manual AI packets</h2>
          <p className="muted" style={{ marginBottom: 12 }}>
            Copy a prompt into ChatGPT or Gemini, then paste the JSON response below (Codex paste-back).
          </p>
          <ManualPacketCopyRow state={state} label="ChatGPT packet" variant="chatgpt" />
          <ManualPacketCopyRow state={state} label="Gemini packet" variant="gemini" />
          <div className="settings-row" style={{ display: 'block', marginTop: 12 }}>
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
  onTestCodex,
  codexPingStatus,
  codexPingBusy,
  codexBusy,
  cancelCodex,
  onImportResources,
  showFullPrompts,
  onToggleShowFullPrompts,
  onBatchVerifyBank,
  batchVerifyBusy,
  onApplyCodeChange,
  onRollbackCodeChange,
  onUpdateState,
}: {
  state: MathPilotState
  packet: string
  generatePacket: (task: string) => void
  runMaintenance: () => void
  onGenerateProblem: (skillId: string) => void
  onRestoreBackup?: (payload: string) => void
  onTestCodex?: () => void
  codexPingStatus?: string | null
  codexPingBusy?: boolean
  codexBusy?: boolean
  cancelCodex?: () => void
  onImportResources?: (json: string) => { ok: boolean; errors: string[]; imported: number }
  showFullPrompts?: boolean
  onToggleShowFullPrompts?: (enabled: boolean) => void
  onBatchVerifyBank?: () => void
  batchVerifyBusy?: boolean
  onApplyCodeChange?: (proposalId: string) => void
  onRollbackCodeChange?: (proposalId: string) => void
  onUpdateState?: (state: MathPilotState) => void
}) {
  const [backups, setBackups] = useState<string[]>([])
  const [memoryFiles, setMemoryFiles] = useState<string[]>([])
  const [deprecateId, setDeprecateId] = useState('')
  const [deprecateReason, setDeprecateReason] = useState('manual review')
  const [inspectSkillId, setInspectSkillId] = useState(Object.keys(state.skills)[0] ?? '')
  const [resourceImportDraft, setResourceImportDraft] = useState('')
  const [resourceImportStatus, setResourceImportStatus] = useState<string | null>(null)
  const [resourceImportErrors, setResourceImportErrors] = useState<string[]>([])

  useEffect(() => {
    void listBackups().then(setBackups)
  }, [state.maintenanceRuns?.length])

  useEffect(() => {
    if (typeof window === 'undefined' || !(window as Window & { __TAURI__?: unknown }).__TAURI__) return
    void import('@tauri-apps/api/core')
      .then(({ invoke }) => invoke<string[]>('read_memory_files'))
      .then(setMemoryFiles)
      .catch(() => setMemoryFiles([]))
  }, [])

  const displayPacket = showFullPrompts ? packet : packet ? `${packet.slice(0, 1200)}${packet.length > 1200 ? '\n… (truncated — enable Show full prompt)' : ''}` : ''

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
          {onTestCodex && (
            <button type="button" className="secondary" disabled={codexPingBusy} onClick={onTestCodex}>
              {codexPingBusy ? 'Pinging Codex…' : 'Test Codex CLI'}
            </button>
          )}
          {onBatchVerifyBank && (
            <button type="button" className="secondary" disabled={batchVerifyBusy} onClick={onBatchVerifyBank}>
              {batchVerifyBusy ? 'Verifying bank…' : 'Batch verify bank'}
            </button>
          )}
          {codexBusy && cancelCodex && (
            <button type="button" className="secondary" onClick={() => cancelCodex()}>
              Cancel Codex
            </button>
          )}
        </div>
      </header>
      {codexPingStatus && <p className="muted developer-ping-status">{codexPingStatus}</p>}
      <div className="settings-row" style={{ marginBottom: 16 }}>
        <span>Show full prompt in packet viewer</span>
        <label className="toggle">
          <input
            type="checkbox"
            checked={showFullPrompts ?? false}
            onChange={(e) => onToggleShowFullPrompts?.(e.target.checked)}
          />
        </label>
      </div>
      <div className="settings-row" style={{ marginBottom: 16 }}>
        <span>Codex problem generation in sessions (§9.2)</span>
        <label className="toggle">
          <input
            type="checkbox"
            checked={state.preferences?.enableCodexProblemGen ?? false}
            onChange={(e) =>
              onUpdateState?.({
                ...state,
                preferences: {
                  tone: state.preferences?.tone ?? 'direct',
                  gamificationLevel: state.preferences?.gamificationLevel ?? 'minimal',
                  notificationsEnabled: state.preferences?.notificationsEnabled ?? false,
                  reportsMode: 'on_demand_only',
                  activeVideoMode: state.preferences?.activeVideoMode ?? 'sometimes',
                  theme: state.preferences?.theme ?? 'system',
                  confidencePrompts: state.preferences?.confidencePrompts ?? 'review_only',
                  ...state.preferences,
                  enableCodexProblemGen: e.target.checked,
                },
              })
            }
          />
        </label>
      </div>
      <section className="developer-inspect-grid">
        <div className="panel">
          <h2>Skill inspect (read-only)</h2>
          <select value={inspectSkillId} onChange={(e) => setInspectSkillId(e.target.value)} aria-label="Skill to inspect">
            {Object.values(state.skills).map((skill) => (
              <option key={skill.id} value={skill.id}>
                {skill.name}
              </option>
            ))}
          </select>
          <pre className="packet memory-viewer">
            {JSON.stringify(
              {
                skill: state.skills[inspectSkillId],
                mastery: state.mastery[inspectSkillId],
                mistakePatterns: Object.values(state.mistakePatterns).filter((p) =>
                  p.skillIds.includes(inspectSkillId),
                ),
              },
              null,
              2,
            )}
          </pre>
        </div>
        <div className="panel">
          <h2>Deprecate problem</h2>
          <input
            type="text"
            value={deprecateId}
            onChange={(e) => setDeprecateId(e.target.value)}
            placeholder="problem id"
            aria-label="Problem id to deprecate"
          />
          <input
            type="text"
            value={deprecateReason}
            onChange={(e) => setDeprecateReason(e.target.value)}
            placeholder="reason"
            aria-label="Deprecation reason"
          />
          <button
            type="button"
            className="secondary"
            disabled={!deprecateId.trim() || !onUpdateState}
            onClick={() => onUpdateState?.(markProblemDeprecated(state, deprecateId.trim(), deprecateReason.trim()))}
          >
            Mark deprecated
          </button>
        </div>
        <div className="panel">
          <h2>Import resources</h2>
          <p className="muted">Paste a JSON array of ResourceRecord objects to merge into state.resources.</p>
          <textarea
            className="syllabus-upload"
            rows={8}
            placeholder='[{"id":"custom-video","title":"…","source":"…","url":"https://…","skillIds":["chain_rule"],"duration":"10 min","format":"video","effectivenessScore":0.7,"notes":"…"}]'
            value={resourceImportDraft}
            onChange={(e) => setResourceImportDraft(e.target.value)}
            aria-label="Resource import JSON"
          />
          <div className="action-row">
            <button
              type="button"
              className="secondary"
              disabled={!resourceImportDraft.trim() || !onImportResources}
              onClick={() => {
                if (!onImportResources) return
                const result = onImportResources(resourceImportDraft)
                setResourceImportErrors(result.errors)
                setResourceImportStatus(
                  result.ok
                    ? `Imported ${result.imported} resource${result.imported === 1 ? '' : 's'}.`
                    : 'Import failed.',
                )
                if (result.ok) setResourceImportDraft('')
              }}
            >
              Import resources
            </button>
            <label className="secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input
                type="file"
                accept="application/json,.json"
                aria-label="Import resources from JSON file"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  void file.text().then((text) => setResourceImportDraft(text))
                  event.target.value = ''
                }}
              />
              Load JSON file
            </label>
          </div>
          {resourceImportStatus && <p className="muted">{resourceImportStatus}</p>}
          {resourceImportErrors.length > 0 && (
            <ul className="log-list">
              {resourceImportErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <section className="two-column">
        <div className="panel">
          <h2>Prompt packet</h2>
          <pre className="packet">{displayPacket || 'No packet drafted yet.'}</pre>
        </div>
        <div className="panel">
          {memoryFiles.length > 0 && (
            <>
              <h2>Memory files (read-only)</h2>
              <pre className="packet memory-viewer">{memoryFiles.join('\n\n---\n\n').slice(0, 8000)}</pre>
            </>
          )}
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
          {(state.codeChangeProposals?.length ?? 0) > 0 && (
            <>
              <h2>Code change proposals</h2>
              <ul className="log-list">
                {state.codeChangeProposals!.map((proposal) => (
                  <li key={proposal.id}>
                    <strong>{proposal.status}</strong> — {proposal.summary}
                    {proposal.status === 'approved' && onApplyCodeChange && (
                      <button type="button" className="secondary" onClick={() => onApplyCodeChange(proposal.id)}>
                        Apply patches
                      </button>
                    )}
                    {proposal.status === 'applied' && onRollbackCodeChange && (
                      <button type="button" className="secondary" onClick={() => onRollbackCodeChange(proposal.id)}>
                        Rollback
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
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
                {call.promptHash ? ` · hash ${call.promptHash.slice(0, 12)}…` : ''}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}
