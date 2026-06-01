import type { HomeworkAnalysis, MathPilotState } from './types'

export interface HomeworkUploadInput {
  problemText?: string
  imageDataUrl?: string
  imageFileName?: string
  saveRawImage?: boolean
  courseFocus?: string
}

export function analyzeHomeworkUpload(state: MathPilotState, input: HomeworkUploadInput): MathPilotState {
  const topic = detectTopic(input.problemText ?? '')
  const rawImageSaved = Boolean(input.saveRawImage && input.imageDataUrl)

  const imageNote = input.imageFileName ? ` Image: ${input.imageFileName}.` : ''
  const analysis: HomeworkAnalysis = {
    id: `homework-${Date.now()}`,
    createdAt: new Date().toISOString(),
    detectedTopic: topic.label,
    problemText: input.problemText || `Uploaded work (image processed locally).${imageNote}`,
    extractedWorkSummary: rawImageSaved
      ? 'Raw image retained per user request. Extracted setup and algebra steps stored.'
      : 'Raw image discarded after extraction. Structured analysis and mistake tags retained.',
    correctness: topic.correctness,
    mistakeTags: topic.mistakeTags,
    skillsAffected: topic.skillIds,
    feedbackSummary: topic.feedback,
    rawImageSaved,
  }

  return {
    ...state,
    homeworkAnalyses: [analysis, ...state.homeworkAnalyses],
    changelog: [
      `${new Date().toISOString()}: Homework analysis saved; raw_image_saved=${rawImageSaved}.`,
      ...state.changelog,
    ],
  }
}

function detectTopic(text: string) {
  const lower = text.toLowerCase()
  if (lower.includes('related rate')) {
    return {
      label: 'Related rates',
      skillIds: ['related_rates'],
      mistakeTags: ['setup:modeling_missing_equation'],
      correctness: 'incorrect' as const,
      feedback:
        'The likely issue is setup before differentiation. Write the relationship equation first, then differentiate.',
    }
  }
  if (lower.includes('series') || lower.includes('ratio test')) {
    return {
      label: 'Series convergence',
      skillIds: ['ratio_test'],
      mistakeTags: ['method_selection:wrong_test'],
      correctness: 'incorrect' as const,
      feedback: 'Check which convergence test matches the series structure before computing.',
    }
  }
  return {
    label: 'Calculus work',
    skillIds: ['chain_rule'],
    mistakeTags: ['method_selection:needs_review'],
    correctness: 'unclear' as const,
    feedback: 'Review method selection and setup. Use Codex packet or guided repair if stuck.',
  }
}
