import { forwardRef, useEffect, useImperativeHandle, useRef, type FormEvent } from 'react'
import 'mathlive'
import { MathfieldElement } from 'mathlive'
import { mergeMathInlineShortcuts } from '../lib/mathInlineShortcuts'

MathfieldElement.fontsDirectory = '/mathlive-fonts'

interface MathInputProps {
  value: string
  onChange: (latex: string) => void
  placeholder?: string
  disabled?: boolean
}

export const MathInput = forwardRef<MathfieldElement | null, MathInputProps>(function MathInput(
  { value, onChange, placeholder, disabled },
  forwardedRef,
) {
  const ref = useRef<MathfieldElement | null>(null)
  useImperativeHandle(forwardedRef, () => ref.current as MathfieldElement)

  useEffect(() => {
    const field = ref.current
    if (!field) return

    field.defaultMode = 'math'
    field.smartMode = false
    field.smartFence = true
    field.smartSuperscript = true
    field.removeExtraneousParentheses = true
    field.mathVirtualKeyboardPolicy = 'auto'
    field.inlineShortcutTimeout = 400
    field.inlineShortcuts = mergeMathInlineShortcuts({ ...field.inlineShortcuts })
    field.placeholder = placeholder ?? 'Type your answer'
  }, [placeholder])

  useEffect(() => {
    const field = ref.current
    if (!field) return
    if (field.value !== value) {
      field.setValue(value, { silenceNotifications: true })
    }
  }, [value])

  return (
    <math-field
      ref={ref}
      className="math-input"
      aria-label={placeholder ?? 'Math answer'}
      read-only={disabled}
      onInput={(event: FormEvent<MathfieldElement>) => {
        onChange(event.currentTarget.value)
      }}
    />
  )
})
