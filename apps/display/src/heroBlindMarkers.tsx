import { displayBlindSeatIndices } from '@qhe/core'
import type { ReactNode } from 'react'

/** Raised white dealer puck (~TV-poker readability on green felt). */
function FeltDealerPuck() {
  return (
    <div
      title="Dealer button"
      aria-label="Dealer button"
      className="
        relative flex h-[3.75rem] w-[3.75rem] shrink-0 items-center justify-center
        rounded-full border-[3px] border-neutral-900/92
        bg-gradient-to-br from-white via-neutral-50 to-neutral-300
        shadow-[inset_0_3px_10px_rgba(255,255,255,.95),inset_0_-8px_16px_rgba(0,0,0,.1),0_8px_18px_rgba(0,0,0,.55),0_2px_0_rgba(255,255,255,.65)]
        md:h-[4.25rem] md:w-[4.25rem]"
    >
      <div
        className="pointer-events-none absolute inset-[5px] rounded-full border border-white/85 bg-gradient-to-br from-transparent via-transparent to-neutral-900/10 shadow-[inset_0_-2px_4px_rgba(0,0,0,.12)] md:inset-[6px]"
        aria-hidden
      />
      <span
        className="
          relative z-[1] select-none font-extrabold leading-none tracking-tight text-neutral-900
          [text-shadow:0_1px_0_rgba(255,255,255,.9),0_-1px_1px_rgba(0,0,0,.22)]
          text-[13px] sm:text-sm md:text-[0.95rem]"
      >
        BTN
      </span>
    </div>
  )
}

function FeltBlindLammer({
  variant,
  label,
  titleShort,
}: {
  variant: 'sb' | 'bb'
  label: string
  titleShort: string
}) {
  const chrome =
    variant === 'sb'
      ? `
        bg-gradient-to-b from-sky-200 via-sky-400 to-sky-800
        border-sky-950/85
        shadow-[inset_0_2px_6px_rgba(255,255,255,.45),inset_0_-5px_10px_rgba(0,0,0,.25),0_6px_14px_rgba(0,0,0,.5)]
      `
      : `
        bg-gradient-to-b from-rose-200 via-rose-500 to-rose-900
        border-rose-950/90
        shadow-[inset_0_2px_6px_rgba(255,255,255,.4),inset_0_-5px_10px_rgba(0,0,0,.3),0_6px_14px_rgba(0,0,0,.52)]
      `
  return (
    <div
      title={`${titleShort} blind`}
      aria-label={`${titleShort} blind`}
      className={`
        relative flex h-[3.15rem] w-[3.15rem] shrink-0 items-center justify-center
        rounded-full border-[3px] md:h-[3.6rem] md:w-[3.6rem]
        ${chrome.trim()}
      `}
    >
      <div
        className="pointer-events-none absolute inset-[4px] rounded-full border border-white/35 shadow-[inset_0_-3px_6px_rgba(0,0,0,.35)] md:inset-[5px]"
        aria-hidden
      />
      <span
        className="
          relative z-[1] select-none font-extrabold leading-none tracking-[0.06em] text-white
          [text-shadow:0_1px_0_rgba(255,255,255,.32),0_-2px_4px_rgba(0,0,0,.42)]
          text-[12px] sm:text-[13px] md:text-sm"
      >
        {label}
      </span>
    </div>
  )
}

/**
 * Dealer button + blind markers — `{@link onFelt}` uses puck / lammer discs; `{@link inline}` stays compact.
 */
export function heroSeatBlindMarkerPills(
  seatIndex: number,
  blindSeats: ReturnType<typeof displayBlindSeatIndices>,
  presentation: 'onFelt' | 'inline' = 'inline'
): ReactNode[] {
  const out: ReactNode[] = []

  if (presentation === 'onFelt') {
    if (blindSeats.dealerSeatIndex === seatIndex) {
      out.push(<FeltDealerPuck key="btn" />)
    }
    if (blindSeats.smallBlindSeatIndex === seatIndex) {
      out.push(<FeltBlindLammer key="sb" variant="sb" label="SB" titleShort="Small" />)
    }
    if (blindSeats.bigBlindSeatIndex === seatIndex) {
      out.push(<FeltBlindLammer key="bb" variant="bb" label="BB" titleShort="Big" />)
    }
    return out
  }

  const badgeCompact =
    'inline-flex min-w-[1.6rem] items-center justify-center rounded px-1 py-0.5 text-[9px] font-black uppercase leading-none tracking-tight shadow-sm sm:text-[10px]'

  if (blindSeats.dealerSeatIndex === seatIndex) {
    out.push(
      <span key="btn" title="Dealer button" className={`${badgeCompact} border border-amber-700/45 bg-amber-400 text-black`}>
        BTN
      </span>
    )
  }
  if (blindSeats.smallBlindSeatIndex === seatIndex) {
    out.push(
      <span key="sb" title="Small blind" className={`${badgeCompact} border border-sky-900/40 bg-sky-500 text-white`}>
        SB
      </span>
    )
  }
  if (blindSeats.bigBlindSeatIndex === seatIndex) {
    out.push(
      <span key="bb" title="Big blind" className={`${badgeCompact} border border-rose-900/45 bg-rose-600 text-white`}>
        BB
      </span>
    )
  }
  return out
}
