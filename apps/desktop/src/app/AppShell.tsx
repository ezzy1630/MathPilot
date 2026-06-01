import { useEffect, useState } from 'react'
import { Activity, Map, Settings, Sparkles } from 'lucide-react'
import { BrandMark } from '../components/BrandMark'
import { CommandPalette, type PaletteCommand } from '../components/CommandPalette'
import { LoadingShell } from '../components/LoadingShell'
import { PostDiagnosticScreen } from '../components/PostDiagnosticScreen'
import { SkillActionModal } from '../components/SkillActionModal'
import { WhyPanel } from '../components/WhyPanel'
import { ToastStack } from '../ui'
import { PythonStatusBanner } from '../components/PythonStatusBanner'
import { initNativeChrome, isTauriRuntime } from '../lib/nativeChrome'
import { AttemptHistoryPanel } from '../components/AttemptHistoryPanel'
import { HomeworkUpload } from '../components/HomeworkUpload'
import { SyllabusMappingModal } from '../components/SyllabusMappingModal'
import { clearContinuingDiagnosticPending } from '../domain/continuingDiagnostics'
import { ProgressReport } from '../components/ProgressReport'
import { Modal } from '../ui/Modal'
import { completeActiveVideoPostCheck } from '../domain/activeVideoMode'
import { startDiagnostic } from '../domain/diagnosticEngine'
import { currentSessionPhase } from '../domain/dailySessionEngine'
import { generateProblemForSkill } from '../domain/problemGenerator'
import { runMaintenance } from '../domain/maintenance'
import { batchVerifyProblemBank } from '../domain/problemBank'
import { applyApprovedCodeChange, rollbackCodeChange } from '../domain/codeSelfImprovement'
import { checkPrerequisiteGate } from '../domain/sessionEngine'
import { applyCodexResponse, parseCodexResponse } from '../domain/codexParser'
import { resetState } from '../domain/storage'
import { dismissToast, pushToast } from '../ui'
import { problemForSkill } from '../lib/mapHelpers'
import {
  ActivityView,
  DeveloperView,
  KnowledgeMap,
  NavButton,
  Onboarding,
  PrerequisiteModal,
  Resources,
  SettingsView,
  TodayView,
} from '../views/AppViews'
import type { AppView } from './types'
import { useMathPilotApp } from './useMathPilotApp'

