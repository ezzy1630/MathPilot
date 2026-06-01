export type CourseFocus = 'Calculus 1' | 'Calculus 2'

export type MasteryState =
  | 'Unknown'
  | 'Weak'
  | 'Learning'
  | 'Developing'
  | 'Solid'
  | 'Mastered'
  | 'Needs Review'
  | 'Decayed'

export type ActivityKind =
  | 'diagnostic'
  | 'quick_repair'
  | 'guided_practice'
  | 'independent_practice'
  | 'mixed_review'
  | 'resource_watch'
  | 'homework_review'
  | 'retrieval_warmup'
  | 'concept_input'
  | 'worked_example'
  | 'formula_recall'
  | 'syllabus_task'

export interface Skill {
  id: string
  name: string
  area: string
  course: CourseFocus | 'Prerequisite'
  type: 'procedural' | 'conceptual' | 'mixed'
  prerequisites: string[]
  supports: string[]
  commonMistakes: string[]
  resources: string[]
}

export interface MasteryRecord {
  skillId: string
  masteryScore: number
  masteryState: MasteryState
  fluencyScore: number
  retentionScore: number
  conceptualScore: number
  proceduralScore: number
  transferScore: number
  evidenceCount: number
  recentFailures: number
  lastPracticed?: string
  reviewDue?: string
  delayedMixedCorrect?: number
}

export interface Problem {
  id: string
  title: string
  prompt: string
  skillIds: string[]
  difficulty: number
  mode: ActivityKind
  answerType: 'expression' | 'text' | 'choice'
  expectedAnswer: string
  workedExample?: string[]
  hintSequence: string[]
  choices?: string[]
  verificationStatus?: 'verified' | 'unverified_used' | 'deprecated'
  source?: string
  deprecated?: boolean
  deprecationReason?: string
  attemptCount?: number
  requiresShowWork?: boolean
  /** e.g. 'transfer', 'misconception:chain_rule_inner' */
  tags?: string[]
}

export interface AttemptInput {
  problemId: string
  skillIds: string[]
  answer: string
  correct: boolean
  mode: 'diagnostic' | 'guided' | 'independent' | 'review' | 'homework'
  hintCount: number
  seconds: number
  mixed: boolean
  delayed: boolean
  mistakeTags?: string[]
  confidence?: number
  steps?: string[]
  sessionId?: string
  answerLatex?: string
  partialCredit?: number
  attemptNumber?: number
  feedbackSummary?: string
  /** Links practice attempt to a resource the student watched beforehand. */
  resourceId?: string
}

export interface AttemptRecord extends AttemptInput {
  id: string
  createdAt: string
  masteryDelta: number
  confidence?: number
  /** Fluency score change on the primary skill for this attempt. */
  fluencyDelta?: number
  /** 0–1 proxy from text-answer length when correct (conceptual retrieval). */
  conceptualQuality?: number
}

export interface ReviewItem {
  id: string
  skillId: string
  due: string
  intervalDays: number
  priority: number
  reason: string
  reviewType?: 'procedural' | 'concept' | 'method_selection' | 'graph_interpretation' | 'explain_in_words' | 'recall' | 'transfer' | 'mistake_correction'
  /** FSRS-4 card state when using true spaced repetition scheduler. */
  fsrs?: {
    stability: number
    difficulty: number
    scheduled_days: number
    reps: number
    lapses: number
    state: number
    last_review?: string
    due?: string
  }
}

export interface MistakePattern {
  tag: string
  skillIds: string[]
  count: number
  lastSeen: string
  note: string
}

export interface ResourceRecord {
  id: string
  title: string
  source: string
  url: string
  skillIds: string[]
  duration: string
  format: 'video' | 'article' | 'notes'
  effectivenessScore: number
  notes: string
}

export interface ResourceEvent {
  id: string
  resourceId: string
  eventType: 'helpful' | 'not_helpful' | 'watched' | 'post_check'
  helpful?: boolean
  createdAt: string
}

