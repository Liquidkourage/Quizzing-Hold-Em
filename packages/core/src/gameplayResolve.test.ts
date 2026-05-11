import { describe, expect, it } from 'vitest'
import {
  addPlayer,
  composeNumericAnswersFromSevenDigitCards,
  createEmptyGame,
  determineTriviaWinners,
  endRound,
  isSubmittedAnswerComposableFromDeal,
  nearlyEqualNumbers,
} from './index'
import type { GameState } from './index'

function totalWealth(gs: GameState): number {
  return gs.players.reduce((s, p) => s + p.bankroll, 0) + gs.round.pot
}

describe('composeNumericAnswersFromSevenDigitCards', () => {
  it('includes straight concatenation and one internal decimal (five digits used)', () => {
    const vals = composeNumericAnswersFromSevenDigitCards([1, 2, 3, 4, 5, 6, 7])
    expect(vals.has(12_345)).toBe(true)
    expect([...vals].some((v) => nearlyEqualNumbers(v, 12.345))).toBe(true)
  })
})

describe('isSubmittedAnswerComposableFromDeal', () => {
  it('accepts values buildable from holes + board', () => {
    let gs = createEmptyGame('V1', 'h1')
    gs = addPlayer(gs, 'p1', 'P')
    gs = {
      ...gs,
      phase: 'answering',
      players: [
        {
          ...gs.players[0]!,
          hand: [{ digit: 1 }, { digit: 2 }],
          hasFolded: false,
          isAllIn: false,
        },
      ],
      round: {
        ...gs.round,
        communityCards: [
          { digit: 3 },
          { digit: 4 },
          { digit: 5 },
          { digit: 6 },
          { digit: 7 },
        ],
      },
    }
    expect(isSubmittedAnswerComposableFromDeal(gs, 'p1', 12_345)).toBe(true)
    expect(isSubmittedAnswerComposableFromDeal(gs, 'p1', 9_999_999)).toBe(false)
  })
})

describe('determineTriviaWinners', () => {
  it('returns every seat tied on the best distance', () => {
    let gs = createEmptyGame('V', 'h')
    gs = addPlayer(gs, 'a', 'A')
    gs = addPlayer(gs, 'b', 'B')
    gs = {
      ...gs,
      phase: 'showdown',
      round: {
        ...gs.round,
        question: { id: 'q', text: '?', answer: 42 },
      },
      players: [
        { ...gs.players[0]!, submittedAnswer: 40, hasFolded: false, isAllIn: false },
        { ...gs.players[1]!, submittedAnswer: 44, hasFolded: false, isAllIn: false },
      ],
    }
    const tw = determineTriviaWinners(gs)
    expect(tw?.distance).toBe(2)
    expect(tw?.winnerIds.sort()).toEqual(['a', 'b'])
  })
})

describe('endRound', () => {
  it('does not mutate state when not in showdown', () => {
    const gs = createEmptyGame('V', 'h')
    const out = endRound({ ...gs, phase: 'answering' })
    expect(out.phase).toBe('answering')
  })

  it('splits the pot across tied trivia winners with whole-dollar conservation', () => {
    let gs = createEmptyGame('V', 'h')
    gs = addPlayer(gs, 'a', 'A')
    gs = addPlayer(gs, 'b', 'B')
    const br0 = gs.players[0]!.bankroll
    const br1 = gs.players[1]!.bankroll
    gs = {
      ...gs,
      phase: 'showdown',
      round: {
        ...gs.round,
        pot: 101,
        question: { id: 'q', text: '?', answer: 100 },
      },
      players: [
        { ...gs.players[0]!, submittedAnswer: 100, hasFolded: false, isAllIn: false },
        { ...gs.players[1]!, submittedAnswer: 100, hasFolded: false, isAllIn: false },
      ],
    }
    const before = totalWealth(gs)
    gs = endRound(gs)
    expect(gs.phase).toBe('lobby')
    expect(gs.round.pot).toBe(0)
    expect(totalWealth(gs)).toBe(before)
    const aBr = gs.players.find((p) => p.id === 'a')!.bankroll
    const bBr = gs.players.find((p) => p.id === 'b')!.bankroll
    expect(aBr + bBr).toBe(br0 + br1 + 101)
    expect(Math.abs(aBr - bBr)).toBeLessThanOrEqual(1)
  })

  it('awards pot to the lone non-folder when no trivia submissions count', () => {
    let gs = createEmptyGame('V', 'h')
    gs = addPlayer(gs, 'a', 'A')
    gs = addPlayer(gs, 'b', 'B')
    const brSurvivor = gs.players[0]!.bankroll
    gs = {
      ...gs,
      phase: 'showdown',
      round: {
        ...gs.round,
        pot: 77,
        question: { id: 'q', text: '?', answer: 10 },
      },
      players: [
        { ...gs.players[0]!, hasFolded: false, isAllIn: false },
        { ...gs.players[1]!, hasFolded: true, isAllIn: false },
      ],
    }
    const before = totalWealth(gs)
    gs = endRound(gs)
    expect(totalWealth(gs)).toBe(before)
    expect(gs.players.find((p) => p.id === 'a')!.bankroll).toBe(brSurvivor + 77)
  })
})
