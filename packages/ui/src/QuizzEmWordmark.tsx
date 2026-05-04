import React from 'react'
import { clsx } from 'clsx'
import officialLogo from './assets/quizzem-official-logo.png'

/**
 * Max box for `object-contain`. Venue TVs need the lockup visually subordinate to the room code.
 * (Sizes are deliberately small vs typical hero logos.)
 */
const box = {
  sm: 'max-h-[18px] max-w-[4.25rem]',
  md: 'max-h-[22px] max-w-[5.125rem]',
  lg: 'max-h-[26px] max-w-[min(28vw,5.75rem)] sm:max-h-7 sm:max-w-[6.125rem]',
} as const

export type QuizzEmWordmarkProps = {
  size?: keyof typeof box
  className?: string
}

/** Official Quizz'Em marquee logo (RGBA artwork). */
export function QuizzEmWordmark({ size = 'md', className }: QuizzEmWordmarkProps) {
  return (
    <div className={clsx('flex shrink-0 items-center bg-transparent', className)} role="img" aria-label={"Quizz'Em"}>
      <img
        src={officialLogo}
        alt={"Quizz'Em"}
        className={clsx(
          'h-auto w-auto bg-transparent object-contain object-left',
          'drop-shadow-[0_1px_10px_rgba(0,0,0,0.5)]',
          box[size],
        )}
        decoding="async"
      />
    </div>
  )
}
