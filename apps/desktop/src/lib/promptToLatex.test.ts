import { describe, expect, it } from 'vitest'
import { isAlreadyLatex, looksLikeMath, promptToLatex } from './promptToLatex'

describe('promptToLatex', () => {
  it('passes through existing LaTeX', () => {
    const input = '\\lim_{x \\to 1} \\frac{x^2 - 1}{x - 1}'
    expect(isAlreadyLatex(input)).toBe(true)
    expect(promptToLatex(input)).toBe(input)
  })

  it('typesets limit evaluation prompts', () => {
    const latex = promptToLatex('Evaluate lim x→1 of (x^2 - 1)/(x - 1).')
    expect(latex).toContain('\\lim_{x \\to 1}')
    expect(latex).toContain('\\frac{x^2 - 1}{x - 1}')
    expect(latex).toContain('\\text{Evaluate }')
    expect(latex).not.toContain('\\text{of')
  })

  it('typesets infinity limits', () => {
    const latex = promptToLatex('Evaluate lim x→∞ of (3x^2 + 1)/(x^2 - 2).')
    expect(latex).toContain('\\lim_{x \\to \\infty}')
    expect(latex).toContain('\\frac{3x^2 + 1}{x^2 - 2}')
  })

  it('typesets one-sided limits', () => {
    const latex = promptToLatex('For f(x) = |x|/x, what is lim x→0⁺ f(x)?')
    expect(latex).toContain('\\lim_{x \\to 0^+}')
  })

  it('typesets derivative prompts', () => {
    const latex = promptToLatex('Differentiate f(x) = cos(x).')
    expect(latex).toContain('\\cos')
    expect(latex).toContain('f(x) =')
  })

  it('typesets dy/dx notation', () => {
    const latex = promptToLatex('Find dy/dx if x^2 + y^2 = 25.')
    expect(latex).toContain('\\frac{dy}{dx}')
  })

  it('typesets polynomial expansion prompts', () => {
    const latex = promptToLatex('Expand and simplify (2x + 3)(x - 4).')
    expect(latex).toContain('\\text{Expand and simplify }')
    expect(latex).toContain('(2x + 3)(x - 4)')
  })

  it('typesets formula recall prompts', () => {
    const latex = promptToLatex('State the chain rule (Leibniz form).')
    expect(latex).toContain('\\text{State the chain rule }')
    expect(latex).toContain('Leibniz form')

    const ftc = promptToLatex('d/dx ∫_a^x f(t) dt = f(x)')
    expect(ftc).toContain('\\frac{d}{dx}')
    expect(ftc).toContain('\\int_{a}^{x}')

    const limitDef = promptToLatex('lim h→0 (f(x+h)-f(x))/h')
    expect(limitDef).toContain('\\lim_{h \\to 0}')
    expect(limitDef).toContain('\\frac{f(x+h)-f(x)}{h}')
  })

  it('typesets integration-by-parts formula recall answers', () => {
    const latex = promptToLatex('∫ u dv = uv - ∫ v du')
    expect(latex).toContain('\\int')
    expect(latex).toContain('\\text{u }')
    expect(latex).toContain('\\text{v }')
  })

  it('typesets L\'Hopital indeterminate forms with infinity', () => {
    const latex = promptToLatex('0/0 or ∞/∞ indeterminate forms')
    expect(latex).toContain('\\infty')
    expect(latex).toContain('0/0')
  })

  it('typesets arc length differential with nested dy/dx fraction', () => {
    const latex = promptToLatex('sqrt(1+(dy/dx)^2) dx')
    expect(latex).toContain('\\sqrt')
    expect(latex).toContain('\\frac{dy}{dx}')
  })

  it('detects math-heavy strings', () => {
    expect(looksLikeMath('Evaluate lim x→1')).toBe(true)
    expect(looksLikeMath('chain rule')).toBe(false)
  })
})
