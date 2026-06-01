import { useMemo } from 'react'
import type { BuiltInGraphKind as PresetGraphKind, BuiltInGraphPresetProps } from '../domain/graphPresets'
import { partialSumGeometric } from '../domain/graphPresets'

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

function sampleParametric(
  xFn: (t: number) => number,
  yFn: (t: number) => number,
  domain: [number, number],
  n = 96,
): Array<{ x: number; y: number }> {
  const [a, b] = domain
  const pts: Array<{ x: number; y: number }> = []
  for (let i = 0; i <= n; i++) {
    const t = a + ((b - a) * i) / n
    const x = xFn(t)
    const y = yFn(t)
    if (Number.isFinite(x) && Number.isFinite(y)) pts.push({ x, y })
  }
  return pts
}

function samplePolar(
  rFn: (theta: number) => number,
  n = 96,
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = []
  for (let i = 0; i <= n; i++) {
    const theta = (2 * Math.PI * i) / n
    const r = rFn(theta)
    const x = r * Math.cos(theta)
    const y = r * Math.sin(theta)
    if (Number.isFinite(x) && Number.isFinite(y)) pts.push({ x, y })
  }
  return pts
}

function boundsFromPoints(pts: Array<{ x: number; y: number }>, padFrac = 0.08) {
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  let xMin = Math.min(...xs, 0)
  let xMax = Math.max(...xs, 1)
  let yMin = Math.min(...ys, -1)
  let yMax = Math.max(...ys, 1)
  const xPad = (xMax - xMin || 1) * padFrac
  const yPad = (yMax - yMin || 1) * padFrac
  xMin -= xPad
  xMax += xPad
  yMin -= yPad
  yMax += yPad
  return { xMin, xMax, yMin, yMax }
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
  const sx = (x: number) => pad + ((x - xMin) / (xMax - xMin || 1)) * (w - 2 * pad)
  const sy = (y: number) => h - pad - ((y - yMin) / (yMax - yMin || 1)) * (h - 2 * pad)
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ')
}

