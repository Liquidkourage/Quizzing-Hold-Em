import { describe, expect, it } from 'vitest'
import {
  addPlayer,
  buildSidePotSettlement,
  createEmptyGame,
  endRound,
  payoutHandWithSidePots,
} from './index'
import type { GameState } from './index'

function totalWealth(gs: GameState): number {
  return gs.players.reduce((s, p) => s + p.bankroll, 0) + gs.round.pot
}

describe('buildSidePotSettlement', () => {
  it('splits $100 / $500 / $250 into main, side, and uncalled return', () => {
    const { pots, returns } = buildSidePotSettlement(
      { a: 100, b: 500, c: 250 },
      { a: false, b: false, c: false }
    )
    expect(pots).toEqual([
      { amount: 300, eligiblePlayerIds: ['a', 'b', 'c'] },
      { amount: 300, eligiblePlayerIds: ['b', 'c'] },
    ])
    expect(returns).toEqual({ b: 250 })
    expect(pots.reduce((s, p) => s + p.amount, 0) + Object.values(returns).reduce((s, v) => s + v, 0)).toBe(850)
  })

  it('keeps folded chips in pots others can win', () => {
    const { pots, returns } = buildSidePotSettlement(
      { a: 100, b: 500, c: 250 },
      { a: false, b: false, c: true }
    )
    expect(pots[0]?.eligiblePlayerIds.sort()).toEqual(['a', 'b'])
    expect(pots[1]?.eligiblePlayerIds).toEqual(['b'])
    expect(returns.b).toBe(250)
  })
})

describe('payoutHandWithSidePots', () => {
  it('caps a short stack winner at the main pot when a neighbor overbet', () => {
    let gs = createEmptyGame('V', 'h')
    gs = addPlayer(gs, 'short', 'Short', 800)
    gs = addPlayer(gs, 'big', 'Big', 400)
    gs = addPlayer(gs, 'mid', 'Mid', 650)

    gs = {
      ...gs,
      phase: 'showdown',
      round: {
        ...gs.round,
        pot: 850,
        handContributions: { short: 100, big: 500, mid: 250 },
        question: { id: 'q', text: '?', answer: 42 },
      },
      players: [
        { ...gs.players[0]!, id: 'short', submittedAnswer: 42, hasFolded: false },
        { ...gs.players[1]!, id: 'big', submittedAnswer: 99, hasFolded: false },
        { ...gs.players[2]!, id: 'mid', submittedAnswer: 50, hasFolded: false },
      ],
    }

    const before = totalWealth(gs)
    const paid = payoutHandWithSidePots(gs)
    expect(totalWealth(paid)).toBe(before)
    expect(paid.round.pot).toBe(0)
    expect(paid.players.find((p) => p.id === 'short')!.bankroll).toBe(1100) // 800 + main 300
    expect(paid.players.find((p) => p.id === 'big')!.bankroll).toBe(650) // 400 + 250 uncalled return
    expect(paid.players.find((p) => p.id === 'mid')!.bankroll).toBe(950) // 650 + side 300
  })

  it('awards each side pot to the closest eligible trivia answer', () => {
    let gs = createEmptyGame('V', 'h')
    gs = addPlayer(gs, 'a', 'A', 400)
    gs = addPlayer(gs, 'b', 'B', 0)
    gs = addPlayer(gs, 'c', 'C', 250)

    gs = {
      ...gs,
      phase: 'showdown',
      round: {
        ...gs.round,
        pot: 850,
        handContributions: { a: 100, b: 500, c: 250 },
        question: { id: 'q', text: '?', answer: 10 },
      },
      players: [
        { ...gs.players[0]!, id: 'a', submittedAnswer: 10, hasFolded: false },
        { ...gs.players[1]!, id: 'b', submittedAnswer: 12, hasFolded: false },
        { ...gs.players[2]!, id: 'c', submittedAnswer: 99, hasFolded: false },
      ],
    }

    const paid = payoutHandWithSidePots(gs)
    expect(paid.players.find((p) => p.id === 'a')!.bankroll).toBe(700) // 400 + 300 main
    expect(paid.players.find((p) => p.id === 'b')!.bankroll).toBe(550) // 0 + 250 return + 300 side
    expect(paid.players.find((p) => p.id === 'c')!.bankroll).toBe(250)
  })
})

describe('endRound with side pots', () => {
  it('conserves chips when handContributions are tracked', () => {
    let gs = createEmptyGame('V', 'h')
    gs = addPlayer(gs, 'a', 'A', 300)
    gs = addPlayer(gs, 'b', 'B', 300)
    gs = {
      ...gs,
      phase: 'showdown',
      round: {
        ...gs.round,
        pot: 200,
        handContributions: { a: 100, b: 100 },
        question: { id: 'q', text: '?', answer: 5 },
      },
      players: [
        { ...gs.players[0]!, submittedAnswer: 5, hasFolded: false },
        { ...gs.players[1]!, submittedAnswer: 50, hasFolded: false },
      ],
    }
    const before = totalWealth(gs)
    gs = endRound(gs)
    expect(totalWealth(gs)).toBe(before)
    expect(gs.players.find((p) => p.id === 'a')!.bankroll).toBe(500)
    expect(gs.players.find((p) => p.id === 'b')!.bankroll).toBe(300)
  })
})
