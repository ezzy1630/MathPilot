import { useMemo } from 'react'
import type { BuiltInGraphKind as PresetGraphKind, BuiltInGraphPresetProps } from '../domain/graphPresets'

export type BuiltInGraphKind = PresetGraphKind

export interface BuiltInGraphProps extends BuiltInGraphPresetProps {
  width?: number
  height?: number
}

function sampleFn(
  fn: (x: number) => number,
  domain: [number, number],
  n = 80,
): Array<{ x: number; y: number }> {
  const [a, b] = domain
  const pts: Array<{ x: number; y: number }> = []
  for (let i = 0; i <= n; i++) {
    const x = a + ((b - a) * i) / n
    const y = fn(x)
    if (Number.isFinite(y)) pts.push({ x, y })
  }
  return pts
}

function toPath(
  pts: Array<{ x: number; y: number }>,
  w: number,
  h: number,
  pad: number,
  yMin: number,
  yMax: number,
  xMin: number,
  xMax: number,
): string {
  const sx = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * (w - 2 * pad)
  const sy = (y: number) => h - pad - ((y - yMin) / (yMax - yMin || 1)) * (h - 2 * pad)
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')
}

export function BuiltInGraph({
  kind,
  fn = (x) => x * x,
  domain = [-3, 3],
  tangentAt = 1,
  taylorCoeffs = [0, 1, 0.5],
  signIntervals = [
    { from: -3, to: 0, sign: '-' },
    { from: 0, to: 3, sign: '+' },
  ],
  title,
  width = 320,
  height = 200,
}: BuiltInGraphProps) {
  const pad = 28
  const plot = useMemo(() => {
    const pts = sampleFn(fn, domain)
    const ys = pts.map((p) => p.y)
    const yMin = Math.min(...ys, -1)
    const yMax = Math.max(...ys, 1)
    const [xMin, xMax] = domain
    const curve = toPath(pts, width, height, pad, yMin, yMax, xMin, xMax)
    const h = 0.001
    const slope = (fn(tangentAt + h) - fn(tangentAt - h)) / (2 * h)
    const y0 = fn(tangentAt)
    const tanPts = [
      { x: xMin, y: y0 + slope * (xMin - tangentAt) },
      { x: xMax, y: y0 + slope * (xMax - tangentAt) },
    ]
    const tangent = toPath(tanPts, width, height, pad, yMin, yMax, xMin, xMax)
    const taylorPts = sampleFn(
      (x) => taylorCoeffs.reduce((sum, c, i) => sum + c * x ** i, 0),
      domain,
    )
    const taylor = toPath(taylorPts, width, height, pad, yMin, yMax, xMin, xMax)
    return { curve, tangent, taylor, yMin, yMax, xMin, xMax }
  }, [domain, fn, height, taylorCoeffs, tangentAt, width])

  const sx = (x: number) => pad + ((x - plot.xMin) / (plot.xMax - plot.xMin)) * (width - 2 * pad)

  return (
    <figure className="built-in-graph" aria-label={title ?? kind}>
      {title ? <figcaption className="built-in-graph__title">{title}</figcaption> : null}
      <svg width={width} height={height} role="img">
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="var(--mp-border)" />
        <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="var(--mp-border)" />
        {kind === 'sign_chart' &&
          signIntervals.map((seg, i) => (
            <g key={i}>
              <rect
                x={sx(seg.from)}
                y={pad}
                width={Math.max(4, sx(seg.to) - sx(seg.from))}
                height={height - 2 * pad}
                fill={seg.sign === '+' ? 'rgba(34,197,94,0.2)' : seg.sign === '-' ? 'rgba(239,68,68,0.2)' : 'rgba(148,163,184,0.2)'}
              />
              <text x={(sx(seg.from) + sx(seg.to)) / 2} y={height / 2} textAnchor="middle" fontSize="12">
                {seg.sign}
              </text>
            </g>
          ))}
        {(kind === 'function' || kind === 'tangent' || kind === 'riemann' || kind === 'taylor' || kind === 'slope_field') && (
          <path d={plot.curve} fill="none" stroke="var(--mp-accent)" strokeWidth="2" />
        )}
        {(kind === 'tangent' || kind === 'function') && (
          <path d={plot.tangent} fill="none" stroke="var(--mp-warning)" strokeWidth="1.5" strokeDasharray="4 3" />
        )}
        {kind === 'taylor' && (
          <path d={plot.taylor} fill="none" stroke="var(--mp-success)" strokeWidth="1.5" strokeDasharray="2 2" />
        )}
        {kind === 'riemann' &&
          Array.from({ length: 8 }, (_, i) => {
            const [a, b] = domain
            const dx = (b - a) / 8
            const x0 = a + i * dx
            const y = fn(x0)
            const x1 = sx(x0)
            const x2 = sx(x0 + dx)
            const yBase = height - pad
            const yTop = yBase - (Math.abs(y) / Math.max(Math.abs(plot.yMax), 1)) * (height - 2 * pad)
            return (
              <rect
                key={i}
                x={x1}
                y={Math.min(yBase, yTop)}
                width={Math.max(2, x2 - x1 - 1)}
                height={Math.abs(yBase - yTop)}
                fill="rgba(59,130,246,0.25)"
                stroke="var(--mp-accent)"
              />
            )
          })}
        {kind === 'slope_field' &&
          Array.from({ length: 7 }, (_, ix) =>
            Array.from({ length: 7 }, (_, iy) => {
              const [a, b] = domain
              const x = a + (ix * (b - a)) / 6
              const y = plot.yMin + (iy * (plot.yMax - plot.yMin)) / 6
              const h = 0.05
              const dydx = (fn(x + h) - fn(x - h)) / (2 * h)
              const angle = Math.atan(dydx)
              const cx = sx(x)
              const cy = height - pad - ((y - plot.yMin) / (plot.yMax - plot.yMin || 1)) * (height - 2 * pad)
              const len = 8
              return (
                <line
                  key={`${ix}-${iy}`}
                  x1={cx - len * Math.cos(angle)}
                  y1={cy - len * Math.sin(angle)}
                  x2={cx + len * Math.cos(angle)}
                  y2={cy + len * Math.sin(angle)}
                  stroke="var(--mp-muted)"
                  strokeWidth="1"
                />
              )
            }),
          )}
      </svg>
    </figure>
  )
}
