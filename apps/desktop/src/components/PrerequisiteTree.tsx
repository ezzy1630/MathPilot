import { MasteryBadge } from '../ui'
import type { MathPilotState } from '../domain/types'

function depthForSkill(state: MathPilotState, skillId: string, seen = new Set<string>()): number {
  if (seen.has(skillId)) return 0
  seen.add(skillId)
  const skill = state.skills[skillId]
  if (!skill?.prerequisites.length) return 0
  return 1 + Math.max(...skill.prerequisites.map((id) => depthForSkill(state, id, seen)))
}

export function PrerequisiteTree({
  state,
  groups,
  onSkillSelect,
  highlightSkillIds = [],
  filter = '',
}: {
  state: MathPilotState
  groups: Record<string, Array<{ skill: MathPilotState['skills'][string]; mastery: MathPilotState['mastery'][string] }>>
  onSkillSelect: (skillId: string) => void
  highlightSkillIds?: string[]
  filter?: string
}) {
  const needle = filter.trim().toLowerCase()

  return (
    <div className="prereq-tree">
      {Object.entries(groups).map(([area, records]) => {
        const sorted = [...records].sort(
          (a, b) => depthForSkill(state, a.skill.id) - depthForSkill(state, b.skill.id),
        )
        const visible = needle
          ? sorted.filter(
              (r) =>
                r.skill.name.toLowerCase().includes(needle) ||
                r.skill.id.includes(needle) ||
                r.skill.prerequisites.some((p) => state.skills[p]?.name.toLowerCase().includes(needle)),
            )
          : sorted
        if (!visible.length) return null
        return (
          <section className="tree-area" key={area}>
            <h3>{area}</h3>
            <ul className="tree-list">
              {visible.map(({ skill, mastery }) => {
                const depth = depthForSkill(state, skill.id)
                const weak = mastery.masteryScore < 0.4
                return (
                  <li key={skill.id} style={{ paddingLeft: `${8 + depth * 18}px` }}>
                    <button
                      type="button"
                      className={`tree-skill ${weak ? 'weak' : ''} ${highlightSkillIds.includes(skill.id) ? 'highlight' : ''}`}
                      onClick={() => onSkillSelect(skill.id)}
                    >
                      <span>{skill.name}</span>
                      <MasteryBadge state={mastery.masteryState} />
                    </button>
                    {skill.prerequisites.length > 0 && depth > 0 && (
                      <span className="tree-deps muted">
                        needs {skill.prerequisites.map((id) => state.skills[id]?.name ?? id).join(', ')}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
