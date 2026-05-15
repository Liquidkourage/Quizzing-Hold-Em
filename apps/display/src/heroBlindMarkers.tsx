import { displayBlindSeatIndices } from '@qhe/core'
import type { ReactNode } from 'react'

/**
 * Dealer button + blind pills — rims on mini felts ({@link inline}) vs main hero felt ({@link onFelt}).
 */
export function heroSeatBlindMarkerPills(
  seatIndex: number,
  blindSeats: ReturnType<typeof displayBlindSeatIndices>,
  presentation: 'onFelt' | 'inline' = 'inline'
): ReactNode[] {
  const badgeBase =
    presentation === 'onFelt'
      ? 'rounded-md border-2 px-2 py-1 text-xs font-black uppercase leading-none tracking-tight shadow-md sm:px-2.5 sm:py-1 sm:text-sm md:text-base min-w-[2.25rem] sm:min-w-[2.75rem]'
      : 'inline-flex min-w-[1.6rem] items-center justify-center rounded px-1 py-0.5 text-[9px] font-black uppercase leading-none tracking-tight shadow-sm sm:text-[10px]'
  const out: ReactNode[] = []
  if (blindSeats.dealerSeatIndex === seatIndex) {
    out.push(
      <span key="btn" title="Dealer button" className={`${badgeBase} border-amber-700/40 bg-amber-400 text-black`}>
        BTN
      </span>
    )
  }
  if (blindSeats.smallBlindSeatIndex === seatIndex) {
    out.push(
      <span key="sb" title="Small blind" className={`${badgeBase} border-sky-900/35 bg-sky-500 text-white`}>
        SB
      </span>
    )
  }
  if (blindSeats.bigBlindSeatIndex === seatIndex) {
    out.push(
      <span key="bb" title="Big blind" className={`${badgeBase} border-rose-900/40 bg-rose-600 text-white`}>
        BB
      </span>
    )
  }
  return out
}
