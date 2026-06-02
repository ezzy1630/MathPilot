import { MathText } from './MathText'

export function MathChoiceButton({
  choice,
  choiceLatex,
  selected,
  onSelect,
}: {
  choice: string
  choiceLatex?: string
  selected: boolean
  onSelect: (choice: string) => void
}) {
  return (
    <button
      type="button"
      className={`secondary choice-button ${selected ? 'active' : ''}`}
      onClick={() => onSelect(choice)}
    >
      <MathText text={choice} latex={choiceLatex} compact as="span" />
    </button>
  )
}
