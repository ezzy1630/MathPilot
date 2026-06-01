interface DesmosEmbedProps {
  expression?: string
  title?: string
}

export function DesmosEmbed({ expression = 'y=x^2', title = 'Graph check' }: DesmosEmbedProps) {
  const encoded = encodeURIComponent(expression)
  const src = `https://www.desmos.com/calculator?lang=en&expressions=${encoded}`

  return (
    <div className="desmos-embed mini-panel">
      <h3>{title}</h3>
      <iframe
        title={title}
        src={src}
        loading="lazy"
        className="desmos-frame"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
      <a className="desmos-link" href={src} target="_blank" rel="noreferrer">
        Open in Desmos
      </a>
    </div>
  )
}
