import type { MathPilotState, Problem } from './types'

export interface OfflineHelpResult {
  feedback: string
  mistakeTags?: string[]
  suggestRepair?: string
}

/** Structured teaching fallback when Codex CLI is unavailable. */
export function offlineHelpForTask(
  state: MathPilotState,
  task: string,
  problem?: Problem,
): OfflineHelpResult {
  const lower = task.toLowerCase()
  const skillId = problem?.skillIds[0]
  const skill = skillId ? state.skills[skillId] : undefined

  if (lower.includes('lost') || lower.includes('method')) {
    return {
      feedback: skill
        ? `For ${skill.name}: name the givens, write one relationship equation, then differentiate or integrate. Common slips: ${skill.commonMistakes.slice(0, 2).join('; ')}.`
        : 'Start by labeling variables and writing the governing equation before calculating.',
      mistakeTags: ['method_selection:needs_review'],
      suggestRepair: skillId,
    }
  }

  if (lower.includes('setup') || lower.includes('check')) {
    return {
      feedback: problem
        ? `Re-read the prompt: "${problem.prompt.slice(0, 120)}…" Verify your first line matches the problem structure before simplifying.`
        : 'Check that your first step matches the problem statement.',
      mistakeTags: ['setup:algebra_or_model'],
    }
  }

  if (skill) {
    const mastery = state.mastery[skillId!]
    return {
      feedback: `${skill.name}: ${skill.commonMistakes[0] ?? 'Slow down on setup.'} Mastery ${Math.round((mastery?.masteryScore ?? 0.3) * 100)}% — try one hint, then a similar problem.`,
      suggestRepair: (mastery?.masteryScore ?? 0.5) < 0.45 ? skillId : undefined,
    }
  }

  return {
    feedback:
      'Codex is offline. Use the hint ladder, check setup against the prompt, or paste a manual packet in Settings.',
  }
}
