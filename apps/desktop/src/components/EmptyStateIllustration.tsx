const MASTERY_NODES = [
  { deg: 18, r: 38, fill: 'var(--mp-mastery-mastered)' },
  { deg: 72, r: 42, fill: 'var(--mp-mastery-solid)' },
  { deg: 128, r: 36, fill: 'var(--mp-mastery-learning)' },
  { deg: 188, r: 40, fill: 'var(--mp-mastery-weak)' },
  { deg: 248, r: 37, fill: 'var(--mp-mastery-review)' },
  { deg: 308, r: 41, fill: 'var(--mp-mastery-unknown)' },
] as const

function polar(cx: number, cy: number, deg: number, r: number) {
  const rad = (deg * Math.PI) / 180
  return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r }
}

export function EmptyStateIllustration({ variant }: { variant: 'activity' | 'map' | 'welcome' }) {
  if (variant === 'activity') {
    return (
      <svg className="empty-illustration" viewBox="0 0 200 140" aria-hidden>
        <rect x="32" y="18" width="136" height="104" rx="10" fill="var(--mp-bg-elevated)" stroke="var(--mp-border)" />
        <rect x="32" y="18" width="136" height="22" rx="10" fill="var(--mp-bg-muted)" />
        <rect x="32" y="32" width="136" height="8" fill="var(--mp-bg-muted)" />
        <line x1="48" y1="54" x2="152" y2="54" stroke="var(--mp-border)" strokeWidth="1" />
        <line x1="48" y1="74" x2="152" y2="74" stroke="var(--mp-border)" strokeWidth="1" />
        <line x1="48" y1="94" x2="152" y2="94" stroke="var(--mp-border)" strokeWidth="1" />
        <rect x="44" y="78" width="112" height="22" rx="6" fill="var(--mp-accent-soft)" stroke="var(--mp-accent)" strokeWidth="1.5" />
        <rect x="50" y="84" width="52" height="4" rx="2" fill="var(--mp-accent)" opacity="0.35" />
        <rect x="50" y="92" width="72" height="4" rx="2" fill="var(--mp-accent)" opacity="0.55" />
        <circle cx="56" cy="89" r="9" fill="var(--mp-accent)" />
        <text x="56" y="93" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--mp-bg-elevated)">
          2
        </text>
        <path
          d="M132 88l5 5 10-11"
          stroke="var(--mp-accent)"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (variant === 'map') {
    const cx = 100
    const cy = 72
    const sectorCount = 6
    const innerR = 14
    const outerR = 50
    return (
      <svg className="empty-illustration" viewBox="0 0 200 140" aria-hidden>
        {Array.from({ length: sectorCount }, (_, i) => {
          const start = (i * 360) / sectorCount - 90
          const end = ((i + 1) * 360) / sectorCount - 90
          const p1 = polar(cx, cy, start, innerR)
          const p2 = polar(cx, cy, end, innerR)
          const p3 = polar(cx, cy, end, outerR)
          const p4 = polar(cx, cy, start, outerR)
          const fill = i % 2 === 0 ? 'var(--mp-bg-muted)' : 'var(--mp-bg-elevated)'
          return (
            <path
              key={i}
              d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} A ${outerR} ${outerR} 0 0 1 ${p3.x} ${p3.y} L ${p4.x} ${p4.y} A ${innerR} ${innerR} 0 0 0 ${p1.x} ${p1.y} Z`}
              fill={fill}
              stroke="var(--mp-border)"
              strokeWidth="1"
            />
          )
        })}
        <circle cx={cx} cy={cy} r={innerR} fill="var(--mp-bg-elevated)" stroke="var(--mp-border)" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r="4" fill="var(--mp-accent)" />
        {MASTERY_NODES.map((node, i) => {
          const { x, y } = polar(cx, cy, node.deg, node.r)
          return (
            <g key={i}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke="var(--mp-border)" strokeWidth="1" opacity="0.6" />
              <circle cx={x} cy={y} r="9" fill={node.fill} stroke="var(--mp-bg-elevated)" strokeWidth="2" />
            </g>
          )
        })}
      </svg>
    )
  }

  return (
    <svg className="empty-illustration" viewBox="0 0 200 140" aria-hidden>
      <rect x="0" y="0" width="200" height="140" fill="transparent" />
      <line x1="36" y1="108" x2="164" y2="108" stroke="var(--mp-border-strong)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="48" y1="108" x2="48" y2="32" stroke="var(--mp-border-strong)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="48" y1="108" x2="44" y2="112" stroke="var(--mp-border-strong)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="48" y1="32" x2="44" y2="36" stroke="var(--mp-border-strong)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="164" y1="108" x2="168" y2="112" stroke="var(--mp-border-strong)" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M52 108 C52 88, 68 72, 88 58 C108 44, 128 36, 156 28"
        fill="none"
        stroke="var(--mp-accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M52 108 C52 88, 68 72, 88 58 C108 44, 128 36, 156 28 L156 108 Z"
        fill="var(--mp-accent-soft)"
        opacity="0.65"
      />
      <line x1="52" y1="108" x2="156" y2="108" stroke="var(--mp-accent)" strokeWidth="1.5" opacity="0.4" />
      <circle cx="156" cy="28" r="4" fill="var(--mp-accent)" />
    </svg>
  )
}