export function AppShell() {
  const app = useMathPilotApp()
  const [batchVerifyBusy, setBatchVerifyBusy] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [syllabusMappingOpen, setSyllabusMappingOpen] = useState(false)
  const homeworkDropReady = !app.loading && Boolean(app.appState?.onboarded)
  const analyzeHomeworkForDrop = app.analyzeHomework
  const setViewForDrop = app.setView
  const homeworkTextForDrop = app.homeworkText

  useEffect(() => {
    void initNativeChrome()
  }, [])

  useEffect(() => {
    if (app.loading || !isTauriRuntime()) return
    const { setView, setPaletteOpen, startAction } = app
    const handlers: Record<string, () => void> = {
      'menu://view_today': () => setView('today'),
      'menu://view_map': () => setView('map'),
      'menu://view_resources': () => setView('resources'),
      'menu://view_palette': () => setPaletteOpen(true),
      'menu://session_continue': () => startAction(),
      'menu://session_homework': () => setView('today'),
    }
    let cancelled = false
    const unsubs: Array<() => void> = []
    void import('@tauri-apps/api/event').then(({ listen }) => {
      if (cancelled) return
      for (const [event, run] of Object.entries(handlers)) {
        void listen(event, () => run()).then((unlisten) => unsubs.push(unlisten))
      }
    })
    return () => {
      cancelled = true
      unsubs.forEach((u) => u())
    }
    // Menu shortcuts only need stable handlers once the shell is loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bind Tauri menu once per load
  }, [app.loading])

  useEffect(() => {
    if (!homeworkDropReady) return
    const onDragOver = (event: DragEvent) => {
      if (event.dataTransfer?.types.includes('Files')) event.preventDefault()
    }
    const onDrop = (event: DragEvent) => {
      const file = event.dataTransfer?.files[0]
      if (!file?.type.startsWith('image/')) return
      event.preventDefault()
      const reader = new FileReader()
      reader.onload = () => {
        const url = typeof reader.result === 'string' ? reader.result : undefined
        if (url) {
          void analyzeHomeworkForDrop({ text: homeworkTextForDrop, imageDataUrl: url, imageFileName: file.name }, false)
          setViewForDrop('today')
        }
      }
      reader.readAsDataURL(file)
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [analyzeHomeworkForDrop, homeworkDropReady, homeworkTextForDrop, setViewForDrop])

  useEffect(() => {
    if (!homeworkDropReady) return
    const onPaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (!file) continue
          const reader = new FileReader()
          reader.onload = () => {
            const url = typeof reader.result === 'string' ? reader.result : undefined
            if (url) {
              void analyzeHomeworkForDrop({ text: homeworkTextForDrop, imageDataUrl: url, imageFileName: 'pasted.png' }, false)
              setViewForDrop('today')
            }
          }
          reader.readAsDataURL(file)
          event.preventDefault()
          return
        }
      }
      const text = event.clipboardData?.getData('text/plain')?.trim()
      if (text && text.length > 40 && text.includes('=')) {
        void analyzeHomeworkForDrop({ text }, false)
        setViewForDrop('today')
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [analyzeHomeworkForDrop, homeworkDropReady, homeworkTextForDrop, setViewForDrop])

  if (app.loading || !app.appState || !app.action) {
    return <LoadingShell />
  }

  const appState = app.appState
  const action = app.action

  const {
    activeProblem,
    areaGroups,
    view,
    setView,
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
    testCodexConnection,
    codexPingStatus,
    codexPingBusy,
    showReport,
    setShowReport,
    homeworkUploadOpen,
    setHomeworkUploadOpen,
    mathFieldRef,
    update,
    startAction,
    submitAnswer,
    requestHelp,
    generatePacket,
    analyzeHomework,
    onVideoInterrupt,
    chooseFocus,
    setPace,
    beginTestOut,
    handleOverride,
    startRepairFromHomework,
    saveHomeworkWorkedExample,
    beginDiagnostic,
    skillActionId,
    setSkillActionId,
    dismissPostDiagnostic,
  } = app

  const themeClass =
    appState.preferences?.theme === 'dark'
      ? 'theme-dark'
      : appState.preferences?.theme === 'light'
        ? 'theme-light'
        : ''

  const hasActiveDiagnostic = appState.diagnostic !== undefined && !appState.diagnostic.completed
  const showMain = appState.onboarded || appState.diagnostic?.completed

  function navigate(nextView: AppView) {
    if (hasActiveDiagnostic && !showMain && nextView !== 'activity') {
      setView('activity')
      return
    }
    if (
      hasActiveDiagnostic &&
      view === 'activity' &&
      nextView !== 'activity' &&
      nextView !== 'today'
    ) {
      const ok = window.confirm('Pause the diagnostic? Your progress is saved, and Resume diagnostic will stay available.')
      if (!ok) return
    }
    setView(nextView)
  }

  const paletteCommands: PaletteCommand[] = [
    { id: 'review', label: hasActiveDiagnostic ? 'Resume diagnostic' : 'Start review', group: 'Learn', icon: 'review', keywords: 'spaced diagnostic activity', run: () => startAction() },
    { id: 'hw', label: 'Review homework', group: 'Learn', icon: 'homework', keywords: 'homework photo upload inline', run: () => setHomeworkUploadOpen(true) },
    { id: 'diag', label: 'Start diagnostic', group: 'Learn', icon: 'diagnostic', keywords: 'assessment', run: () => {
      update(startDiagnostic(appState).state)
      setView('activity')
    } },
    { id: 'map', label: 'Knowledge map', group: 'Navigate', icon: 'map', keywords: 'mastery', run: () => navigate('map') },
    { id: 'weak', label: 'Weak skills', group: 'Navigate', icon: 'map', keywords: 'repair', run: () => navigate('map') },
    { id: 'res', label: 'Resources', group: 'Navigate', icon: 'resources', keywords: 'video khan', run: () => navigate('resources') },
    { id: 'settings', label: 'Settings', group: 'Navigate', icon: 'settings', keywords: 'preferences', run: () => navigate('settings') },
    { id: 'maint', label: 'Run maintenance', group: 'Maintain', icon: 'maintain', keywords: 'backup', run: () => update(runMaintenance(appState)) },
    { id: 'report', label: 'Progress report', group: 'Maintain', icon: 'report', keywords: 'analytics', run: () => setShowReport(true) },
    {
      id: 'history',
      label: 'Attempt history',
      group: 'Navigate',
      icon: 'review',
      keywords: 'attempts mistakes search',
      run: () => setHistoryOpen(true),
    },
    {
      id: 'dev',
      label: 'Developer mode',
      group: 'Maintain',
      icon: 'developer',
      keywords: 'codex logs',
      run: () => {
        update({ ...appState, developerModeEnabled: true })
        setView('developer')
      },
    },
  ]

  const showSessionNav = view === 'activity' || hasActiveDiagnostic || Boolean(appState.testOut && !appState.testOut.completed)
  const renderActivity = view === 'activity'

  return (
    <main className={`app-shell ${themeClass} ${appState.developerModeEnabled ? 'developer-shell' : ''}`}>
      <a href="#app-main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="titlebar-drag" data-tauri-drag-region aria-hidden />
      <ToastStack state={appState} onDismiss={(id) => update(dismissToast(appState, id))} />
      <aside className="rail" aria-label="MathPilot navigation">
        <div className="rail-chrome">
          <div className="rail-traffic-spacer" aria-hidden />
          <button className="brand" onClick={() => navigate('today')} aria-label="MathPilot home">
            <BrandMark size={24} />
            <span>MathPilot</span>
          </button>
        </div>
        <NavButton active={view === 'today'} icon={<Activity size={19} />} label="Today" onClick={() => navigate('today')} />
        {showSessionNav && (
          <NavButton
            active={view === 'activity'}
            icon={<Sparkles size={19} />}
            label={hasActiveDiagnostic ? 'Diagnostic' : 'Activity'}
            onClick={() => setView('activity')}
          />
        )}
        {showMain && (
          <NavButton
            active={view === 'map'}
            icon={<Map size={19} />}
            label="Knowledge map"
            onClick={() => navigate('map')}
          />
        )}
        <div className="rail-spacer" />
        <button type="button" className="rail-hint" onClick={() => setPaletteOpen(true)} title="Command palette (⌘K)">
          ⌘K
        </button>
        {showMain && (
          <NavButton
            active={view === 'settings'}
            icon={<Settings size={19} />}
            label="Settings"
            onClick={() => navigate('settings')}
          />
        )}
      </aside>

      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          commands={paletteCommands}
          state={appState}
          onSearchSelect={(hit) => {
            if (hit.kind === 'resource') {
              setView('resources')
              return
            }
            if (hit.skillId) {
              setSkillActionId(hit.skillId)
              return
            }
            if (hit.kind === 'problem') {
              startAction(hit.id.replace('problem-', ''))
              setView('activity')
            }
          }}
        />
      )}

      {whyOpen && action && (
        <WhyPanel
          action={action}
          studyPlan={appState.studyPlan}
          onClose={() => setWhyOpen(false)}
          onOpenMap={() => {
            setWhyOpen(false)
            navigate('map')
          }}
        />
      )}

      {historyOpen && (
        <Modal title="Attempt history" onClose={() => setHistoryOpen(false)}>
          <AttemptHistoryPanel state={appState} onClose={() => setHistoryOpen(false)} />
        </Modal>
      )}

      {syllabusMappingOpen && (appState.syllabusMapping?.length ?? 0) > 0 && (
        <Modal title="Syllabus alignment" onClose={() => setSyllabusMappingOpen(false)}>
          <SyllabusMappingModal
            state={appState}
            onToggleTopic={(topic, accepted) => {
              const nextMapping = (appState.syllabusMapping ?? []).map((entry) =>
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
                ...appState,
                syllabusMapping: nextMapping,
                syllabus: appState.syllabus
                  ? { ...appState.syllabus, items: acceptedItems }
                  : appState.syllabus,
              })
            }}
            onDone={() => setSyllabusMappingOpen(false)}
          />
        </Modal>
      )}

      {homeworkUploadOpen && (
        <Modal title="Upload homework" onClose={() => setHomeworkUploadOpen(false)}>
          <HomeworkUpload
            text={homeworkText}
            onTextChange={setHomeworkText}
            onAnalyze={(payload, saveRaw) => {
              void analyzeHomework(payload, saveRaw)
              setHomeworkUploadOpen(false)
              navigate('today')
            }}
          />
          {homeworkAnalyzing && <p className="eyebrow">Analyzing homework...</p>}
        </Modal>
      )}

      {gateSkillId && (
        <PrerequisiteModal
          gate={checkPrerequisiteGate(appState, gateSkillId)}
          onRepair={() => {
            const weak = checkPrerequisiteGate(appState, gateSkillId).weakSkillId
            setView('activity')
            if (weak) startAction(problemForSkill(appState, weak))
          }}
          onTestOut={beginTestOut}
          onOverride={handleOverride}
          onClose={() => setGateSkillId(undefined)}
        />
      )}

      {skillActionId && (
        <SkillActionModal
          skillId={skillActionId}
          state={appState}
          onClose={() => setSkillActionId(undefined)}
          onRepair={() => {
            startRepairFromHomework(skillActionId)
            setSkillActionId(undefined)
          }}
          onReview={() => {
            startAction(problemForSkill(appState, skillActionId))
            setSkillActionId(undefined)
            setView('activity')
          }}
          onLearn={() => {
            startAction(problemForSkill(appState, skillActionId))
            setSkillActionId(undefined)
            setView('activity')
          }}
        />
      )}

      <section id="app-main-content" className="workspace" tabIndex={-1}>
        <PythonStatusBanner />
        {appState.continuingDiagnosticPending && view === 'today' && (
          <div className="continuing-diagnostic-banner panel" role="status">
            <p>
              MathPilot recommends a short continuing diagnostic based on recent mistakes.
            </p>
            <div className="action-row">
              <button
                type="button"
                className="primary"
                onClick={() => {
                  update(startDiagnostic(appState).state)
                  setView('activity')
                }}
              >
                Start continuing diagnostic
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => update(clearContinuingDiagnosticPending(appState))}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        {!appState.onboarded && !appState.diagnostic && (
          <Onboarding
            chooseFocus={chooseFocus}
            beginDiagnostic={beginDiagnostic}
            step={onboardingStep}
            setStep={setOnboardingStep}
          />
        )}
        {appState.postDiagnosticPending && view === 'today' && (
          <PostDiagnosticScreen
            state={appState}
            onContinue={() => {
              dismissPostDiagnostic()
              startAction()
            }}
            onStartRepair={startRepairFromHomework}
            onOpenMap={() => {
              dismissPostDiagnostic()
              navigate('map')
            }}
          />
        )}
        {view === 'today' && showMain && action && !appState.postDiagnosticPending && (
          <TodayView
            state={appState}
            nextAction={action}
            startAction={() => startAction()}
            setView={setView}
            homeworkText={homeworkText}
            setHomeworkText={setHomeworkText}
            analyzeHomework={analyzeHomework}
            homeworkAnalyzing={homeworkAnalyzing}
            showFormulaRecall={showFormulaRecall}
            onFormulaRecallDone={() => setShowFormulaRecall(false)}
            onStartFormulaRecall={() => setShowFormulaRecall(true)}
            onWhy={() => setWhyOpen(true)}
            setPace={setPace}
            sessionPace={appState.sessionPace ?? 'normal'}
            diagnostic={appState.diagnostic}
            onStartRepair={startRepairFromHomework}
            onOpenReport={() => setShowReport(true)}
            onSaveWorkedExample={saveHomeworkWorkedExample}
            onOpenHomework={() => setHomeworkUploadOpen(true)}
            onOpenHistory={() => setHistoryOpen(true)}
          />
        )}
        {renderActivity && (
          <ActivityView
            problem={activeProblem}
            state={appState}
            answer={answer}
            setAnswer={setAnswer}
            feedback={feedback}
            feedbackTone={feedbackTone}
            feedbackNextSteps={feedbackNextSteps}
            hintCount={hintCount}
            setHintCount={setHintCount}
            submitAnswer={() => void submitAnswer()}
            generatePacket={generatePacket}
            requestHelp={(task) => void requestHelp(task)}
            codexBusy={codexBusy}
            mathFieldRef={mathFieldRef}
            startAction={startAction}
            diagnosticProgress={
              appState.diagnostic && !appState.diagnostic.completed
                ? `${appState.diagnostic.answeredCount + 1}/${appState.diagnostic.targetCount}`
                : appState.testOut && !appState.testOut.completed
                  ? `Test-out ${appState.testOut.currentIndex + 1}/${appState.testOut.queue.length}`
                  : undefined
            }
            quickRepair={appState.quickRepair}
            sessionPhase={currentSessionPhase(appState)}
            confidence={confidence}
            setConfidence={setConfidence}
            showSteps={showSteps}
            setShowSteps={setShowSteps}
            steps={steps}
            setSteps={setSteps}
            lostOpen={lostOpen}
            setLostOpen={setLostOpen}
            onVideoPostCheck={(passed) => update(completeActiveVideoPostCheck(appState, passed))}
            onVideoInterrupt={onVideoInterrupt}
            homeworkText={homeworkText}
            setHomeworkText={setHomeworkText}
            analyzeHomework={analyzeHomework}
            homeworkAnalyzing={homeworkAnalyzing}
            wrongEscalation={app.wrongEscalation}
          />
        )}
        {view === 'map' && showMain && action && (
          <KnowledgeMap
            state={appState}
            groups={areaGroups}
            startAction={startAction}
            expandedAreas={expandedAreas}
            setExpandedAreas={setExpandedAreas}
            onSkillSelect={(id) => setSkillActionId(id)}
            highlightSkillIds={action.skillIds}
            viewMode={mapViewMode}
            onToggleView={() =>
              setMapViewMode((m) => (m === 'wheel' ? 'list' : m === 'list' ? 'tree' : 'wheel'))
            }
          />
        )}
        {view === 'resources' && appState.onboarded && <Resources state={appState} update={update} />}
        {showReport && appState.onboarded && (
          <ProgressReport state={appState} onClose={() => setShowReport(false)} />
        )}
        {view === 'settings' && (
          <SettingsView
            state={appState}
            update={update}
            chooseFocus={chooseFocus}
            reset={() => update(resetState(appState.currentFocus))}
            openDeveloper={() => setView('developer')}
            codexPaste={codexPaste}
            setCodexPaste={setCodexPaste}
            onApplyCodexPaste={() => {
              const parsed = parseCodexResponse(codexPaste)
              if (parsed) update(applyCodexResponse(appState, parsed))
            }}
            onSyllabusUploaded={() => setSyllabusMappingOpen(true)}
          />
        )}
        {view === 'developer' && appState.developerModeEnabled && (
          <div className="developer-page">
            <DeveloperView
              state={appState}
              packet={packet}
              generatePacket={generatePacket}
              runMaintenance={() => update(runMaintenance(appState, 'developer'))}
              onGenerateProblem={(skillId) => {
                const result = generateProblemForSkill(appState, skillId)
                if (result) update(result.state)
              }}
              onRestoreBackup={(payload) => {
                try {
                  const restored = JSON.parse(payload) as typeof appState
                  update(pushToast(restored, 'Backup restored', 'success'))
                } catch {
                  update(pushToast(appState, 'Invalid backup file', 'warning'))
                }
              }}
              onTestCodex={() => void testCodexConnection()}
              codexPingStatus={codexPingStatus}
              codexPingBusy={codexPingBusy}
              showFullPrompts={appState.preferences?.developerShowFullPrompts ?? false}
              onToggleShowFullPrompts={(enabled) =>
                update({
                  ...appState,
                  preferences: {
                    tone: appState.preferences?.tone ?? 'warm',
                    gamificationLevel: appState.preferences?.gamificationLevel ?? 'minimal',
                    notificationsEnabled: appState.preferences?.notificationsEnabled ?? false,
                    reportsMode: appState.preferences?.reportsMode ?? 'on_demand_only',
                    activeVideoMode: appState.preferences?.activeVideoMode ?? 'sometimes',
                    theme: appState.preferences?.theme ?? 'system',
                    confidencePrompts: appState.preferences?.confidencePrompts ?? 'review_only',
                    developerShowFullPrompts: enabled,
                  },
                })
              }
              batchVerifyBusy={batchVerifyBusy}
              onBatchVerifyBank={() => {
                setBatchVerifyBusy(true)
                void batchVerifyProblemBank(appState, 50).then(({ state, result }) => {
                  update(
                    pushToast(
                      state,
                      `Verified ${result.checked}: ${result.promoted} promoted, ${result.failed} failed`,
                      'success',
                    ),
                  )
                  setBatchVerifyBusy(false)
                })
              }}
              onApplyCodeChange={(id) => {
                void applyApprovedCodeChange(appState, id).then((next) =>
                  update(pushToast(next, 'Code patches applied', 'success')),
                )
              }}
              onRollbackCodeChange={(id) => {
                void rollbackCodeChange(appState, id).then((next) =>
                  update(pushToast(next, 'Code change rolled back', 'info')),
                )
              }}
              onUpdateState={(next) => update(pushToast(next, 'Developer state updated', 'info'))}
            />
          </div>
        )}
      </section>
    </main>
  )
}
