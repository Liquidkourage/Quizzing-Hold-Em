import { describe, expect, it } from 'vitest'
import {
  displayBettingPhaseLabel,
  isVenueTileWageringPaused,
  venueTileActingSeatIndex,
} from './index'

describe('venue tile wagering display', () => {
  it('shows paused after post-board street when clock is closed', () => {
    const row = {
      phase: 'betting',
      seated: 4,
      isBettingOpen: false,
      currentPlayerIndex: -1,
      bettingRound: 2,
      communityDigits: [1, 2, 3, 4, 5],
    }
    expect(isVenueTileWageringPaused(row)).toBe(true)
    expect(displayBettingPhaseLabel(row)).toBe('All bets are in!')
    expect(venueTileActingSeatIndex(row)).toBeNull()
  })

  it('treats round-2 complete board as paused when isBettingOpen is unknown', () => {
    const row = {
      phase: 'betting',
      seated: 4,
      isBettingOpen: null,
      currentPlayerIndex: 2,
      bettingRound: 2,
      communityDigits: [0, 1, 2, 3, 4],
    }
    expect(isVenueTileWageringPaused(row)).toBe(true)
    expect(venueTileActingSeatIndex(row)).toBeNull()
  })

  it('shows open wagering only when clock is explicitly true', () => {
    const row = {
      phase: 'betting',
      seated: 3,
      isBettingOpen: true,
      currentPlayerIndex: 1,
      bettingRound: 2,
      communityDigits: [5, 6, 7, 8, 9],
    }
    expect(isVenueTileWageringPaused(row)).toBe(false)
    expect(displayBettingPhaseLabel(row)).toBe('Wagering')
    expect(venueTileActingSeatIndex(row)).toBe(1)
  })
})
