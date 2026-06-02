import {
  createPromptPacket,
  ensureMemoryLoaded,
  invokeCodexCli,
  logCodexCall,
  resolveCodexSession,
} from './aiAdapter'
import { codexTimeoutSecsForTask } from './codexConfig'
import { parseHomeworkCodexResponse } from './codexParser'
import { loadSkillsForPrompt } from './skillLoader'
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
): Promise<{ parsed: ParsedHomework | null; state: MathPilotState; failureReason?: string }> {
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

  const result = await invokeCodexCli(packet, 'homework_analysis', sessionId, {
    timeoutSecs: codexTimeoutSecsForTask('homework_analysis', sessionState.preferences),
  })
  const logged = logCodexCall(sessionState, 'homework_analysis', packet, result)

  if (result.cancelled) {
    return { parsed: null, state: logged, failureReason: 'cancelled' }
  }
  if (result.timedOut) {
    return { parsed: null, state: logged, failureReason: 'timed_out' }
  }
  if (!result.ok) {
    return { parsed: null, state: logged, failureReason: 'unavailable' }
  }

  const codex = parseHomeworkCodexResponse(result.stdout)
  if (!codex) {
    return { parsed: null, state: logged, failureReason: 'malformed' }
  }

  const steps = codex.steps
    ? (codex.steps.map((step) => ({
        label: step.label,
        work: step.work,
        correct: step.correct,
        note: step.note,
      })) as HomeworkAnalysis['steps'])
    : undefined

  return {
    state: logged,
    parsed: {
      problemText: codex.problemText || input.problemText || 'Homework upload',
      extractedWorkSummary: codex.extractedWorkSummary || 'Codex extraction summary.',
      detectedTopic: codex.detectedTopic,
      correctness: codex.correctness,
      mistakeTags: codex.mistakeTags,
      skillsAffected: codex.skillsAffected.length ? codex.skillsAffected : ['chain_rule'],
      feedbackSummary: codex.feedbackSummary || 'Review your setup and method.',
      steps,
      wrongStepIndex: codex.wrongStepIndex,
      detectedProblems: codex.detectedProblems,
      stepFeedback: codex.stepFeedback ?? parseStepFeedback(undefined, steps, codex.wrongStepIndex),
    },
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
  let nextState = state
  let codexFailure: string | undefined
  let problemText = input.problemText ?? ''

  if (input.imageDataUrl && !problemText.trim()) {
    problemText = await extractTextFromImage(input.imageDataUrl, input.imageFileName)
  }

  if (input.imageDataUrl || problemText.length > 20) {
    const codex = await analyzeWithCodex(nextState, { ...input, problemText })
    nextState = codex.state
    parsed = codex.parsed
    codexFailure = codex.failureReason
  }

  if (!parsed) {
    parsed = keywordFallback(problemText)
    if (codexFailure === 'timed_out') {
      parsed.feedbackSummary = 'Codex timed out — using local heuristics. Retry or paste a manual packet.'
    } else if (codexFailure === 'cancelled') {
      parsed.feedbackSummary = 'Homework analysis cancelled — using local heuristics.'
    } else if (input.imageDataUrl) {
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

  let next = applyHomeworkLearningUpdates(nextState, {
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
