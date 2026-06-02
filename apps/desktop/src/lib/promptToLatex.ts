/**
 * Converts plain-text problem prompts (sympy-style) into LaTeX for MathLive display.
 * Prompts that already contain LaTeX commands are returned unchanged.
 */

const LATEX_COMMAND = /\\[a-zA-Z]+/

export function isAlreadyLatex(prompt: string): boolean {
  return LATEX_COMMAND.test(prompt)
}

export function looksLikeMath(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  if (isAlreadyLatex(trimmed)) return true
  return /[\^/_]|\\to|→|∞|π|θ|∫|∑|lim\s|d\/d|[a-zA-Z]\'|f'|f''|\([^)]*[xy0-9][^)]*\)|sin\(|cos\(|tan\(|ln\(|e\^|sqrt\(|[0-9][xy]|\\frac|\\sqrt|\\sin|\\cos|\\lim|\\int|\\sum|≤|≥|≠|±|\||\^\(|\\pi|\\theta/i.test(
    trimmed,
  )
}

function normalizeUnicode(prompt: string): string {
  return prompt
    .replace(/\u2192/g, ' \\to ')
    .replace(/\u2212/g, '-')
    .replace(/∫_([^ \t]+)\^([^ \s]+)/g, '\\int_{$1}^{$2}')
    .replace(/∫_([^ \s]+)/g, '\\int_{$1}')
    .replace(/\u222B/g, '\\int')
    .replace(/∑_([^ \t]+)\^([^ \s]+)/g, '\\sum_{$1}^{$2}')
    .replace(/∑_([^ \s]+)/g, '\\sum_{$1}')
    .replace(/\u2211/g, '\\sum')
    .replace(/\u221E/g, '\\infty')
    .replace(/\u03C0/g, '\\pi')
    .replace(/\u2218/g, '\\circ')
    .replace(/\u2260/g, '\\neq')
    .replace(/\u207A/g, '^+')
    .replace(/\u207B/g, '^-')
    .replace(/\u00B1/g, '\\pm')
    .replace(/\u0394/g, '\\Delta')
    .replace(/\u03B8/g, '\\theta')
    .replace(/\s+/g, ' ')
    .trim()
}

function replaceLimits(prompt: string): string {
  return prompt.replace(
    /\blim\s+([a-zA-Z])\s*(?:\\to|→)\s*([^\s.]+(?:\^[-+])?)/gi,
    (_, variable, dest) => `\\lim_{${variable} \\to ${dest.trim()}}`,
  )
}

/** English "of" after a limit is redundant before the expression (Evaluate lim … of expr). */
function dropRedundantOfAfterLimit(prompt: string): string {
  return prompt.replace(/(\\lim_{[^}]+})\s+of\s+/gi, '$1 ')
}

function replaceFractions(prompt: string): string {
  let result = prompt
  let previous = ''
  while (result !== previous) {
    previous = result
    result = replaceOneFractionPass(result)
  }
  return result
}

function replaceOneFractionPass(prompt: string): string {
  let output = ''
  let index = 0

  while (index < prompt.length) {
    if (prompt[index] === '(') {
      const numerator = absorbBalancedParens(prompt, index)
      const slashIndex = numerator.next
      if (prompt[slashIndex] === '/') {
        const afterSlash = slashIndex + 1
        if (prompt[afterSlash] === '(') {
          const denominator = absorbBalancedParens(prompt, afterSlash)
          output += `\\frac{${numerator.value.slice(1, -1).trim()}}{${denominator.value.slice(1, -1).trim()}}`
          index = denominator.next
          continue
        }
        const simpleDenMatch = prompt.slice(afterSlash).match(/^([a-zA-Z0-9^{}\s+\-]+)/)
        if (simpleDenMatch) {
          output += `\\frac{${numerator.value.slice(1, -1).trim()}}{${simpleDenMatch[1].trim()}}`
          index = afterSlash + simpleDenMatch[1].length
          continue
        }
      }
      output += numerator.value
      index = numerator.next
      continue
    }
    output += prompt[index]
    index += 1
  }

  return output
}

function replaceDerivativeNotation(prompt: string): string {
  return prompt
    .replace(/\bd\s*\/\s*d([A-Za-z]+)\b/g, (_, den) => `\\frac{d}{d${den}}`)
    .replace(/\bd([A-Za-z]+)\s*\/\s*d([A-Za-z]+)\b/g, (_, num, den) => {
      return `\\frac{d${num}}{d${den}}`
    })
}

function replaceDifferentials(prompt: string): string {
  return prompt.replace(/\s+d([a-zA-Z])\b/g, ' \\, d$1')
}

function replaceTrigAndFunctions(prompt: string): string {
  return prompt
    .replace(/\bsin\b/g, '\\sin')
    .replace(/\bcos\b/g, '\\cos')
    .replace(/\btan\b/g, '\\tan')
    .replace(/\bsec\b/g, '\\sec')
    .replace(/\bcsc\b/g, '\\csc')
    .replace(/\bcot\b/g, '\\cot')
    .replace(/\bln\b/g, '\\ln')
    .replace(/\blog\b/g, '\\log')
    .replace(/\barcsin\b/g, '\\arcsin')
    .replace(/\barccos\b/g, '\\arccos')
    .replace(/\barctan\b/g, '\\arctan')
}

function replaceSqrt(prompt: string): string {
  return prompt.replace(/\bsqrt\(([^)]+)\)/g, (_, body) => `\\sqrt{${body.trim()}}`)
}

function replacePrimeNotation(prompt: string): string {
  return prompt
    .replace(/([a-zA-Z)\]])''(?=\(|$|\s|=|\/|,)/g, '$1^{\\prime\\prime}')
    .replace(/([a-zA-Z)\]])'(?=\(|$|\s|=|\/|,|[a-zA-Z])/g, "$1^{\\prime}")
}

function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/[{}]/g, (char) => `\\${char}`)
}

