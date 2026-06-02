import type { Skill } from './types'
import type { DiagnosticMixSpec } from './diagnosticQuestionMix'

const PROCEDURAL_CHOICE: DiagnosticMixSpec = {
  skillId: '',
  kind: 'choice',
  title: 'Method check',
  prompt: '',
  expectedAnswer: 'procedural setup first',
  answerType: 'choice',
  choices: ['procedural setup first', 'guess and check', 'skip algebra', 'memorize only'],
  difficulty: 0.35,
  hintSequence: ['Match the problem structure to a standard technique before computing.'],
}

const CONCEPT_CHOICE: DiagnosticMixSpec = {
  skillId: '',
  kind: 'choice',
  title: 'Concept check',
  prompt: '',
  expectedAnswer: 'definition or condition',
  answerType: 'choice',
  choices: ['definition or condition', 'always equals endpoint value', 'ignore prerequisites', 'only memorize formula'],
  difficulty: 0.32,
  hintSequence: ['Concept questions test meaning, not just calculation.'],
}

const ERROR_ID: DiagnosticMixSpec = {
  skillId: '',
  kind: 'error_identification',
  title: 'Spot the mistake',
  prompt: '',
  expectedAnswer: 'setup',
  answerType: 'text',
  difficulty: 0.38,
  hintSequence: ['Name the step where the error started.'],
}

export function fallbackDiagnosticMixForSkill(skill: Skill): DiagnosticMixSpec[] {
  const mistake = skill.commonMistakes[0] ?? 'setup error'
  const name = skill.name

  if (skill.type === 'conceptual' || skill.type === 'mixed') {
    return [
      {
        ...CONCEPT_CHOICE,
        skillId: skill.id,
        prompt: `Which best describes a key idea in ${name}?`,
        expectedAnswer: 'definition or condition',
        hintSequence: [
          `Think about when ${name} applies.`,
          `Watch for: ${mistake}.`,
          'Eliminate choices that skip definitions.',
        ],
      },
      {
        ...ERROR_ID,
        skillId: skill.id,
        prompt: `A student misses "${mistake}" on ${name}. What should they check first?`,
        expectedAnswer: 'setup',
      },
    ]
  }

  return [
    {
      ...PROCEDURAL_CHOICE,
      skillId: skill.id,
      prompt: `Before computing for ${name}, what is the best first move?`,
      expectedAnswer: 'procedural setup first',
      hintSequence: ['Identify structure before algebra.', `Common slip: ${mistake}.`],
    },
    {
      ...ERROR_ID,
      skillId: skill.id,
      prompt: `On ${name}, a student makes this error: "${mistake}". What step failed?`,
      expectedAnswer: 'setup',
    },
  ]
}

export function ensureDiagnosticMixCoverage(
  existing: DiagnosticMixSpec[],
  skills: Skill[],
): DiagnosticMixSpec[] {
  const covered = new Set(existing.map((s) => s.skillId))
  const fallbacks: DiagnosticMixSpec[] = []
  for (const skill of skills) {
    if (covered.has(skill.id)) continue
    fallbacks.push(...fallbackDiagnosticMixForSkill(skill))
    covered.add(skill.id)
  }
  return [...existing, ...fallbacks]
}
