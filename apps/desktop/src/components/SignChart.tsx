export function SignChart({
  intervals,
  testPoint,
}: {
  intervals: Array<{ range: string; sign: '+' | '-' | '0' }>
  testPoint?: string
}) {
  return (
    <div className="sign-chart" aria-label="Sign chart">
      <div className="sign-chart-row">
        {intervals.map((seg) => (
          <div key={seg.range} className={`sign-segment sign-${seg.sign === '+' ? 'pos' : seg.sign === '-' ? 'neg' : 'zero'}`}>
            <span className="sign-range">{seg.range}</span>
            <span className="sign-value">{seg.sign}</span>
          </div>
        ))}
      </div>
      {testPoint && <p className="muted sign-note">Test point: {testPoint}</p>}
    </div>
  )
}
