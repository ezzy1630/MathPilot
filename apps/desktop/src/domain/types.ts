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
}

export interface AttemptRecord extends AttemptInput {
  id: string
  createdAt: string
  masteryDelta: number
  confidence?: number
}

export interface ReviewItem {
  id: string
  skillId: string
  due: string
  intervalDays: number
  priority: number
  reason: string
  reviewType?: 'procedural' | 'concept' | 'method_selection' | 'graph_interpretation' | 'explain_in_words' | 'recall' | 'transfer' | 'mistake_correction'
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

export interface AiCallLog {
  id: string
  createdAt: string
  task: string
  mode: 'codex_cli' | 'manual_packet'
  promptPreview: string
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
  stepFeedback?: Array<{ step: string; correct: boolean; note: string }>
  repairRecommendation?: { skillId: string; reason: string }
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
}

export interface MathPilotState {
  profileName: string
  currentFocus: CourseFocus
  onboarded: boolean
  advancedMode: boolean
  sessionPace?: 'short' | 'normal' | 'deep' | 'low_energy' | 'high_focus' | 'custom'
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
  codexHint?: Partial<NextAction>
  pendingCodexAnswer?: { correct: boolean; feedback?: string }
  postDiagnosticPending?: boolean
  toastQueue?: Array<{ id: string; message: string; tone: 'success' | 'info' | 'warning' }>
  preferences?: {
    tone: 'direct' | 'warm'
    gamificationLevel: 'minimal' | 'light'
    notificationsEnabled: boolean
    reportsMode: 'on_demand_only' | 'weekly'
    activeVideoMode: 'never' | 'sometimes' | 'active'
    theme: 'system' | 'light' | 'dark'
  }
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
  }
  activeVideo?: {
    resourceId: string
    skillIds: string[]
    startedAt: string
    postCheckProblemId?: string
    postCheckPassed?: boolean
  }
  mapHighlightSkillIds?: string[]
  mapViewMode?: 'wheel' | 'list'
  readOnlyExample?: boolean
  codexPasteBuffer?: string
}
