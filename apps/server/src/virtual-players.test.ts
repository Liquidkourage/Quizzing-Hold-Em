import { describe, expect, it } from 'vitest'
import { createEmptyGame, dealCommunityCards, dealInitialCards } from '@qhe/core'
import { addVirtualPlayers, advanceVirtualBettingStep, runVirtualPlayerSimulation } from './virtual-players'

describe('CPU post-board wagering', () => {
  it('closes round 2 after paced steps (check-around or open-raise)', () => {
    let gs = createEmptyGame('V', '', '1')
    gs = { ...gs, bigBlind: 20, smallBlind: 10, maxPlayers: 8 }
    gs = addVirtualPlayers(gs, 4)
    gs = dealInitialCards(gs)
    gs = runVirtualPlayerSimulation(gs)
    expect(gs.round.isBettingOpen).toBe(false)
    expect(gs.round.bettingRound).toBe(1)

    gs = dealCommunityCards(gs)
    expect(gs.round.bettingRound).toBe(2)
    expect(gs.round.isBettingOpen).toBe(true)
    expect(gs.round.currentBet).toBe(0)

    let steps = 0
    while (gs.round.isBettingOpen && steps < 48) {
      const next = advanceVirtualBettingStep(gs)
      expect(next).not.toBe(gs)
      gs = next
      steps++
    }
    expect(gs.round.isBettingOpen).toBe(false)
    expect(steps).toBeGreaterThan(0)
    expect(steps).toBeLessThan(48)
  })
})
