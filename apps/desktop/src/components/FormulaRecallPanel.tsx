import { useState } from 'react'
import { checkFormulaAnswer, nextFormulaRecall } from '../domain/formulaRecall'
import type { MathPilotState } from '../domain/types'
import { MathInput } from './MathInput'
import { MathText } from './MathText'

export function FormulaRecallPanel({
  state,
  onComplete,
}: {
  state: MathPilotState
  onComplete: (correct: boolean) => void
}) {
  const prompt = nextFormulaRecall(state)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')

  if (!prompt) return null
  const active = prompt

  function check() {
    const ok = checkFormulaAnswer(active.expected, answer)
    setFeedback(ok ? 'Good recall — moving on.' : 'Close — review the standard form and try again.')
    if (ok) onComplete(true)
  }

  return (
    <section className="panel formula-recall">
      <p className="eyebrow">Formula recall</p>
      <MathText text={active.prompt} className="formula-recall-prompt" as="h3" />
      <MathInput value={answer} onChange={setAnswer} placeholder="Type the formula" />
      <div className="help-toolbar">
        <button type="button" className="primary" onClick={check}>
          Check recall
        </button>
        <button type="button" className="ghost" onClick={() => onComplete(false)}>
          Skip
        </button>
      </div>
      {feedback && <p className="feedback">{feedback}</p>}
    </section>
  )
}
