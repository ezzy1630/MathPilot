import { useEffect, useMemo, useRef, useState } from 'react'
import type { MathfieldElement } from 'mathlive'
import {
  createPromptPacket,
  ensureMemoryLoaded,
  invokeCodexCli,
  invokeCodexForTask,
  logManualPacket,
  cancelCodexCli,
  createCodexCallId,
} from '@mathpilot/ai-adapter'
import { loadSkillsForPrompt } from '../domain/skillLoader'
import { resolveAnswerDisagreement } from '../domain/mathDisagreement'
import { offlineHelpForTask } from '../domain/codexOfflineFallback'
import { applyCodexResponse, parseCodexResponse } from '../domain/codexParser'
import {
  currentDiagnosticProblem,
  startDiagnostic,
  submitDiagnosticAnswer,
} from '../domain/diagnosticEngine'
import { startDailySession, advanceDailySession } from '../domain/dailySessionEngine'
import { analyzeHomeworkDeep } from '../domain/homeworkAnalysis'
import { saveHomeworkAsWorkedExample } from '../domain/homeworkLearningBridge'
import { feedbackForMode } from '../domain/feedbackByMode'
import { gradeStepsAsync } from '../domain/stepGrading'
import { resolveProblemForAction } from '../domain/sessionPlanner'
import { syncAttemptRecord } from '../domain/persistence'
import { chooseNextAction, createInitialState, recordAttempt } from '@mathpilot/learning-engine'
import { checkAnswer, checkAnswerAsync } from '@mathpilot/math-engine'
import {
  advanceQuickRepair,
  clearQuickRepair,
  currentQuickRepairProblem,
  quickRepairExplanation,
  startQuickRepair,
} from '../domain/quickRepairEngine'
import { loadAppSettings } from '../domain/configLoader'
import { clearTestOut, currentTestOutProblem, startTestOut, submitTestOutAnswer } from '../domain/testOutEngine'
import { loadPersistedState, saveHomeworkImageFile, savePersistedState } from '../domain/persistence'
import {
  applyTestOutResult,
  checkPrerequisiteGate,
  logOverride,
  type SessionPace,
} from '../domain/sessionEngine'
import { groupByArea } from '../lib/mapHelpers'
import { motivationLine } from '../domain/motivationCopy'
import { pushToast } from '../ui'
import { defaultSyllabus } from '../domain/syllabus'
import { requiresShowWork } from '../domain/showWorkPolicy'
import { syncProfileToMemoryFiles } from '../domain/memorySync'
import { syncSkillMasteryNotes } from '../domain/skillFileSync'
import { maybeNotifyReviewDue, maybeNotifyStudyBlock, maybeNotifyPlannedStudy, requestNotificationPermission } from '../domain/notifications'
import { parseResourceImport, mergeImportedResources } from '../domain/resourceResolver'
import { startActiveVideo } from '../domain/activeVideoMode'
import { currentSessionPhase } from '../domain/dailySessionEngine'
import { clearContinuingDiagnosticPending, evaluateContinuingDiagnostic } from '../domain/continuingDiagnostics'
import { topResourcesForSkill } from '../domain/resourceLearning'
import { attemptModeForActivity } from '../domain/activityAttemptMode'
import type { CourseFocus, MathPilotState, Problem } from '../domain/types'
import type { AppView, OnboardingStep } from './types'

function shouldRecordConfidence(state: MathPilotState, problem: Problem): boolean {
  const mode = state.preferences?.confidencePrompts ?? 'review_only'
  if (mode === 'off') return false
  if (state.diagnostic && !state.diagnostic.completed) return true
  if (problem.mode === 'mixed_review') return true
  if (mode === 'often') return problem.mode !== 'resource_watch'
  return false
}

