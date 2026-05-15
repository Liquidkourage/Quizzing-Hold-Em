import { displayBlindSeatIndices } from '@qhe/core'
import type { ReactNode } from 'react'

/**
 * Chips at the rim (mosaic + hero) — dealer “button”, small blind, big blind.
 * Match {@link VenueEightTablesPreview} `blindTagsForSeat` styling.
 */
export function heroSeatBlindMarkerPills(
  seatIndex: number,
  blindSeats: ReturnType<typeof displayBlindSeatIndices>
): ReactNode[] {
  const out: ReactNode[] = []
  if (blindSeats.dealerSeatIndex === seatIndex) {
    out.push(
      <span
        key="btn"
        title="Dealer button"
        className="inline-flex min-w-[1.6rem] items-center justify-center rounded px-1 py-0.5 text-[9px] font-black leading-none tracking-tight border border-amber-700/40 bg-amber-400 text-black shadow-sm sm:text-[10px]"
      >
        BTN
      </span>
    )
  }
  if (blindSeats.smallBlindSeatIndex === seatIndex) {
    out.push(
      <span
        key="sb"
        title="Small blind"
        className="inline-flex min-w-[1.6rem] items-center justify-center rounded px-1 py-0.5 text-[9px] font-black leading-none tracking-tight border border-sky-900/35 bg-sky-500 text-white shadow-sm sm:text-[10px]"
      >
        SB
      </span>
    )
  }
  if (blindSeats.bigBlindSeatIndex === seatIndex) {
    out.push(
      <span
        key="bb"
        title="Big blind"
        className="inline-flex min-w-[1.6rem] items-center justify-center rounded px-1 py-0.5 text-[9px] font-black leading-none tracking-tight border border-rose-900/40 bg-rose-600 text-white shadow-sm sm:text-[10px]"
      >
        BB
      </span>
    )
  }
  return out
}
