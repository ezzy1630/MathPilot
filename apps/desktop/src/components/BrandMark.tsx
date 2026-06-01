export function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      className="brand-mark"
    >
      <defs>
        <linearGradient id="mp-brand-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--mp-accent)" />
          <stop offset="100%" stopColor="var(--mp-accent-hover, var(--mp-accent))" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#mp-brand-gradient)" />
      <text
        x="12"
        y="16.5"
        textAnchor="middle"
        fontSize="13"
        fontWeight="650"
        fill="var(--mp-bg-elevated, #fff)"
        fontFamily="var(--mp-font, system-ui, sans-serif)"
      >
        ∫
      </text>
    </svg>
  )
}
