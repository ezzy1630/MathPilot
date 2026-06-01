import { MasteryBadge } from '../ui/MasteryBadge'
import type { MathPilotState } from '../domain/types'
import { areaReadiness } from '../lib/mapHelpers'

export function KnowledgeMapWheel({
  state,
  groups,
  onSkillSelect,
  highlightSkillIds = [],
}: {
  state: MathPilotState
  groups: Record<string, Array<{ skill: MathPilotState['skills'][string]; mastery: MathPilotState['mastery'][string] }>>
  onSkillSelect: (skillId: string) => void
  highlightSkillIds?: string[]
}) {
  const areas = Object.keys(groups).sort(
    (a, b) => areaReadiness(state, a) - areaReadiness(state, b),
  )
  const angleStep = (2 * Math.PI) / Math.max(areas.length, 1)
  const cx = 200
  const cy = 200

  return (
    <div className="map-wheel-container">
      <p className="sr-only" id="knowledge-map-wheel-description">
        Knowledge map wheel grouped by calculus area. Use the list or prerequisite tree view for full keyboard navigation.
      </p>
      <svg
        viewBox="0 0 400 400"
        className="map-wheel-svg"
        role="img"
        aria-label="Knowledge map wheel"
        aria-describedby="knowledge-map-wheel-description"
      >
        <defs>
          <radialGradient id="wheelGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--mp-accent-soft)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r="188" fill="url(#wheelGlow)" />
        <circle cx={cx} cy={cy} r="180" fill="var(--mp-bg-muted)" stroke="var(--mp-border)" strokeWidth="1" />
        <circle cx={cx} cy={cy} r="52" fill="var(--mp-bg-elevated)" stroke="var(--mp-accent)" strokeWidth="2" />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fill="var(--mp-text-tertiary)">
          Readiness
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="18" fontWeight="600" fill="var(--mp-text)">
          {Math.round(
            Object.values(state.mastery).reduce((s, m) => s + m.masteryScore, 0) /
              Math.max(Object.keys(state.mastery).length, 1) *
              100,
          )}
          %
        </text>
        {areas.map((area, i) => {
          const angle = i * angleStep - Math.PI / 2
          const x = cx + Math.cos(angle) * 118
          const y = cy + Math.sin(angle) * 118
          const pct = areaReadiness(state, area)
          const weak = pct < 45
          const orbitSkills = (groups[area] ?? [])
            .sort((a, b) => a.mastery.masteryScore - b.mastery.masteryScore)
            .slice(0, 5)
          const orbitR = 82
          return (
            <g key={area} className="map-wheel-sector">
              <line
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke="var(--mp-border)"
                strokeWidth="1"
                opacity="0.6"
              />
              {orbitSkills.map((entry, j) => {
                const n = orbitSkills.length
                const spread = 0.35
                const offset = n <= 1 ? 0 : (j - (n - 1) / 2) * spread
                const skillAngle = angle + offset
                const sx = cx + Math.cos(skillAngle) * orbitR
                const sy = cy + Math.sin(skillAngle) * orbitR
                const highlighted = highlightSkillIds.includes(entry.skill.id)
                const skillWeak = entry.mastery.masteryScore < 0.45
                return (
                  <g key={entry.skill.id}>
                    <line
                      x1={cx}
                      y1={cy}
                      x2={sx}
                      y2={sy}
                      stroke="var(--mp-border)"
                      strokeWidth="0.5"
                      opacity="0.35"
                    />
                    <circle
                      cx={sx}
                      cy={sy}
                      r={highlighted ? 7 : 5}
                      fill={skillWeak ? 'var(--mp-mastery-weak)' : 'var(--mp-accent-soft)'}
                      stroke={highlighted ? 'var(--mp-accent)' : 'var(--mp-border)'}
                      strokeWidth={highlighted ? 2 : 1}
                      className={skillWeak ? 'wheel-orbit-weak' : undefined}
                      role="button"
                      tabIndex={0}
                      aria-label={`${entry.skill.name}, ${Math.round(entry.mastery.masteryScore * 100)}% mastery`}
                      onClick={() => onSkillSelect(entry.skill.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onSkillSelect(entry.skill.id)
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                  </g>
                )
              })}
              <circle
                cx={x}
                cy={y}
                r={weak ? 40 : 36}
                fill="var(--mp-bg-elevated)"
                stroke={weak ? 'var(--mp-mastery-weak)' : 'var(--mp-accent)'}
                strokeWidth={weak ? 2.5 : 2}
                className={weak ? 'wheel-node-weak' : undefined}
              />
              <text x={x} y={y - 8} textAnchor="middle" fontSize="9" fill="var(--mp-text-tertiary)">
                {area.length > 14 ? `${area.slice(0, 12)}…` : area}
              </text>
              <text x={x} y={y + 10} textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--mp-text)">
                {pct}%
              </text>
            </g>
          )
        })}
      </svg>
      <div className="map-wheel-legend">
        <p className="meta-label">Weak skills first</p>
        {areas.flatMap((area) =>
          (groups[area] ?? [])
            .filter((r) => r.mastery.masteryScore < 0.5 || highlightSkillIds.includes(r.skill.id))
            .sort((a, b) => a.mastery.masteryScore - b.mastery.masteryScore)
            .slice(0, 2)
            .map(({ skill, mastery }) => (
              <button
                type="button"
                key={skill.id}
                className={`skill-row ${highlightSkillIds.includes(skill.id) ? 'weak' : mastery.masteryScore < 0.4 ? 'weak' : ''}`}
                onClick={() => onSkillSelect(skill.id)}
              >
                <span>{skill.name}</span>
                <MasteryBadge state={mastery.masteryState} />
              </button>
            )),
        )}
      </div>
    </div>
  )
}
