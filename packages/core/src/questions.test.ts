import { describe, expect, it } from 'vitest'
import { createEmptyGame, pickRandomQuestion, setQuestion, SAMPLE_QUESTIONS } from './index'

describe('setQuestion', () => {
  it('installs the given question and clears community cards', () => {
    const gs = createEmptyGame('V1', 'h1')
    const q = SAMPLE_QUESTIONS[0]!
    const next = setQuestion(
      {
        ...gs,
        phase: 'betting',
        round: { ...gs.round, communityCards: [{ digit: 2 }], question: null },
      },
      q
    )
    expect(next.phase).toBe('question')
    expect(next.round.question).toEqual(q)
    expect(next.round.communityCards).toEqual([])
  })
})

describe('pickRandomQuestion', () => {
  it('returns undefined for an empty bank', () => {
    expect(pickRandomQuestion([])).toBeUndefined()
  })
})
