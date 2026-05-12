import { describe, expect, it } from 'vitest'
import { displayActingSeatIndex } from './index'

describe('displayActingSeatIndex', () => {
  it('returns the seat index when isBettingOpen is undefined but a valid actor is set', () => {
    expect(
      displayActingSeatIndex('betting', 4, { currentPlayerIndex: 2, isBettingOpen: undefined })
    ).toBe(2)
  })

  it('returns null when isBettingOpen is explicitly false even with a seat index', () => {
    expect(
      displayActingSeatIndex('betting', 4, { currentPlayerIndex: 2, isBettingOpen: false })
    ).toBeNull()
  })

  it('accepts string numeric currentPlayerIndex at runtime', () => {
    expect(
      displayActingSeatIndex('betting', 3, { currentPlayerIndex: '1', isBettingOpen: true } as any)
    ).toBe(1)
  })

  it('normalizes phase casing', () => {
    expect(
      displayActingSeatIndex('BETTING ', 2, { currentPlayerIndex: 0, isBettingOpen: true })
    ).toBe(0)
  })

  it('rejects invalid index', () => {
    expect(
      displayActingSeatIndex('betting', 2, { currentPlayerIndex: -1, isBettingOpen: true })
    ).toBeNull()
    expect(
      displayActingSeatIndex('betting', 2, { currentPlayerIndex: 9, isBettingOpen: true })
    ).toBeNull()
  })
})
