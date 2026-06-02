import { MathText } from './MathText'

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
            <MathText text={seg.range} compact as="span" className="sign-range" />
            <span className="sign-value">{seg.sign}</span>
          </div>
        ))}
      </div>
      {testPoint && (
        <p className="muted sign-note">
          Test point: <MathText text={testPoint} compact as="span" />
        </p>
      )}
    </div>
  )
}
