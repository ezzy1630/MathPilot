import { describe, expect, it } from 'vitest'
import { chooseNextAction, createInitialState, masteryState, recordAttempt } from './learningEngine'

describe('learning engine', () => {
  it('does not let codexHint override next action routing', () => {
    const state = createInitialState('Calculus 1')
    state.mastery.function_composition.masteryScore = 0.18
    state.mastery.function_composition.masteryState = 'Weak'
    state.mastery.chain_rule.masteryScore = 0.54
    state.mastery.chain_rule.masteryState = 'Learning'

    const action = chooseNextAction({
      ...state,
      codexHint: {
        kind: 'guided_practice',
        title: 'Codex override',
        skillIds: ['limits_intro'],
        reason: 'Codex narrative only — limits next.',
      },
    })

    expect(action.kind).toBe('quick_repair')
    expect(action.skillIds).toContain('function_composition')
    expect(action.reason).toContain('Codex narrative only')
  })

  it('recommends prerequisite repair before a blocked calculus skill', () => {
    const state = createInitialState('Calculus 1')
    const weakPrereq = state.mastery.function_composition
    const target = state.mastery.chain_rule

    weakPrereq.masteryScore = 0.18
    weakPrereq.masteryState = 'Weak'
    target.masteryScore = 0.54
    target.masteryState = 'Learning'

    const action = chooseNextAction(state)

    expect(action.kind).toBe('quick_repair')
    expect(action.skillIds).toContain('function_composition')
  })

  it('gives stronger mastery evidence for delayed mixed correct work than hinted guided work', () => {
    let delayed = createInitialState('Calculus 1')
    let guided = createInitialState('Calculus 1')

    delayed = recordAttempt(delayed, {
      problemId: 'mixed-chain-1',
      skillIds: ['chain_rule'],
      answer: '3(x^2+1)^2 * 2x',
      correct: true,
      mode: 'review',
      hintCount: 0,
      seconds: 85,
      mixed: true,
      delayed: true,
    })

    guided = recordAttempt(guided, {
      problemId: 'guided-chain-1',
      skillIds: ['chain_rule'],
      answer: '3(x^2+1)^2 * 2x',
      correct: true,
      mode: 'guided',
      hintCount: 2,
      seconds: 160,
      mixed: false,
      delayed: false,
    })

    expect(delayed.mastery.chain_rule.masteryScore).toBeGreaterThan(
      guided.mastery.chain_rule.masteryScore,
    )
    expect(delayed.reviewQueue[0].intervalDays).toBeGreaterThan(guided.reviewQueue[0].intervalDays)
  })

  it('penalizes prerequisite skills more than blocked topic on prereq mistakes', () => {
    const state = createInitialState('Calculus 1')
    const beforePrereq = state.mastery.function_composition.masteryScore
    const beforeTarget = state.mastery.chain_rule.masteryScore

    const next = recordAttempt(state, {
      problemId: 'guided-chain-1',
      skillIds: ['chain_rule', 'function_composition'],
      answer: 'wrong',
      correct: false,
      mode: 'guided',
      hintCount: 0,
      seconds: 90,
      mixed: false,
      delayed: false,
      mistakeTags: ['prereq:function_composition'],
    })

    const afterPrereq = next.mastery.function_composition.masteryScore
    const afterTarget = next.mastery.chain_rule.masteryScore
    expect(beforePrereq - afterPrereq).toBeGreaterThan(beforeTarget - afterTarget)
  })

  it('requires delayed mixed evidence before Mastered label', () => {
    let state = createInitialState('Calculus 1')
    state = recordAttempt(state, {
      problemId: 'review-chain-mixed',
      skillIds: ['chain_rule'],
      answer: '8*x*cos(4*x^2)',
      correct: true,
      mode: 'review',
      hintCount: 0,
      seconds: 70,
      mixed: true,
      delayed: true,
    })
    expect(state.mastery.chain_rule.masteryState).not.toBe('Mastered')

    state = recordAttempt(state, {
      problemId: 'review-chain-mixed',
      skillIds: ['chain_rule'],
      answer: '8*x*cos(4*x^2)',
      correct: true,
      mode: 'review',
      hintCount: 0,
      seconds: 70,
      mixed: true,
      delayed: true,
    })
    state = {
      ...state,
      mastery: {
        ...state.mastery,
        chain_rule: {
          ...state.mastery.chain_rule,
          masteryScore: 0.9,
          masteryState: masteryState(0.9, undefined, {
            delayedMixedCorrect: state.mastery.chain_rule.delayedMixedCorrect,
          }),
        },
      },
    }
    expect(state.mastery.chain_rule.masteryState).toBe('Mastered')
  })

  it('turns a homework repair recommendation into the next action', () => {
    const state = createInitialState('Calculus 1')
    const action = chooseNextAction({
      ...state,
      attempts: [
        {
          id: 'attempt-1',
          problemId: 'guided-chain-1',
          skillIds: ['chain_rule'],
          answer: 'wrong',
          correct: false,
          mode: 'homework',
          hintCount: 0,
          seconds: 0,
          mixed: false,
          delayed: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          masteryDelta: -0.08,
        },
        {
          id: 'attempt-2',
          problemId: 'guided-limits-1',
          skillIds: ['limits_intro'],
          answer: '2',
          correct: true,
          mode: 'guided',
          hintCount: 0,
          seconds: 45,
          mixed: false,
          delayed: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          masteryDelta: 0.05,
        },
        {
          id: 'attempt-3',
          problemId: 'guided-derivative-1',
          skillIds: ['derivative_rules_basic'],
          answer: '2*x',
          correct: true,
          mode: 'guided',
          hintCount: 0,
          seconds: 45,
          mixed: false,
          delayed: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          masteryDelta: 0.05,
        },
      ],
      homeworkAnalyses: [
        {
          id: 'homework-1',
          createdAt: '2026-01-01T00:00:00.000Z',
          detectedTopic: 'Chain rule',
          problemText: 'Differentiate y=(x^2+1)^3.',
          extractedWorkSummary: 'Missed inner derivative.',
          correctness: 'incorrect',
          mistakeTags: ['chain_rule:missing_inner_derivative'],
          skillsAffected: ['chain_rule'],
          feedbackSummary: 'The inner derivative is missing.',
          rawImageSaved: false,
          repairRecommendation: {
            skillId: 'chain_rule',
            reason: 'Homework showed a repeated chain rule setup error.',
          },
        },
      ],
    })

    expect(action.kind).toBe('homework_review')
    expect(action.skillIds).toEqual(['chain_rule'])
    expect(action.title).toContain('Homework repair')
    expect(action.reason).toContain('repeated chain rule setup')
  })

  it('applies a larger mastery drop for delayed mixed misses than same-day misses', () => {
    const base = createInitialState('Calculus 1')
    const before = base.mastery.chain_rule.masteryScore

    const sameDay = recordAttempt(base, {
      problemId: 'guided-chain-1',
      skillIds: ['chain_rule'],
      answer: 'wrong',
      correct: false,
      mode: 'guided',
      hintCount: 0,
      seconds: 90,
      mixed: false,
      delayed: false,
    })

    const delayedMixed = recordAttempt(base, {
      problemId: 'review-chain-mixed',
      skillIds: ['chain_rule'],
      answer: 'wrong',
      correct: false,
      mode: 'review',
      hintCount: 0,
      seconds: 90,
      mixed: true,
      delayed: true,
    })

    const sameDayDrop = before - sameDay.mastery.chain_rule.masteryScore
    const delayedDrop = before - delayedMixed.mastery.chain_rule.masteryScore
    expect(delayedDrop).toBeGreaterThan(sameDayDrop)
  })

  it('tracks partial credit and reduces penalty magnitude', () => {
    const base = createInitialState('Calculus 1')
    const before = base.mastery.chain_rule.masteryScore

    const fullMiss = recordAttempt(base, {
      problemId: 'guided-chain-1',
      skillIds: ['chain_rule'],
      answer: 'wrong',
      correct: false,
      mode: 'guided',
      hintCount: 0,
      seconds: 90,
      mixed: false,
      delayed: false,
    })

    const partial = recordAttempt(base, {
      problemId: 'guided-chain-1',
      skillIds: ['chain_rule'],
      answer: 'partial',
      correct: false,
      mode: 'guided',
      hintCount: 0,
      seconds: 90,
      mixed: false,
      delayed: false,
      partialCredit: 0.6,
    })

    expect(partial.attempts[0].partialCredit).toBe(0.6)
    expect(before - partial.mastery.chain_rule.masteryScore).toBeLessThan(
      before - fullMiss.mastery.chain_rule.masteryScore,
    )
  })

  it('surfaces slow correct answers through lower fluency score', () => {
    const base = createInitialState('Calculus 1')
    const fast = recordAttempt(base, {
      problemId: 'guided-chain-1',
      skillIds: ['chain_rule'],
      answer: 'ok',
      correct: true,
      mode: 'guided',
      hintCount: 0,
      seconds: 60,
      mixed: false,
      delayed: false,
    })

    const slow = recordAttempt(base, {
      problemId: 'guided-chain-1',
      skillIds: ['chain_rule'],
      answer: 'ok',
      correct: true,
      mode: 'guided',
      hintCount: 0,
      seconds: 220,
      mixed: false,
      delayed: false,
    })

    expect(fast.mastery.chain_rule.fluencyScore).toBeGreaterThan(slow.mastery.chain_rule.fluencyScore)
    expect(fast.attempts[0].fluencyDelta).toBeGreaterThan(slow.attempts[0].fluencyDelta ?? -1)
  })
})