function RelatedRatesDiagram({ width, height, pad }: { width: number; height: number; pad: number }) {
  const wallX = pad + 12
  const groundY = height - pad
  const topY = pad + 24
  const baseX = width - pad - 40
  const ladderTop = { x: wallX, y: topY }
  const ladderFoot = { x: baseX, y: groundY }

  return (
    <g className="related-rates-diagram">
      <line x1={wallX} y1={topY} x2={wallX} y2={groundY} stroke="var(--mp-border)" strokeWidth="2" />
      <line x1={wallX} y1={groundY} x2={baseX} y2={groundY} stroke="var(--mp-border)" strokeWidth="2" />
      <line
        x1={ladderTop.x}
        y1={ladderTop.y}
        x2={ladderFoot.x}
        y2={ladderFoot.y}
        stroke="var(--mp-accent)"
        strokeWidth="2.5"
      />
      <text x={wallX - 6} y={(topY + groundY) / 2} textAnchor="end" fontSize="11" fill="var(--mp-text)">
        h
      </text>
      <text x={(wallX + baseX) / 2} y={groundY + 14} textAnchor="middle" fontSize="11" fill="var(--mp-text)">
        x
      </text>
      <text x={(ladderTop.x + ladderFoot.x) / 2 + 8} y={(ladderTop.y + ladderFoot.y) / 2 - 6} fontSize="10" fill="var(--mp-muted)">
        L
      </text>
      <text x={wallX + 8} y={topY - 4} fontSize="9" fill="var(--mp-warning)">
        dh/dt
      </text>
      <text x={baseX - 4} y={groundY - 8} textAnchor="end" fontSize="9" fill="var(--mp-warning)">
        dx/dt
      </text>
      <text x={pad} y={pad + 10} fontSize="10" fill="var(--mp-muted)">
        L² = x² + h² → differentiate
      </text>
    </g>
  )
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
  seriesRatio = 0.5,
  seriesTerms = 12,
  polarR = (theta) => 1 + Math.cos(theta),
  parametricX = (t) => Math.cos(t),
  parametricY = (t) => Math.sin(t),
  parametricDomain = [0, 2 * Math.PI],
  title,
  width = 320,
  height = 200,
}: BuiltInGraphProps) {
  const pad = 28

  const seriesPlot = useMemo(() => {
    const pts: Array<{ x: number; y: number }> = []
    for (let n = 1; n <= seriesTerms; n++) {
      pts.push({ x: n, y: partialSumGeometric(n, seriesRatio) })
    }
    const limit = seriesRatio < 1 ? seriesRatio / (1 - seriesRatio) : NaN
    const bounds = boundsFromPoints(pts)
    if (Number.isFinite(limit)) bounds.yMax = Math.max(bounds.yMax, limit)
    return { pts, path: toPath(pts, width, height, pad, bounds.yMin, bounds.yMax, bounds.xMin, bounds.xMax), ...bounds, limit }
  }, [height, seriesRatio, seriesTerms, width])

  const polarPlot = useMemo(() => {
    const pts = samplePolar(polarR)
    const bounds = boundsFromPoints(pts)
    return { path: toPath(pts, width, height, pad, bounds.yMin, bounds.yMax, bounds.xMin, bounds.xMax), ...bounds }
  }, [height, polarR, width])

  const parametricPlot = useMemo(() => {
    const pts = sampleParametric(parametricX, parametricY, parametricDomain)
    const bounds = boundsFromPoints(pts)
    return { path: toPath(pts, width, height, pad, bounds.yMin, bounds.yMax, bounds.xMin, bounds.xMax), ...bounds }
  }, [height, parametricDomain, parametricX, parametricY, width])

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

  const cartesianBounds =
    kind === 'series_partial_sums'
      ? seriesPlot
      : kind === 'polar'
        ? polarPlot
        : kind === 'parametric'
          ? parametricPlot
          : plot

  const sx = (x: number) =>
    pad + ((x - cartesianBounds.xMin) / (cartesianBounds.xMax - cartesianBounds.xMin || 1)) * (width - 2 * pad)
  const sy = (y: number) =>
    height -
    pad -
    ((y - cartesianBounds.yMin) / (cartesianBounds.yMax - cartesianBounds.yMin || 1)) * (height - 2 * pad)

  const isCartesianFn =
    kind === 'function' ||
    kind === 'tangent' ||
    kind === 'riemann' ||
    kind === 'taylor' ||
    kind === 'slope_field'

  return (
    <figure className="built-in-graph" aria-label={title ?? kind}>
      {title ? <figcaption className="built-in-graph__title">{title}</figcaption> : null}
      <svg width={width} height={height} role="img">
        {kind !== 'related_rates_diagram' && (
          <>
            <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="var(--mp-border)" />
            <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="var(--mp-border)" />
          </>
        )}
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
        {isCartesianFn && <path d={plot.curve} fill="none" stroke="var(--mp-accent)" strokeWidth="2" />}
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
        {kind === 'series_partial_sums' && (
          <>
            <path d={seriesPlot.path} fill="none" stroke="var(--mp-accent)" strokeWidth="2" />
            {seriesPlot.pts.map((p) => (
              <circle key={p.x} cx={sx(p.x)} cy={sy(p.y)} r={3} fill="var(--mp-accent)" />
            ))}
            {Number.isFinite(seriesPlot.limit) && (
              <line
                x1={pad}
                y1={sy(seriesPlot.limit)}
                x2={width - pad}
                y2={sy(seriesPlot.limit)}
                stroke="var(--mp-success)"
                strokeWidth="1"
                strokeDasharray="4 3"
              />
            )}
            <text x={width - pad} y={pad + 12} textAnchor="end" fontSize="10" fill="var(--mp-muted)">
              S_n = Σ r^k
            </text>
          </>
        )}
        {kind === 'polar' && (
          <>
            <path d={polarPlot.path} fill="none" stroke="var(--mp-accent)" strokeWidth="2" />
            <text x={width - pad} y={pad + 12} textAnchor="end" fontSize="10" fill="var(--mp-muted)">
              r = f(θ)
            </text>
          </>
        )}
        {kind === 'parametric' && (
          <>
            <path d={parametricPlot.path} fill="none" stroke="var(--mp-accent)" strokeWidth="2" />
            <text x={width - pad} y={pad + 12} textAnchor="end" fontSize="10" fill="var(--mp-muted)">
              (x(t), y(t))
            </text>
          </>
        )}
        {kind === 'related_rates_diagram' && <RelatedRatesDiagram width={width} height={height} pad={pad} />}
      </svg>
    </figure>
  )
}
