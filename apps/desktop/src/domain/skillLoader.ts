const SKILL_MODULES = import.meta.glob('../../../../skills/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const TASK_SKILL_KEYS: Record<string, string[]> = {
  homework_analysis: [
    '../../../../skills/grading/diagnose_homework_photo.md',
    '../../../../skills/grading/classify_mistake.md',
    '../../../../skills/planning/choose_next_action.md',
  ],
  explain: ['../../../../skills/teaching/teach_chain_rule.md'],
  teach: [
    '../../../../skills/teaching/teach_related_rates.md',
    '../../../../skills/teaching/teach_integration_by_parts.md',
  ],
  check: ['../../../../skills/grading/grade_symbolic_answer.md'],
  maintenance: [
    '../../../../skills/maintenance/run_safe_maintenance.md',
    '../../../../skills/maintenance/compress_attempt_history.md',
    '../../../../skills/maintenance/audit_problem_bank.md',
  ],
  maintenance_curator: [
    '../../../../skills/maintenance/run_safe_maintenance.md',
    '../../../../skills/maintenance/compress_attempt_history.md',
  ],
  continuing_diagnostic_curator: ['../../../../skills/planning/choose_next_action.md'],
  homework_cluster: [
    '../../../../skills/grading/classify_mistake.md',
    '../../../../skills/planning/generate_quick_repair.md',
  ],
  homework_cluster_curator: [
    '../../../../skills/grading/classify_mistake.md',
    '../../../../skills/planning/generate_quick_repair.md',
    '../../../../skills/planning/choose_next_action.md',
  ],
  resources: [
    '../../../../skills/resources/rank_video_for_skill.md',
    '../../../../skills/resources/select_video_resource.md',
  ],
  repair: ['../../../../skills/planning/generate_quick_repair.md'],
  review: ['../../../../skills/planning/schedule_review.md'],
  disagreement: ['../../../../skills/grading/grade_symbolic_answer.md'],
}

const DEFAULT_SKILL_KEYS = [
  '../../../../skills/planning/choose_next_action.md',
  '../../../../skills/grading/grade_symbolic_answer.md',
]

let cachedAllSkills: string[] | null = null

function keysForTask(task: string, activeSkillIds: string[]): string[] {
  const lower = task.toLowerCase()
  const keys = new Set<string>(DEFAULT_SKILL_KEYS)
  for (const [needle, paths] of Object.entries(TASK_SKILL_KEYS)) {
    if (lower.includes(needle)) paths.forEach((p) => keys.add(p))
  }
  if (activeSkillIds.includes('chain_rule') || lower.includes('chain')) {
    keys.add('../../../../skills/teaching/teach_chain_rule.md')
  }
  return [...keys]
}

function bodiesFromKeys(keys: string[]): string[] {
  return keys
    .map((key) => {
      const body = SKILL_MODULES[key]
      if (!body) return null
      const rel = key.replace('../../../../skills/', 'skills/')
      return `## ${rel}\n${body.trim()}`
    })
    .filter(Boolean) as string[]
}

export async function loadSkillsForPrompt(task: string, activeSkillIds: string[] = []): Promise<string[]> {
  const selectedKeys = keysForTask(task, activeSkillIds)
  const fromBundle = bodiesFromKeys(selectedKeys)
  if (fromBundle.length) return fromBundle

  if (typeof window === 'undefined' || !(window as Window & { __TAURI__?: unknown }).__TAURI__) {
    return fromBundle
  }

  try {
    if (!cachedAllSkills) {
      const { invoke } = await import('@tauri-apps/api/core')
      cachedAllSkills = await invoke<string[]>('read_skill_files')
    }
    const lower = task.toLowerCase()
    const filtered = cachedAllSkills.filter((block) => {
      if (lower.includes('homework')) {
        return block.includes('grading/') || block.includes('planning/')
      }
      if (lower.includes('chain') || activeSkillIds.includes('chain_rule')) {
        return block.includes('teach_chain_rule')
      }
      if (lower.includes('maintenance')) return block.includes('maintenance/')
      return true
    })
    return filtered.length ? filtered.slice(0, 4) : cachedAllSkills.slice(0, 3)
  } catch {
    return fromBundle
  }
}