function absorbBalancedParens(prompt: string, index: number): { value: string; next: number } {
  let depth = 0
  let i = index
  while (i < prompt.length) {
    if (prompt[i] === '(') depth += 1
    if (prompt[i] === ')') {
      depth -= 1
      i += 1
      if (depth === 0) break
    } else {
      i += 1
    }
  }
  return { value: prompt.slice(index, i), next: i }
}

function absorbBalancedBraces(prompt: string, index: number): { value: string; next: number } {
  let depth = 0
  let i = index
  while (i < prompt.length) {
    if (prompt[i] === '{') depth += 1
    if (prompt[i] === '}') {
      depth -= 1
      i += 1
      if (depth === 0) break
    } else {
      i += 1
    }
  }
  return { value: prompt.slice(index, i), next: i }
}

function absorbLatex(prompt: string, index: number): { value: string; next: number } {
  let i = index + 1
  while (i < prompt.length && /[a-zA-Z]/.test(prompt[i] ?? '')) i += 1
  while (i < prompt.length) {
    if (prompt[i] === '{') {
      const group = absorbBalancedBraces(prompt, i)
      i = group.next
      continue
    }
    if (prompt[i] === '_' || prompt[i] === '^') {
      i += 1
      if (prompt[i] === '{') {
        const group = absorbBalancedBraces(prompt, i)
        i = group.next
      }
      continue
    }
    break
  }
  return { value: prompt.slice(index, i).trim(), next: i }
}

const MATH_FUNCTION_NAMES = /^(sin|cos|tan|sec|csc|cot|ln|log|exp|sqrt|lim|max|min)$/i

