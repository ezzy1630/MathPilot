import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type FormEvent } from 'react'
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
  { value, onChange, placeholder = 'Type your answer', disabled },
  forwardedRef,
) {
  const ref = useRef<MathfieldElement | null>(null)
  const [focused, setFocused] = useState(false)
  useImperativeHandle(forwardedRef, () => ref.current as MathfieldElement)

  const showPlaceholder = !value.trim() && !focused

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
    field.placeholder = ''
  }, [])

  useEffect(() => {
    const field = ref.current
    if (!field) return
    if (field.value !== value) {
      field.setValue(value, { silenceNotifications: true })
    }
  }, [value])

  return (
    <div className={`math-input-shell${focused ? ' is-focused' : ''}${showPlaceholder ? ' is-empty' : ''}`}>
      {showPlaceholder && (
        <span className="math-input-placeholder" aria-hidden="true">
          {placeholder}
        </span>
      )}
      <math-field
        ref={ref}
        className="math-input"
        aria-label={placeholder}
        read-only={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onInput={(event: FormEvent<MathfieldElement>) => {
          onChange(event.currentTarget.value)
        }}
      />
    </div>
  )
})
