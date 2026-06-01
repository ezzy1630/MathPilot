import { recordAttempt } from './learningEngine'
import type { HomeworkAnalysis, MathPilotState } from './types'

export interface HomeworkStepFeedback {
  step: string
  correct: boolean
  note: string
  index?: number
}

export interface HomeworkRepairRecommendation {
  skillId: string
  reason: string
}

export interface HomeworkLearningInput {
  correctness: HomeworkAnalysis['correctness']
  mistakeTags: string[]
  skillsAffected: string[]
  extractedWorkSummary: string
  stepFeedback?: HomeworkStepFeedback[]
  steps?: HomeworkAnalysis['steps']
  wrongStepIndex?: number
  detectedProblems?: HomeworkAnalysis['detectedProblems']
}

export function inferStepFeedback(input: HomeworkLearningInput): HomeworkStepFeedback[] {
  if (input.stepFeedback?.length) return input.stepFeedback

  if (input.steps?.length) {
    return input.steps.map((step, index) => ({
      step: step.label,
      correct: typeof input.wrongStepIndex === 'number' ? index !== input.wrongStepIndex : step.correct,
      note:
        index === input.wrongStepIndex
          ? step.note ?? 'This step is where the work diverges from the expected approach.'
          : step.note ?? step.work,
      index,
    }))
  }

  const steps: HomeworkStepFeedback[] = [
    {
      step: 'Problem identification',
      correct: input.skillsAffected.length > 0,
      note:
        input.skillsAffected.length > 0
          ? `Mapped to ${input.skillsAffected.length} skill(s) in your graph.`
          : 'Could not map to a specific skill — review topic labels.',
      index: 0,
    },
    {
      step: 'Method / setup',
      correct: input.correctness === 'correct',
      note:
        input.correctness === 'correct'
          ? 'Setup appears sound from the extracted work.'
          : input.mistakeTags.some((t) => t.includes('setup'))
            ? 'Check your initial equation or method choice before calculating.'
            : 'Verify the method matches the problem structure.',
      index: 1,
    },
    {
      step: 'Execution',
      correct: input.correctness === 'correct',
      note:
        input.correctness === 'incorrect'
          ? input.extractedWorkSummary.slice(0, 160) || 'Review algebra and differentiation steps.'
          : input.correctness === 'unclear'
            ? 'Execution unclear — add clearer work or a text description.'
            : 'Steps look consistent with the expected approach.',
      index: 2,
    },
  ]
  return steps
}

export function chooseRepairRecommendation(
  state: MathPilotState,
  skillsAffected: string[],
  mistakeTags: string[],
): HomeworkRepairRecommendation | undefined {
  const valid = skillsAffected.filter((id) => state.skills[id])
  if (!valid.length) return undefined

  const sorted = [...valid].sort(
    (a, b) => (state.mastery[a]?.masteryScore ?? 0.5) - (state.mastery[b]?.masteryScore ?? 0.5),
  )
  const skillId = sorted[0]
  const skill = state.skills[skillId]
  const tagHint = mistakeTags[0]?.replace(/_/g, ' ') ?? 'recent homework miss'
  return {
    skillId,
    reason: `Homework flagged ${tagHint}. Quick repair on ${skill.name} will tighten setup before mixed practice.`,
  }
}

function learningSlices(input: HomeworkLearningInput): Array<{
  correctness: HomeworkAnalysis['correctness']
  mistakeTags: string[]
  skillsAffected: string[]
  summary: string
}> {
  if (input.detectedProblems?.length) {
    return input.detectedProblems.map((problem) => ({
      correctness: problem.correctness,
      mistakeTags: problem.mistakeTags.length ? problem.mistakeTags : input.mistakeTags,
      skillsAffected: input.skillsAffected,
      summary: `${problem.label}: ${problem.problemText.slice(0, 120)}`,
    }))
  }
  return [
    {
      correctness: input.correctness,
      mistakeTags: input.mistakeTags,
      skillsAffected: input.skillsAffected,
      summary: input.extractedWorkSummary,
    },
  ]
}

export function applyHomeworkLearningUpdates(
  state: MathPilotState,
  input: HomeworkLearningInput,
): MathPilotState {
  let next = state
  const slices = learningSlices(input)

  for (const slice of slices) {
    const skills = slice.skillsAffected.filter((id) => next.skills[id])
    if (!skills.length) continue

    const correct = slice.correctness === 'correct'
    const problemId = `homework-evidence-${Date.now()}-${skills[0]}`

    for (const skillId of skills) {
      next = recordAttempt(next, {
        problemId,
        skillIds: [skillId],
        answer: slice.summary.slice(0, 200),
        correct,
        mode: 'homework',
        hintCount: 0,
        seconds: 180,
        mixed: skills.length > 1,
        delayed: true,
        mistakeTags: slice.correctness !== 'correct' ? slice.mistakeTags : undefined,
        feedbackSummary:
          typeof input.wrongStepIndex === 'number'
            ? `Wrong at step ${input.wrongStepIndex + 1}`
            : undefined,
      })
    }
  }

  const touched = [...new Set(slices.flatMap((s) => s.skillsAffected))].filter((id) => state.skills[id])
  if (!touched.length) return next

  return {
    ...next,
    changelog: [
      `${new Date().toISOString()}: Homework learning loop updated mastery/review for ${touched.join(', ')} (${slices.length} problem slice(s)).`,
      ...next.changelog,
    ],
  }
}

export function saveHomeworkAsWorkedExample(state: MathPilotState, analysisId: string): MathPilotState {
  const analysis = state.homeworkAnalyses.find((entry) => entry.id === analysisId)
  if (!analysis || analysis.savedAsWorkedExample) return state

  const steps =
    analysis.steps?.map((step) => `${step.label}: ${step.work}${step.note ? ` — ${step.note}` : ''}`) ??
    analysis.stepFeedback?.map((step) => `${step.step}: ${step.note}`) ??
    (analysis.extractedWorkSummary ? [analysis.extractedWorkSummary] : [analysis.problemText])

  return {
    ...state,
    workedExamples: {
      ...(state.workedExamples ?? {}),
      [`worked-${analysisId}`]: {
        problemId: analysis.id,
        steps,
        source: 'homework',
        createdAt: new Date().toISOString(),
      },
    },
    homeworkAnalyses: state.homeworkAnalyses.map((entry) =>
      entry.id === analysisId ? { ...entry, savedAsWorkedExample: true } : entry,
    ),
    changelog: [
      `${new Date().toISOString()}: Saved homework analysis as worked example (${analysis.detectedTopic}).`,
      ...state.changelog,
    ],
  }
}
