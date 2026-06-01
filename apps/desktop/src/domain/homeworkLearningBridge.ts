import { recordAttempt } from './learningEngine'
import type { HomeworkAnalysis, MathPilotState } from './types'

export interface HomeworkStepFeedback {
  step: string
  correct: boolean
  note: string
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
}

export function inferStepFeedback(input: HomeworkLearningInput): HomeworkStepFeedback[] {
  if (input.stepFeedback?.length) return input.stepFeedback

  const steps: HomeworkStepFeedback[] = [
    {
      step: 'Problem identification',
      correct: input.skillsAffected.length > 0,
      note:
        input.skillsAffected.length > 0
          ? `Mapped to ${input.skillsAffected.length} skill(s) in your graph.`
          : 'Could not map to a specific skill — review topic labels.',
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

export function applyHomeworkLearningUpdates(
  state: MathPilotState,
  input: HomeworkLearningInput,
): MathPilotState {
  const skills = input.skillsAffected.filter((id) => state.skills[id])
  if (!skills.length) return state

  const correct = input.correctness === 'correct'
  const problemId = `homework-evidence-${Date.now()}`

  let next = state
  for (const skillId of skills) {
    next = recordAttempt(next, {
      problemId,
      skillIds: [skillId],
      answer: input.extractedWorkSummary.slice(0, 200),
      correct,
      mode: 'homework',
      hintCount: 0,
      seconds: 180,
      mixed: skills.length > 1,
      delayed: true,
      mistakeTags: input.correctness !== 'correct' ? input.mistakeTags : undefined,
    })
  }

  return {
    ...next,
    changelog: [
      `${new Date().toISOString()}: Homework learning loop updated mastery/review for ${skills.join(', ')}.`,
      ...next.changelog,
    ],
  }
}

export function saveHomeworkAsWorkedExample(state: MathPilotState, analysisId: string): MathPilotState {
  const analysis = state.homeworkAnalyses.find((entry) => entry.id === analysisId)
  if (!analysis || analysis.savedAsWorkedExample) return state

  const steps =
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