export function useMathPilotApp() {
  const [state, setState] = useState<MathPilotState | null>(null)
  const [view, setView] = useState<AppView>('today')
  const [activeProblemId, setActiveProblemId] = useState<string | undefined>()
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [feedbackTone, setFeedbackTone] = useState<'correct' | 'almost' | 'wrong' | null>(null)
  const [feedbackNextSteps, setFeedbackNextSteps] = useState<string[]>([])
  const [hintCount, setHintCount] = useState(0)
  const [packet, setPacket] = useState('')
  const [homeworkText, setHomeworkText] = useState('')
  const [gateSkillId, setGateSkillId] = useState<string | undefined>()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [confidence, setConfidence] = useState(3)
  const [steps, setSteps] = useState<string[]>([''])
  const [lostOpen, setLostOpen] = useState(false)
  const [showSteps, setShowSteps] = useState(false)
  const [codexBusy, setCodexBusy] = useState(false)
  const [codexCallId, setCodexCallId] = useState<string | null>(null)
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('welcome')
  const [expandedAreas, setExpandedAreas] = useState<Record<string, boolean>>({})
  const [homeworkAnalyzing, setHomeworkAnalyzing] = useState(false)
  const [showFormulaRecall, setShowFormulaRecall] = useState(false)
  const [whyOpen, setWhyOpen] = useState(false)
  const [mapViewMode, setMapViewMode] = useState<'wheel' | 'list' | 'tree'>('wheel')
  const [codexPaste, setCodexPaste] = useState('')
  const [codexPingStatus, setCodexPingStatus] = useState<string | null>(null)
  const [codexPingBusy, setCodexPingBusy] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [homeworkUploadOpen, setHomeworkUploadOpen] = useState(false)
  const [wrongEscalation, setWrongEscalation] = useState(0)
  const [skillActionId, setSkillActionId] = useState<string | undefined>()
  const mathFieldRef = useRef<MathfieldElement | null>(null)

  useEffect(() => {
    void Promise.all([loadPersistedState(), loadAppSettings(), ensureMemoryLoaded()]).then(([loaded, settings]) => {
      setState({
        ...loaded,
        profileName: loaded.profileName || settings.profileName,
        advancedMode: loaded.advancedMode ?? settings.advancedModeDefault,
        preferences: loaded.preferences ?? {
          tone: 'warm',
          gamificationLevel: 'minimal',
          notificationsEnabled: settings.notificationsDefault,
          reportsMode: 'on_demand_only',
          activeVideoMode: 'sometimes',
          theme: 'system',
          confidencePrompts: 'review_only',
        },
        syllabus: loaded.syllabus ?? defaultSyllabus(loaded.currentFocus),
        mapViewMode: loaded.mapViewMode ?? 'wheel',
      })
      setView(!loaded.onboarded && loaded.diagnostic && !loaded.diagnostic.completed ? 'activity' : 'today')
    })
  }, [])

  useEffect(() => {
    if (!state) return
    void savePersistedState(state)
    void syncProfileToMemoryFiles(state)
  }, [state])

  useEffect(() => {
    if (!state) return
    requestNotificationPermission()
    void maybeNotifyReviewDue(state)
    void maybeNotifyStudyBlock(state)
    void maybeNotifyPlannedStudy(state)
  }, [state])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const nextAction = useMemo(() => (state ? chooseNextAction(state) : null), [state])
  const diagnosticProblem = useMemo(() => (state ? currentDiagnosticProblem(state) : undefined), [state])
  const quickRepairProblem = useMemo(
    () => (state?.quickRepair ? currentQuickRepairProblem(state) : undefined),
    [state],
  )
  const testOutProblem = useMemo(() => (state ? currentTestOutProblem(state) : undefined), [state])

  const activeProblem = useMemo(() => {
    if (!state) return undefined
    if (state.testOut && !state.testOut.completed) return testOutProblem
    if (state.diagnostic && !state.diagnostic.completed) return diagnosticProblem
    if (state.quickRepair && state.quickRepair.phase !== 'explain' && state.quickRepair.phase !== 'complete') {
      return quickRepairProblem
    }
    return activeProblemId ? state.problems[activeProblemId] : undefined
  }, [state, diagnosticProblem, activeProblemId, quickRepairProblem, testOutProblem])
  const areaGroups = useMemo(() => (state ? groupByArea(state) : {}), [state])

  function update(next: MathPilotState) {
    setState({ ...next })
  }

  function startAction(problemId = nextAction?.problemId) {
    if (!state || !nextAction) return
    const baseState = state.codexHint ? { ...state, codexHint: undefined } : state
    if (nextAction.kind === 'diagnostic' && !baseState.diagnostic) {
      const { state: withDiag } = startDiagnostic(baseState)
      update(withDiag)
      setActiveProblemId(undefined)
    } else if (nextAction.kind === 'quick_repair' && nextAction.skillIds[0]) {
      update(startQuickRepair(baseState, nextAction.skillIds[0]))
      setActiveProblemId(undefined)
    } else {
      const targetSkill = nextAction.skillIds[0]
      const gate = targetSkill ? checkPrerequisiteGate(baseState, targetSkill) : { blocked: false }
      if (gate.blocked && gate.weakSkillId) {
        setGateSkillId(targetSkill)
        return
      }
      let working = baseState
      if (!working.dailySession) {
        working = startDailySession(working, working.sessionPace ?? 'normal')
      }
      const resolved = resolveProblemForAction(working, nextAction.skillIds, nextAction.kind, problemId)
      working = resolved.state
      const phase = currentSessionPhase(working)
      const skillId = nextAction.skillIds[0]
      if (phase === 'resource_watch' && skillId && working.preferences?.activeVideoMode !== 'never') {
        const resource = topResourcesForSkill(working, skillId)[0]
        if (resource) working = startActiveVideo(working, resource.id)
      }
      update(working)
      const pid = resolved.problemId ?? problemId
      setActiveProblemId(pid)
      const prob = pid ? working.problems[pid] : undefined
      if (prob && requiresShowWork(working, prob)) {
        setShowSteps(true)
        setSteps(['', ''])
      } else {
        setShowSteps(false)
        setSteps([''])
      }
    }
    setAnswer('')
    setFeedback('')
    setFeedbackTone(null)
    setFeedbackNextSteps([])
    setHintCount(0)
    setWrongEscalation(0)
    setView('activity')
  }

  function submitQuickRepairStep() {
    if (!state?.quickRepair) return
    const skill = state.skills[state.quickRepair.skillId]
    if (state.quickRepair.phase === 'explain') {
      update(advanceQuickRepair(state, true))
      setFeedback(skill ? quickRepairExplanation(skill).summary : '')
      return
    }
    if (!activeProblem) return
    const result = checkAnswer({
      expected: activeProblem.expectedAnswer,
      actual: answer,
      variables: ['x', 'n'],
      skillIds: activeProblem.skillIds,
    })
    let next = recordAttempt(state, {
      problemId: activeProblem.id,
      skillIds: activeProblem.skillIds,
      answer,
      correct: result.correct,
      mode: 'guided',
      hintCount,
      seconds: 90,
      mixed: state.quickRepair.phase === 'mixed_check',
      delayed: state.quickRepair.phase === 'mixed_check',
      mistakeTags: result.mistakeTags,
    })
    next = advanceQuickRepair(next, result.correct)
    if (next.quickRepair?.phase === 'complete') {
      next = clearQuickRepair(next)
      next = { ...next, onboarded: true }
      setView('today')
    }
    update(next)
    setFeedback(result.feedback)
    setAnswer('')
    void syncAttemptRecord(next.attempts[0])
  }

  async function submitAnswer() {
    if (!state) return
    if (state.quickRepair && (state.quickRepair.phase === 'explain' || !activeProblem)) {
      submitQuickRepairStep()
      return
    }
    if (!activeProblem) return
    const raw = await checkAnswerAsync({
      expected: activeProblem.expectedAnswer,
      actual: answer,
      variables: ['x', 'n'],
      skillIds: activeProblem.skillIds,
    })
    const resolved = resolveAnswerDisagreement(
      raw,
      state.pendingCodexAnswer?.correct,
      state.pendingCodexAnswer?.feedback,
    )
    const result = { ...raw, correct: resolved.correct, feedback: resolved.feedback, method: resolved.method }
    const clearPending = state.pendingCodexAnswer
      ? { ...state, pendingCodexAnswer: undefined }
      : state

    if (state.testOut && !state.testOut.completed) {
      const next = submitTestOutAnswer(state, result.correct)
      if (next.testOutResult === 'passed') {
        const weak = next.testOut?.skillId ?? gateSkillId
        if (weak) {
          const applied = applyTestOutResult(clearTestOut(next), weak, true)
          update(pushToast(applied.state, 'Test-out passed — nice work.', 'success'))
          startAction()
          return
        }
      }
      if (next.testOutResult === 'failed') {
        const weak = next.testOut?.skillId
        if (weak) {
          const applied = applyTestOutResult(clearTestOut(next), weak, false)
          update(pushToast(applied.state, 'Test-out not yet — quick repair recommended.', 'warning'))
          setView('today')
          return
        }
      }
      update(pushToast(next, result.feedback, result.correct ? 'success' : 'info'))
      setFeedback(result.feedback)
      setAnswer('')
      return
    }

    let next: MathPilotState
    if (state.diagnostic && !state.diagnostic.completed) {
      next = submitDiagnosticAnswer(clearPending, activeProblem.id, answer, result.correct)
    } else {
      const attemptMode = attemptModeForActivity(activeProblem.mode)
      next = recordAttempt(clearPending, {
        problemId: activeProblem.id,
        skillIds: activeProblem.skillIds,
        answer,
        correct: result.correct,
        mode: attemptMode,
        hintCount,
        seconds: 95 + hintCount * 30,
        mixed: activeProblem.mode === 'mixed_review' || activeProblem.mode === 'diagnostic',
        delayed: activeProblem.mode === 'mixed_review',
        mistakeTags: result.mistakeTags,
        confidence: shouldRecordConfidence(clearPending, activeProblem) ? confidence : undefined,
        steps: showSteps ? steps.filter(Boolean) : undefined,
      })
    }

    let merged = {
      ...next,
      changelog: [
        `${new Date().toISOString()}: Attempt saved for ${activeProblem.title}; correctness=${result.correct}.`,
        ...next.changelog,
      ],
    }
    if (state.dailySession) {
      merged = advanceDailySession(merged)
    }
    const lastAttempt = merged.attempts[0]
    if (lastAttempt) {
      merged = evaluateContinuingDiagnostic(merged, lastAttempt)
    }
    const mode = attemptModeForActivity(activeProblem.mode)
    const styled = feedbackForMode(mode, result, hintCount, wrongEscalation)
    setWrongEscalation(result.correct ? 0 : styled.nextEscalation)
    update(pushToast(merged, result.correct ? motivationLine(state, 'correct') : 'Attempt saved', result.correct ? 'success' : 'info'))
    setFeedback(result.correct ? styled.message : styled.nextMove)
    setFeedbackTone(styled.tone)
    setFeedbackNextSteps(styled.nextSteps)
    if (showSteps && steps.some(Boolean)) {
      const stepGrade = await gradeStepsAsync(
        steps.filter(Boolean),
        activeProblem.expectedAnswer,
        activeProblem.skillIds,
      )
      const stepNote = stepGrade.stepFeedback.join(' ')
      setFeedback(result.correct ? `${styled.message}\n${stepNote}` : `${styled.nextMove} ${stepNote}`)
    }
    setAnswer('')
    void syncAttemptRecord(merged.attempts[0])
    void syncSkillMasteryNotes(merged, activeProblem.skillIds)

    if (next.diagnostic?.completed && next.diagnostic.summary) {
      if (next.diagnostic.continuing) {
        update(
          pushToast(
            clearContinuingDiagnosticPending({ ...next }),
            'Continuing diagnostic complete',
            'success',
          ),
        )
        setView('today')
        return
      }
      update(
        pushToast(
          { ...next, postDiagnosticPending: true, onboarded: true },
          'Initial knowledge map created',
          'success',
        ),
      )
      setView('today')
      return
    }
  }

  async function requestHelp(task: string, manualOnly = false) {
    if (!state) return
    const memory = await ensureMemoryLoaded()
    const skills = await loadSkillsForPrompt(task, activeProblem?.skillIds ?? [])
    const { sessionId, resume, state: sessionState } = (
      await import('../domain/aiAdapter')
    ).resolveCodexSession(state, task, activeProblem)
    const draft = createPromptPacket(sessionState, task, activeProblem, answer, memory, skills, {
      sessionId,
      resume,
    })
    setPacket(draft)
    if (manualOnly || state.developerModeEnabled) {
      update(logManualPacket(sessionState, task, draft))
      return
    }
    setCodexBusy(true)
    const callId = createCodexCallId()
    setCodexCallId(callId)
    const { state: logged, result } = await invokeCodexForTask(sessionState, task, {
      problem: activeProblem,
      userAttempt: answer,
      memoryLines: memory,
      skillBodies: skills,
      callId,
    })
    setCodexBusy(false)
    setCodexCallId(null)
    const parsed = parseCodexResponse(result.stdout)
    const next = parsed ? applyCodexResponse(logged, parsed) : logged
    update(next)
    if (parsed?.feedback_to_user) setFeedback(parsed.feedback_to_user)
    else if (!result.ok) {
      if (result.timedOut) {
        setFeedback(result.stderr || 'Codex timed out — try again or use a manual packet.')
      } else if (result.cancelled) {
        setFeedback('Codex call cancelled.')
      } else {
        const offline = offlineHelpForTask(state, task, activeProblem)
        setFeedback(offline.feedback)
        if (offline.suggestRepair) {
          update({
            ...next,
            codexHint: {
              kind: 'quick_repair',
              title: 'Suggested repair',
              skillIds: [offline.suggestRepair],
              reason: offline.feedback,
              cta: 'Start quick repair',
            },
          })
        }
      }
    }
  }

  async function cancelCodex() {
    const cancelled = await cancelCodexCli(codexCallId ?? undefined)
    if (cancelled) {
      setCodexBusy(false)
      setCodexCallId(null)
      setFeedback('Codex call cancelled.')
    }
  }

  function importResources(json: string): { ok: boolean; errors: string[]; imported: number } {
    if (!state) return { ok: false, errors: ['App not ready.'], imported: 0 }
    const { resources, errors } = parseResourceImport(json)
    if (resources.length === 0) {
      return { ok: false, errors: errors.length ? errors : ['No valid resources found.'], imported: 0 }
    }
    update(mergeImportedResources(state, resources))
    return { ok: true, errors, imported: resources.length }
  }

  function generatePacket(task: string) {
    void requestHelp(task, true)
  }

  async function testCodexConnection() {
    if (!state) return
    setCodexPingBusy(true)
    setCodexPingStatus(null)
    const result = await invokeCodexCli(
      JSON.stringify({ task: 'ping', message: 'MathPilot connectivity check — reply with {"ok":true}.' }),
      'ping',
      'maintenance_session',
    )
    setCodexPingBusy(false)
    setCodexPingStatus(
      result.ok
        ? `Codex CLI OK${result.stdout ? `: ${result.stdout.slice(0, 160)}` : ''}`
        : `Codex CLI failed: ${result.stderr || 'unknown error'}`,
    )
  }

  async function analyzeHomework(
    payload: { text: string; imageDataUrl?: string; imageFileName?: string },
    saveRawImage = false,
  ) {
    if (!state) return
    setHomeworkAnalyzing(true)
    try {
      const { state: next, analysis } = await analyzeHomeworkDeep(state, {
        problemText: payload.text,
        imageDataUrl: payload.imageDataUrl,
        imageFileName: payload.imageFileName,
        saveRawImage,
      })
      let merged = next
      if (saveRawImage && payload.imageDataUrl) {
        const path = await saveHomeworkImageFile(analysis.id, payload.imageDataUrl, true)
        if (path) {
          merged = {
            ...merged,
            homeworkAnalyses: merged.homeworkAnalyses.map((h) =>
              h.id === analysis.id ? { ...h, imagePath: path } : h,
            ),
          }
        }
      }
      update(pushToast(merged, 'Homework analyzed', 'success'))
      setHomeworkText('')
    } finally {
      setHomeworkAnalyzing(false)
    }
  }

  function chooseFocus(focus: CourseFocus) {
    const fresh = createInitialState(focus)
    update({
      ...fresh,
      currentFocus: focus,
      onboarded: false,
      changelog: [`${new Date().toISOString()}: Course focus set to ${focus}.`, ...fresh.changelog],
    })
    setOnboardingStep('confirm_diagnostic')
  }

  function beginDiagnostic() {
    if (!state) return
    const base = state.skills[Object.keys(state.skills)[0]] ? state : createInitialState(state.currentFocus)
    const { state: withDiag } = startDiagnostic(base)
    update(withDiag)
    setOnboardingStep('diagnostic')
    setView('activity')
  }

  function setPace(pace: SessionPace) {
    if (!state) return
    update(startDailySession(state, pace))
  }

  function setCustomPace(adjustments: NonNullable<MathPilotState['customPaceAdjustments']>) {
    if (!state) return
    const withCustom = { ...state, customPaceAdjustments: adjustments, sessionPace: 'custom' as const }
    update(startDailySession(withCustom, 'custom'))
  }

  function beginTestOut() {
    if (!state) return
    const gate = gateSkillId ? checkPrerequisiteGate(state, gateSkillId) : null
    const skillId = gate?.weakSkillId ?? gateSkillId
    if (!skillId) return
    const { state: next } = startTestOut(state, skillId)
    update(next)
    setGateSkillId(undefined)
    setView('activity')
  }

  function startRepairFromHomework(skillId: string) {
    if (!state) return
    update(startQuickRepair(state, skillId))
    setActiveProblemId(undefined)
    setView('activity')
  }

  function saveHomeworkWorkedExample(analysisId: string) {
    if (!state) return
    update(saveHomeworkAsWorkedExample(state, analysisId))
  }

  function handleOverride() {
    if (!state || !gateSkillId) return
    update(logOverride(state, gateSkillId, 'User continued despite weak prerequisite'))
    setGateSkillId(undefined)
    startAction(nextAction?.problemId)
  }

  return {
    loading: !state || !nextAction,
    appState: state,
    action: nextAction,
    activeProblem,
    areaGroups,
    view,
    setView,
    activeProblemId,
    answer,
    setAnswer,
    feedback,
    feedbackTone,
    feedbackNextSteps,
    hintCount,
    setHintCount,
    packet,
    homeworkText,
    setHomeworkText,
    gateSkillId,
    setGateSkillId,
    paletteOpen,
    setPaletteOpen,
    confidence,
    setConfidence,
    steps,
    setSteps,
    lostOpen,
    setLostOpen,
    showSteps,
    setShowSteps,
    codexBusy,
    codexCallId,
    cancelCodex,
    importResources,
    onboardingStep,
    setOnboardingStep,
    expandedAreas,
    setExpandedAreas,
    homeworkAnalyzing,
    showFormulaRecall,
    setShowFormulaRecall,
    whyOpen,
    setWhyOpen,
    mapViewMode,
    setMapViewMode,
    codexPaste,
    setCodexPaste,
    showReport,
    setShowReport,
    homeworkUploadOpen,
    setHomeworkUploadOpen,
    wrongEscalation,
    mathFieldRef,
    update,
    startAction,
    submitAnswer,
    requestHelp,
    generatePacket,
    analyzeHomework,
    chooseFocus,
    beginDiagnostic,
    setPace,
    setCustomPace,
    beginTestOut,
    handleOverride,
    startRepairFromHomework,
    saveHomeworkWorkedExample,
    skillActionId,
    setSkillActionId,
    dismissPostDiagnostic: () => {
      if (!state) return
      update({ ...state, postDiagnosticPending: false })
    },
    onVideoInterrupt: (reason: string) => setFeedback(reason),
    testCodexConnection,
    codexPingStatus,
    codexPingBusy,
  }
}