export interface NextAction {
  kind: ActivityKind
  title: string
  reason: string
  skillIds: string[]
  problemId?: string
  cta: string
}

export interface CoachInsight {
  updatedAt: string
  narrative: string
  gapBullets: string[]
  mapHighlightSkillIds: string[]
  source: 'deterministic' | 'codex'
}

export interface AiCallLog {
  id: string
  createdAt: string
  task: string
  mode: 'codex_cli' | 'manual_packet'
  promptPreview: string
  promptHash?: string
  status: 'drafted' | 'sent' | 'received' | 'failed'
}

export interface HomeworkAnalysis {
  id: string
  createdAt: string
  detectedTopic: string
  problemText: string
  extractedWorkSummary: string
  correctness: 'correct' | 'incorrect' | 'unclear'
  mistakeTags: string[]
  skillsAffected: string[]
  feedbackSummary: string
  rawImageSaved: boolean
  imagePath?: string
  stepFeedback?: Array<{ step: string; correct: boolean; note: string; index?: number }>
  repairRecommendation?: { skillId: string; reason: string }
  /** Structured steps from Codex with optional wrong-step index. */
  steps?: Array<{ label: string; work: string; correct: boolean; note?: string }>
  wrongStepIndex?: number
  detectedProblems?: Array<{
    label: string
    problemText: string
    correctness: 'correct' | 'incorrect' | 'unclear'
    mistakeTags: string[]
  }>
  savedAsWorkedExample?: boolean
}

export interface OverrideLog {
  skillId: string
  at: string
  kind: 'override' | 'test_out_pass'
  reason?: string
}

export interface DiagnosticSessionState {
  id: string
  startedAt: string
  targetCount: number
  answeredCount: number
  currentIndex: number
  queue: string[]
  weakSkills: string[]
  strongSkills: string[]
  completed: boolean
  summary?: {
    strong: string[]
    weak: string[]
    recommendedNext: string
    recommendedSkillIds: string[]
  }
}

export interface MaintenanceRunRecord {
  id: string
  startedAt: string
  endedAt: string
  trigger: string
  jobsRun: string[]
  changesMade: string[]
  backupsCreated: string[]
  skillsUpdated: string[]
  memoriesUpdated: string[]
  problemBankChanges: string[]
  resourceRankChanges: string[]
  reviewScheduleChanges: string[]
  warnings: string[]
  /** Codex maintenance_curator summary when curator ran successfully or fell back. */
  codexSummary?: string
}