function isMathStart(prompt: string, index: number): boolean {
  const rest = prompt.slice(index)
  if (rest.startsWith('\\')) return true
  if (/^[a-zA-Z]+\s*\(/.test(rest)) {
    const before = prompt.slice(Math.max(0, index - 1), index)
    if (before && /[a-zA-Z]/.test(before)) return false
    const name = rest.match(/^([a-zA-Z]+)\s*\(/)?.[1] ?? ''
    if (/^[fgh]$/i.test(name) || MATH_FUNCTION_NAMES.test(name)) return true
  }
  if (/^\d+[a-zA-Z]/.test(rest)) return true
  if (/^[a-zA-Z][\^=_]/.test(rest)) return true
  if (/^[a-zA-Z]\s*[=+\-*/^]/.test(rest)) return true
  if (/^[\d+\-*/^=|]/.test(rest)) return true
  return false
}

function absorbMath(prompt: string, index: number): { value: string; next: number } {
  let i = index

  if (/^[a-zA-Z]/.test(prompt.slice(i))) {
    while (i < prompt.length && /[a-zA-Z0-9_]/.test(prompt[i] ?? '')) i += 1
    if (prompt[i] === '(') {
      const group = absorbBalancedParens(prompt, i)
      i = group.next
    }
  } else if (prompt[i] === '(') {
    const group = absorbBalancedParens(prompt, i)
    i = group.next
  }

  while (i < prompt.length) {
    const char = prompt[i] ?? ''

    if (char === ' ') {
      const nextChar = prompt[i + 1] ?? ''
      if (nextChar === '(' || isMathStart(prompt, i + 1) || /[=+\-*/^,.]/.test(nextChar)) {
        i += 1
        continue
      }
      break
    }

    if (char === '\\') {
      const chunk = absorbLatex(prompt, i)
      i = chunk.next
      continue
    }

    if (char === '(') {
      const group = absorbBalancedParens(prompt, i)
      i = group.next
      continue
    }

    if (/^[a-zA-Z]\s*\(/.test(prompt.slice(i))) {
      while (i < prompt.length && /[a-zA-Z0-9_]/.test(prompt[i] ?? '')) i += 1
      if (prompt[i] === '(') {
        const group = absorbBalancedParens(prompt, i)
        i = group.next
      }
      continue
    }

    if (/[0-9a-zA-Z+\-*/^=.,'|_{}]/.test(char)) {
      i += 1
      continue
    }

    break
  }

  const value = prompt.slice(index, i).trim()
  return { value, next: value ? i : index + 1 }
}

function absorbText(prompt: string, index: number): { value: string; next: number } {
  let i = index
  while (i < prompt.length) {
    const char = prompt[i] ?? ''
    if (char === '\\' || char === '(' || isMathStart(prompt, i)) break
    i += 1
  }
  return { value: prompt.slice(index, i).trim(), next: i > index ? i : index + 1 }
}

function wrapTextSegments(prompt: string): string {
  const parts: string[] = []
  let index = 0

  while (index < prompt.length) {
    if (prompt[index] === ' ') {
      index += 1
      continue
    }

    if (prompt[index] === '\\' || prompt[index] === '(' || isMathStart(prompt, index)) {
      const { value, next } = absorbMath(prompt, index)
      if (value) parts.push(value)
      index = next
      continue
    }

    const { value, next } = absorbText(prompt, index)
    if (value) parts.push(`\\text{${escapeText(value)} }`)
    index = next
  }

  return parts.join('')
}

export function promptToLatex(prompt: string): string {
  const trimmed = prompt.trim()
  if (!trimmed) return trimmed
  if (isAlreadyLatex(trimmed)) return trimmed

  let latex = normalizeUnicode(trimmed)
  latex = replaceLimits(latex)
  latex = dropRedundantOfAfterLimit(latex)
  latex = replaceFractions(latex)
  latex = replaceDerivativeNotation(latex)
  latex = replaceDifferentials(latex)
  latex = replaceSqrt(latex)
  latex = replacePrimeNotation(latex)
  latex = replaceTrigAndFunctions(latex)
  latex = wrapTextSegments(latex)

  return latex
}
