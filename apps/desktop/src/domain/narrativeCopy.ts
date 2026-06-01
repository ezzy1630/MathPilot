import type { MathPilotState, NextAction } from './types'

export function enrichNextAction(state: MathPilotState, action: NextAction): NextAction {
  const skillId = action.skillIds[0]
  const skill = skillId ? state.skills[skillId] : undefined
  const mastery = skillId ? state.mastery[skillId] : undefined

  if (action.kind === 'independent_practice' && skill) {
    return {
      ...action,
      reason: `Build transfer evidence on ${skill.name} — mixed problems that look similar but need different setups.`,
    }
  }

  if (action.kind === 'quick_repair' && skill) {
    const blockers = skill.prerequisites
      .map((id) => state.skills[id]?.name)
      .filter(Boolean)
      .slice(0, 2)
    const because = blockers.length
      ? `because ${skill.name} depends on ${blockers.join(' and ')}`
      : `because ${skill.name} is below the mastery bar`
    return {
      ...action,
      reason: `Repair ${skill.name} ${because}. A short explanation and practice will stabilize your map before harder topics.`,
    }
  }

  if (action.kind === 'mixed_review' && skill) {
    return {
      ...action,
      reason: `Spaced review for ${skill.name} is due. Retrieval now protects the progress you already earned.`,
    }
  }

  if (action.kind === 'guided_practice' && skill && mastery) {
    const weekFocus = action.title.startsWith('This week:')
    return {
      ...action,
      reason: weekFocus
        ? `${skill.name} is on your syllabus this week at ${Math.round(mastery.masteryScore * 100)}% mastery — a focused session now keeps pace with class.`
        : `Strengthen ${skill.name} (${Math.round(mastery.masteryScore * 100)}% mastery) with guided practice, then independent problems.`,
    }
  }

  if (action.kind === 'homework_review') {
    return {
      ...action,
      reason: action.reason
        ? `${action.reason} Short repair beats re-reading the same missed steps.`
        : 'Your homework analysis flagged skills to revisit — short repair beats re-reading the same missed steps.',
    }
  }

  if (action.kind === 'resource_watch' && skill) {
    return {
      ...action,
      reason: `Watch a trusted explainer for ${skill.name}, then prove retention with a quick check — passive viewing alone does not move mastery.`,
    }
  }

  if (action.kind === 'diagnostic') {
    return {
      ...action,
      reason:
        'A short adaptive diagnostic builds your initial knowledge map — about 25 questions across the skills that matter most.',
    }
  }

  return action
}
