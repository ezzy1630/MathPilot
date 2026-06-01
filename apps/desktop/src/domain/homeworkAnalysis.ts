import { createPromptPacket, ensureMemoryLoaded, invokeCodexCli } from './aiAdapter'
import { loadSkillsForPrompt } from './skillLoader'
import { parseCodexResponse } from './codexParser'
import {
  applyHomeworkLearningUpdates,
  chooseRepairRecommendation,
  inferStepFeedback,
  type HomeworkStepFeedback,
} from './homeworkLearningBridge'
import type { HomeworkAnalysis, MathPilotState } from './types'
import type { HomeworkUploadInput } from './homework'
import { ocrHomeworkImage } from './ocrHomework'

export interface HomeworkAnalysisResult {
  state: MathPilotState
  analysis: HomeworkAnalysis
}

interface ParsedHomework {
  problemText: string
  extractedWorkSummary: string
  detectedTopic: string
  correctness: HomeworkAnalysis['correctness']
  mistakeTags: string[]
  skillsAffected: string[]
  feedbackSummary: string
  stepFeedback?: HomeworkStepFeedback[]
}

function keywordFallback(text: string): ParsedHomework {
  const lower = text.toLowerCase()
  if (lower.includes('related rate')) {
    return {
      problemText: text || 'Related rates problem',
      extractedWorkSummary: 'Keyword analysis: related rates setup.',
      detectedTopic: 'Related rates',
      correctness: 'incorrect',
      mistakeTags: ['setup:modeling_missing_equation'],
      skillsAffected: ['related_rates'],
      feedbackSummary:
        'Write the relationship equation first, then differentiate. Check which quantities change with time.',
    }
  }
  if (lower.includes('series') || lower.includes('ratio test') || lower.includes('convergence')) {
    return {
      problemText: text || 'Series problem',
      extractedWorkSummary: 'Keyword analysis: series convergence.',
      detectedTopic: 'Series convergence',
      correctness: 'incorrect',
      mistakeTags: ['method_selection:wrong_test'],
      skillsAffected: ['series_test_selection'],
      feedbackSummary: 'Match the series form to the right convergence test before computing.',
    }
  }
  if (lower.includes('integral') || lower.includes('∫') || lower.includes('integration')) {
    return {
      problemText: text || 'Integration problem',
      extractedWorkSummary: 'Keyword analysis: integration.',
      detectedTopic: 'Integration',
      correctness: 'unclear',
      mistakeTags: ['method_selection:needs_review'],
      skillsAffected: ['u_substitution'],
      feedbackSummary: 'Confirm u-substitution or parts setup before simplifying.',
    }
  }
  return {
    problemText: text || 'Calculus homework',
    extractedWorkSummary: 'Local heuristic analysis (no image text extracted).',
    detectedTopic: 'Calculus work',
    correctness: 'unclear',
    mistakeTags: ['method_selection:needs_review'],
    skillsAffected: ['chain_rule'],
    feedbackSummary: 'Review method selection and setup. Use guided repair if stuck.',
  }
}

function parseStepFeedback(raw: unknown): HomeworkStepFeedback[] | undefined {
  if (!Array.isArray(raw)) return undefined
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      return {
        step: String(row.step ?? 'Step'),
        correct: Boolean(row.correct),
        note: String(row.note ?? ''),
      }
    })
    .filter(Boolean) as HomeworkStepFeedback[]
}

