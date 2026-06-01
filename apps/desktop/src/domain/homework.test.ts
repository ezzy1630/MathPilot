import { describe, expect, it } from 'vitest'
import { analyzeHomeworkUpload } from './homework'
import { createInitialState } from './learningEngine'

describe('homework analysis', () => {
  it('deletes raw image by default', () => {
    const state = createInitialState('Calculus 1')
    const next = analyzeHomeworkUpload(state, {
      problemText: 'related rates ladder problem',
      imageDataUrl: 'data:image/png;base64,abc',
      saveRawImage: false,
    })
    expect(next.homeworkAnalyses[0].rawImageSaved).toBe(false)
    expect(next.homeworkAnalyses[0].extractedWorkSummary).toContain('discarded')
  })

  it('retains raw image when user opts in', () => {
    const state = createInitialState('Calculus 1')
    const next = analyzeHomeworkUpload(state, {
      imageDataUrl: 'data:image/png;base64,abc',
      saveRawImage: true,
    })
    expect(next.homeworkAnalyses[0].rawImageSaved).toBe(true)
  })
})
