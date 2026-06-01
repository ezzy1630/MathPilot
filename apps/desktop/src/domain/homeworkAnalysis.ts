import { createPromptPacket, ensureMemoryLoaded, invokeCodexCli, resolveCodexSession } from './aiAdapter'
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
  steps?: HomeworkAnalysis['steps']
  wrongStepIndex?: number
  detectedProblems?: HomeworkAnalysis['detectedProblems']
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

function parseSteps(raw: unknown): HomeworkAnalysis['steps'] | undefined {
  if (!Array.isArray(raw)) return undefined
  return raw
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      return {
        label: String(row.label ?? row.step ?? `Step ${index + 1}`),
        work: String(row.work ?? row.note ?? ''),
        correct: Boolean(row.correct),
        note: row.note ? String(row.note) : undefined,
      }
    })
    .filter(Boolean) as NonNullable<HomeworkAnalysis['steps']>
}

function parseDetectedProblems(raw: unknown): HomeworkAnalysis['detectedProblems'] | undefined {
  if (!Array.isArray(raw)) return undefined
  return raw
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const correctness = String(row.correctness ?? 'unclear')
      const valid = ['correct', 'incorrect', 'unclear'].includes(correctness)
        ? (correctness as HomeworkAnalysis['correctness'])
        : 'unclear'
      return {
        label: String(row.label ?? `Problem ${index + 1}`),
        problemText: String(row.problem_text ?? row.problemText ?? ''),
        correctness: valid,
        mistakeTags: Array.isArray(row.mistake_tags) ? (row.mistake_tags as string[]) : [],
      }
    })
    .filter((p) => p && p.problemText.length > 0) as HomeworkAnalysis['detectedProblems']
}

function parseStepFeedback(raw: unknown, steps?: HomeworkAnalysis['steps'], wrongStepIndex?: number): HomeworkStepFeedback[] | undefined {
  if (Array.isArray(raw)) {
    return raw
      .map((item, index) => {
        if (!item || typeof item !== 'object') return null
        const row = item as Record<string, unknown>
        return {
          step: String(row.step ?? `Step ${index + 1}`),
          correct: Boolean(row.correct),
          note: String(row.note ?? ''),
          index: typeof row.index === 'number' ? row.index : index,
        }
      })
      .filter(Boolean) as HomeworkStepFeedback[]
  }
  if (steps?.length) {
    return steps.map((step, index) => ({
      step: step.label,
      correct: step.correct,
      note: step.note ?? step.work,
      index,
    }))
  }
  if (typeof wrongStepIndex === 'number' && steps?.length) {
    return steps.map((step, index) => ({
      step: step.label,
      correct: index !== wrongStepIndex,
      note: index === wrongStepIndex ? 'First incorrect step identified.' : step.note ?? step.work,
      index,
    }))
  }
  return undefined
}

async function analyzeWithCodex(
  state: MathPilotState,
  input: HomeworkUploadInput,
): Promise<ParsedHomework | null> {
  const memory = await ensureMemoryLoaded()
  const skillBodies = await loadSkillsForPrompt('homework_analysis', [])
  const homeworkId = input.imageFileName ?? `hw-${Date.now()}`
  const { sessionId, resume, state: sessionState } = resolveCodexSession(state, 'homework_analysis', undefined, homeworkId)
  const packet = createPromptPacket(
    sessionState,
    'homework_analysis',
    undefined,
    [
      input.problemText ?? '',
      input.imageFileName ? `Attached image: ${input.imageFileName}` : '',
      input.imageDataUrl ? 'Image data provided (base64).' : '',
      'Extract problem statement, student work summary, topic, correctness, mistake_tags, skills_affected, feedback_summary.',
      'Also return step_feedback: array of { step, correct, note, index } OR steps: array of { label, work, correct, note }.',
      'Return wrong_step_index (0-based) when a specific step is wrong.',
      'For multi-problem sheets return problems: array of { label, problem_text, correctness, mistake_tags }.',
      'Return JSON only: { problem_text, extracted_work_summary, detected_topic, correctness, mistake_tags, skills_affected, feedback_summary, step_feedback, steps, wrong_step_index, problems }',
    ].join('\n'),
    memory,
    skillBodies,
    { sessionId, resume },
  )

  const result = await invokeCodexCli(packet, 'homework_analysis', sessionId)
  if (!result.ok) return null

  const parsed = parseCodexResponse(result.stdout) as Record<string, unknown> | null
  if (!parsed) return null

  const correctness = String(parsed.correctness ?? 'unclear')
  const validCorrectness = ['correct', 'incorrect', 'unclear'].includes(correctness)
    ? (correctness as HomeworkAnalysis['correctness'])
    : 'unclear'

  const steps = parseSteps(parsed.steps)
  const wrongStepIndex =
    typeof parsed.wrong_step_index === 'number'
      ? parsed.wrong_step_index
      : typeof parsed.wrongStepIndex === 'number'
        ? parsed.wrongStepIndex
        : undefined
  const detectedProblems =
    parseDetectedProblems(parsed.problems) ??
    parseDetectedProblems(parsed.detected_problems)

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
    steps,
    wrongStepIndex,
    detectedProblems,
    stepFeedback: parseStepFeedback(parsed.step_feedback, steps, wrongStepIndex),
  }
}