export interface MathPilotState {
  profileName: string
  currentFocus: CourseFocus
  onboarded: boolean
  advancedMode: boolean
  sessionPace?: 'short' | 'normal' | 'deep' | 'low_energy' | 'high_focus' | 'custom'
  /** Optional overrides when sessionPace is `custom`. */
  customPaceAdjustments?: {
    difficultyBias: number
    videoPhaseWeight: number
    reviewIntensity: number
    introduceNewMaterial: boolean
    problemBudget?: number
    explanationLevel?: 'minimal' | 'normal' | 'high'
  }
  skills: Record<string, Skill>
  mastery: Record<string, MasteryRecord>
  problems: Record<string, Problem>
  attempts: AttemptRecord[]
  reviewQueue: ReviewItem[]
  mistakePatterns: Record<string, MistakePattern>
  resources: Record<string, ResourceRecord>
  resourceEvents?: ResourceEvent[]
  aiCalls: AiCallLog[]
  homeworkAnalyses: HomeworkAnalysis[]
  changelog: string[]
  diagnostic?: DiagnosticSessionState
  maintenanceRuns?: MaintenanceRunRecord[]
  overrides?: OverrideLog[]
  developerModeEnabled?: boolean
  quickRepair?: {
    skillId: string
    phase: 'explain' | 'example_1' | 'example_2' | 'practice' | 'mixed_check' | 'complete'
    phaseIndex: number
    problemsAnswered: number
    targetProblems: number
  }
  dailySession?: {
    pace: 'short' | 'normal' | 'deep' | 'low_energy' | 'high_focus' | 'custom'
    phases: ActivityKind[]
    phaseIndex: number
    itemsCompletedInPhase: number
    itemsTargetInPhase: number
    startedAt: string
    difficultyBias?: number
    reviewIntensity?: number
    videoPhaseWeight?: number
    explanationLevel?: 'minimal' | 'normal' | 'high'
  }
  testOut?: {
    skillId: string
    queue: string[]
    currentIndex: number
    correctCount: number
    completed: boolean
  }
  testOutResult?: 'passed' | 'failed'
  lastHomeworkSummary?: string
  coachInsight?: CoachInsight
  codexHint?: Partial<NextAction>
  pendingCodexAnswer?: { correct: boolean; feedback?: string }
  postDiagnosticPending?: boolean
  toastQueue?: Array<{ id: string; message: string; tone: 'success' | 'info' | 'warning' }>
  preferences?: {
    tone: 'direct' | 'warm'
    gamificationLevel: 'minimal' | 'light'
    notificationsEnabled: boolean
    reportsMode: 'on_demand_only'
    enableCodexProblemGen?: boolean
    /** When true (default), run Codex maintenance_curator after deterministic maintenance. */
    enableMaintenanceCurator?: boolean
    activeVideoMode: 'never' | 'sometimes' | 'active'
    theme: 'system' | 'light' | 'dark'
    confidencePrompts: 'off' | 'review_only' | 'often'
    developerShowFullPrompts?: boolean
    videoEmbedPreferred?: boolean
    studyPlanReminderEnabled?: boolean
    studyBlockTime?: string
    studyBlockDays?: number[]
  }
  /** YYYY-MM-DD when the user marked today as a planned study day. */
  plannedStudyToday?: string
  studyPlan?: {
    focus: CourseFocus
    updatedAt: string
    steps: Array<{ skillId: string; skillName: string; action: string; priority: number }>
    summary: string
  }
  syllabus?: {
    course: CourseFocus
    items: Array<{ week: number; topic: string; skillIds: string[] }>
    currentWeek?: number
    extractedDates?: string[]
    extractedExams?: string[]
    extractedTextbookSections?: string[]
  }
  syllabusMapping?: Array<{
    topic: string
    skillIds: string[]
    accepted: boolean
    source: 'upload' | 'default'
  }>
  codexSessions?: Record<string, { sessionId: string; updatedAt: string }>
  /** Incremented when a daily session completes; triggers auto maintenance at 3. */
  sessionsSinceMaintenance?: number
  workedExamples?: Record<string, { problemId: string; steps: string[]; source: string; createdAt: string }>
  continuingDiagnosticPending?: boolean
  /** Set after continuing-diagnostic curator runs for the current pending episode. */
  continuingDiagnosticCuratorRan?: boolean
  /** ISO timestamp of last homework cluster curator Codex pass. */
  homeworkClusterLastRun?: string
  activeVideo?: {
    resourceId: string
    skillIds: string[]
    startedAt: string
    postCheckProblemId?: string
    postCheckPassed?: boolean
  }
  mapHighlightSkillIds?: string[]
  mapViewMode?: 'wheel' | 'list'
  developerState?: {
    pendingDiffPreview?: string
    lastTestRun?: { ok: boolean; output: string; at: string }
  }
  readOnlyExample?: boolean
  codexPasteBuffer?: string
  codeChangeProposals?: Array<{
    id: string
    createdAt: string
    summary: string
    files: string[]
    diffPreview: string
    patches?: Array<{ path: string; content: string }>
    status: 'pending_approval' | 'approved' | 'rejected' | 'applied'
    backupId?: string
    appliedPaths?: string[]
  }>
}
