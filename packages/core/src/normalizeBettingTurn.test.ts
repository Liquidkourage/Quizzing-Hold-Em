import { describe, expect, it } from 'vitest'
import { createEmptyGame, dealCommunityCards, dealInitialCards, normalizeBettingTurn } from './index'

describe('normalizeBettingTurn', () => {
  it('closes wagering when the action seat has folded', () => {
    let gs = createEmptyGame('T', '', '1')
    gs = {
      ...gs,
      phase: 'betting',
      players: [
        { id: 'a', name: 'A', bankroll: 500, hand: [], hasFolded: true, isAllIn: false },
        { id: 'b', name: 'B', bankroll: 500, hand: [], hasFolded: false, isAllIn: false },
      ],
      round: {
        ...gs.round,
        isBettingOpen: true,
        currentPlayerIndex: 0,
        currentBet: 0,
        playerBets: { a: 0, b: 0 },
      },
    }
    const next = normalizeBettingTurn(gs)
    expect(next.round.isBettingOpen).toBe(false)
    expect(next.round.currentPlayerIndex).toBe(-1)
  })

  it('advances off an all-in seat when another player still owes action', () => {
    let gs = createEmptyGame('T', '', '1')
    gs = dealInitialCards({
      ...gs,
      players: [
        { id: 'a', name: 'A', bankroll: 0, hand: [{ digit: 1 }, { digit: 2 }], hasFolded: false, isAllIn: true },
        { id: 'b', name: 'B', bankroll: 500, hand: [{ digit: 3 }, { digit: 4 }], hasFolded: false, isAllIn: false },
        { id: 'c', name: 'C', bankroll: 500, hand: [{ digit: 5 }, { digit: 6 }], hasFolded: false, isAllIn: false },
      ],
    })
    gs = {
      ...gs,
      round: {
        ...gs.round,
        isBettingOpen: true,
        currentPlayerIndex: 0,
        currentBet: 20,
        playerBets: { a: 20, b: 0, c: 0 },
      },
    }
    const next = normalizeBettingTurn(gs)
    expect(next.round.currentPlayerIndex).not.toBe(0)
    expect([1, 2]).toContain(next.round.currentPlayerIndex)
  })

  it('does not close a fresh post-board street before anyone acts', () => {
    let gs = createEmptyGame('T', '', '1')
    gs = dealInitialCards({
      ...gs,
      players: [
        { id: 'vp:1', name: 'A', bankroll: 500, hand: [], hasFolded: false, isAllIn: false },
        { id: 'vp:2', name: 'B', bankroll: 500, hand: [], hasFolded: false, isAllIn: false },
        { id: 'vp:3', name: 'C', bankroll: 500, hand: [], hasFolded: false, isAllIn: false },
      ],
    })
    gs = {
      ...gs,
      round: {
        ...gs.round,
        isBettingOpen: false,
        currentPlayerIndex: -1,
        bettingRound: 1,
      },
    }
    gs = dealCommunityCards(gs)
    expect(gs.round.bettingRound).toBe(2)
    expect(gs.round.isBettingOpen).toBe(true)
    expect(gs.round.currentPlayerIndex).toBeGreaterThanOrEqual(0)

    const next = normalizeBettingTurn(gs)
    expect(next.round.isBettingOpen).toBe(true)
    expect(next.round.currentPlayerIndex).toBeGreaterThanOrEqual(0)
  })
})