async function analyzeWithCodex(
  state: MathPilotState,
  input: HomeworkUploadInput,
): Promise<ParsedHomework | null> {
  const memory = await ensureMemoryLoaded()
  const skillBodies = await loadSkillsForPrompt('homework_analysis', [])
  const packet = createPromptPacket(
    state,
    'homework_analysis',
    undefined,
    [
      input.problemText ?? '',
      input.imageFileName ? `Attached image: ${input.imageFileName}` : '',
      input.imageDataUrl ? 'Image data provided (base64).' : '',
      'Extract problem statement, student work summary, topic, correctness, mistake_tags, skills_affected, feedback_summary.',
      'Also return step_feedback: array of { step, correct, note } for setup/method/execution.',
      'Return JSON only: { problem_text, extracted_work_summary, detected_topic, correctness, mistake_tags, skills_affected, feedback_summary, step_feedback }',
    ].join('\n'),
    memory,
    skillBodies,
  )

  const result = await invokeCodexCli(packet, 'homework_analysis')
  if (!result.ok) return null

  const parsed = parseCodexResponse(result.stdout) as Record<string, unknown> | null
  if (!parsed) return null

  const correctness = String(parsed.correctness ?? 'unclear')
  const validCorrectness = ['correct', 'incorrect', 'unclear'].includes(correctness)
    ? (correctness as HomeworkAnalysis['correctness'])
    : 'unclear'

  return {
    problemText: String(parsed.problem_text ?? parsed.feedback_to_user ?? input.problemText ?? 'Homework upload'),
    extractedWorkSummary: String(
      parsed.extracted_work_summary ?? parsed.feedback_to_user ?? 'Codex extraction summary.',
    ),
    detectedTopic: String(parsed.detected_topic ?? 'Calculus work'),
    correctness: validCorrectness,
    mistakeTags: Array.isArray(parsed.mistake_tags) ? (parsed.mistake_tags as string[]) : [],
    skillsAffected: Array.isArray(parsed.skills_affected) ? (parsed.skills_affected as string[]) : ['chain_rule'],
    feedbackSummary: String(parsed.feedback_summary ?? parsed.feedback_to_user ?? 'Review your setup and method.'),
    stepFeedback: parseStepFeedback(parsed.step_feedback),
  }
}

async function extractTextFromImage(dataUrl: string, fileName?: string): Promise<string> {
  const ocrText = await ocrHomeworkImage(dataUrl)
  if (ocrText.length > 8) return ocrText
  return fileName
    ? `Uploaded image: ${fileName}. OCR did not extract readable text — add a text description for richer analysis.`
    : ''
}

export async function analyzeHomeworkDeep(
  state: MathPilotState,
  input: HomeworkUploadInput,
): Promise<HomeworkAnalysisResult> {
  const rawImageSaved = Boolean(input.saveRawImage && input.imageDataUrl)
  let parsed: ParsedHomework | null = null
  let problemText = input.problemText ?? ''

  if (input.imageDataUrl && !problemText.trim()) {
    problemText = await extractTextFromImage(input.imageDataUrl, input.imageFileName)
  }

  if (input.imageDataUrl || problemText.length > 20) {
    parsed = await analyzeWithCodex(state, { ...input, problemText })
  }

  if (!parsed) {
    parsed = keywordFallback(problemText)
    if (input.imageDataUrl) {
      parsed.extractedWorkSummary =
        'Image uploaded; Codex unavailable — add problem text for richer analysis. Image ' +
        (rawImageSaved ? 'saved per your preference.' : 'discarded after processing.')
    }
  }

  const skillsAffected = parsed.skillsAffected.filter((id) => state.skills[id])
  const stepFeedback = inferStepFeedback({
    ...parsed,
    skillsAffected,
    stepFeedback: parsed.stepFeedback,
  })
  const repairRecommendation =
    parsed.correctness !== 'correct'
      ? chooseRepairRecommendation(state, skillsAffected, parsed.mistakeTags)
      : undefined

  const analysis: HomeworkAnalysis = {
    id: `homework-${Date.now()}`,
    createdAt: new Date().toISOString(),
    detectedTopic: parsed.detectedTopic,
    problemText: parsed.problemText,
    extractedWorkSummary: parsed.extractedWorkSummary,
    correctness: parsed.correctness,
    mistakeTags: parsed.mistakeTags,
    skillsAffected,
    feedbackSummary: parsed.feedbackSummary,
    rawImageSaved,
    stepFeedback,
    repairRecommendation,
  }

  let next = applyHomeworkLearningUpdates(state, {
    correctness: parsed.correctness,
    mistakeTags: parsed.mistakeTags,
    skillsAffected,
    extractedWorkSummary: parsed.extractedWorkSummary,
    stepFeedback,
  })

  next = {
    ...next,
    homeworkAnalyses: [analysis, ...next.homeworkAnalyses],
    lastHomeworkSummary: parsed.feedbackSummary,
    changelog: [
      `${new Date().toISOString()}: Homework analyzed (${parsed.detectedTopic}); raw_image=${rawImageSaved}; repair=${repairRecommendation?.skillId ?? 'none'}.`,
      ...next.changelog,
    ],
  }

  return { state: next, analysis }
}
