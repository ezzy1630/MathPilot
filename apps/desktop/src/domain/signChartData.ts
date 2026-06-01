export function signChartForSkill(skillId: string): {
  intervals: Array<{ range: string; sign: '+' | '-' | '0' }>
  testPoint?: string
} | null {
  if (['extrema', 'concavity', 'curve_sketching'].includes(skillId)) {
    return {
      intervals: [
        { range: '(-∞, -1)', sign: '-' },
        { range: '(-1, 1)', sign: '+' },
        { range: '(1, ∞)', sign: '-' },
      ],
      testPoint: "f'(x) for f(x)=x³−3x",
    }
  }
  if (skillId === 'related_rates') {
    return {
      intervals: [
        { range: 't ≥ 0', sign: '+' },
        { range: 'dr/dt', sign: '+' },
      ],
      testPoint: 'Radius increasing → area increasing',
    }
  }
  return null
}