async function extractTextFromImage(dataUrl: string, fileName?: string): Promise<string> {
  const ocrText = await ocrHomeworkImage(dataUrl)
  if (ocrText.length > 8) return ocrText
  return fileName
    ? `Uploaded image: ${fileName}. OCR did not extract readable text — add a text description for richer analysis.`
    : ''
}

/** Split OCR or pasted text into numbered homework problems when markers are present. */
export function splitHomeworkProblems(text: string): Array<{ label: string; problemText: string }> {
  const trimmed = text.trim()
  if (!trimmed) return []

  const markerPattern = /(?:^|\n)\s*(?:(?:problem|problems|#|question|q)\s*)?(\d{1,2})\s*[.)]\s+/gi
  const matches = [...trimmed.matchAll(markerPattern)]
  if (matches.length < 2) return []

  const segments: Array<{ label: string; problemText: string }> = []
  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i]
    const start = match.index ?? 0
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? trimmed.length) : trimmed.length
    const body = trimmed.slice(start, end).replace(/^\s*(?:(?:problem|problems|#|question|q)\s*)?\d{1,2}\s*[.)]\s*/i, '').trim()
    if (body.length > 4) {
      segments.push({ label: `Problem ${match[1]}`, problemText: body })
    }
  }
  return segments
}

function detectedProblemsFromText(text: string, fallbackCorrectness: HomeworkAnalysis['correctness'], mistakeTags: string[]) {
  const segments = splitHomeworkProblems(text)
  if (!segments.length) return undefined
  return segments.map((segment) => ({
    label: segment.label,
    problemText: segment.problemText,
    correctness: fallbackCorrectness,
    mistakeTags,
  }))
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
      const ocrEmpty = !problemText.trim() || problemText.includes('OCR did not extract')
      parsed.extractedWorkSummary =
        'Image uploaded; Codex unavailable — add problem text for richer analysis. Image ' +
        (rawImageSaved ? 'saved per your preference.' : ocrEmpty ? 'discarded (OCR empty, save not checked).' : 'discarded after processing.')
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

  const detectedProblems =
    parsed.detectedProblems ??
    detectedProblemsFromText(problemText || parsed.problemText, parsed.correctness, parsed.mistakeTags)

  const analysis: HomeworkAnalysis = {
    id: `homework-${Date.now()}`,
    createdAt: new Date().toISOString(),
    detectedTopic: parsed.detectedTopic,
    problemText: detectedProblems?.length
      ? detectedProblems.map((p) => `${p.label}: ${p.problemText}`).join('\n\n')
      : parsed.problemText,
    extractedWorkSummary: parsed.extractedWorkSummary,
    correctness: parsed.correctness,
    mistakeTags: parsed.mistakeTags,
    skillsAffected,
    feedbackSummary: parsed.feedbackSummary,
    rawImageSaved,
    stepFeedback,
    steps: parsed.steps,
    wrongStepIndex: parsed.wrongStepIndex,
    repairRecommendation,
    detectedProblems,
  }

  let next = applyHomeworkLearningUpdates(state, {
    correctness: parsed.correctness,
    mistakeTags: parsed.mistakeTags,
    skillsAffected,
    extractedWorkSummary: parsed.extractedWorkSummary,
    stepFeedback,
    steps: parsed.steps,
    wrongStepIndex: parsed.wrongStepIndex,
    detectedProblems,
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
