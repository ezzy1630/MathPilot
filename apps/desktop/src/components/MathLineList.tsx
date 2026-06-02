import { MathText } from './MathText'

export function MathLineList({
  lines,
  linesLatex,
  className,
  ordered = true,
  showNumbers = true,
}: {
  lines: string[]
  linesLatex?: string[]
  className?: string
  ordered?: boolean
  showNumbers?: boolean
}) {
  if (!lines.length) return null
  const ListTag = ordered ? 'ol' : 'ul'

  return (
    <ListTag className={className}>
      {lines.map((line, index) => (
        <li key={`${line}-${index}`}>
          {ordered && showNumbers && <span className="step-num">{index + 1}</span>}
          <MathText text={line} latex={linesLatex?.[index]} compact as="span" />
        </li>
      ))}
    </ListTag>
  )
}
