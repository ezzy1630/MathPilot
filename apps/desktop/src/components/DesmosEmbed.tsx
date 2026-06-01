import type { GraphPreset } from '../domain/graphPresets'
import { externalGraphUrls } from '../domain/graphPresets'

interface DesmosEmbedProps {
  expression?: string
  title?: string
  presets?: GraphPreset[]
  presetIndex?: number
  onPresetChange?: (index: number) => void
}

export function DesmosEmbed({
  expression = 'y=x^2',
  title = 'Graph check',
  presets,
  presetIndex = 0,
  onPresetChange,
}: DesmosEmbedProps) {
  const activeExpression = presets?.[presetIndex]?.expression ?? expression
  const links = externalGraphUrls(activeExpression)
  const encoded = encodeURIComponent(activeExpression)

  return (
    <div className="desmos-embed mini-panel">
      <div className="graph-panel-head">
        <h3>{title}</h3>
        {presets && presets.length > 1 && onPresetChange && (
          <select
            className="graph-preset-select"
            value={presetIndex}
            onChange={(event) => onPresetChange(Number(event.target.value))}
            aria-label="Graph preset"
          >
            {presets.map((preset, index) => (
              <option key={preset.label} value={index}>
                {preset.label}
              </option>
            ))}
          </select>
        )}
      </div>
      {presets?.[presetIndex]?.notes && <p className="muted graph-preset-note">{presets[presetIndex].notes}</p>}
      <iframe
        title={title}
        src={`https://www.desmos.com/calculator?lang=en&expressions=${encoded}`}
        loading="lazy"
        className="desmos-frame"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
      <div className="external-graph-links">
        <a className="desmos-link" href={links.desmos} target="_blank" rel="noreferrer">
          Open in Desmos
        </a>
        <a className="desmos-link" href={links.geogebra} target="_blank" rel="noreferrer">
          GeoGebra
        </a>
        <a className="desmos-link" href={links.wolfram} target="_blank" rel="noreferrer">
          WolframAlpha
        </a>
      </div>
    </div>
  )
}
