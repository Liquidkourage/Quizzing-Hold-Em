import React from 'react'
import { clsx } from 'clsx'
import officialLogo from './assets/quizzem-official-logo.png'

/** Max box for `object-contain`; wide lockup needs both caps (height alone lets width dominate). */
const box = {
  sm: 'max-h-8 max-w-[min(34vw,7.75rem)] sm:max-h-9 sm:max-w-[min(38vw,8.75rem)]',
  md: 'max-h-9 max-w-[min(40vw,9.25rem)] sm:max-h-10 sm:max-w-[min(44vw,10.5rem)]',
  lg: 'max-h-10 max-w-[min(42vw,11rem)] sm:max-h-11 sm:max-w-[min(44vw,12.25rem)] md:max-h-12 md:max-w-[13rem]',
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
          'drop-shadow-[0_2px_14px_rgba(0,0,0,0.55)]',
          box[size],
        )}
        decoding="async"
      />
    </div>
  )
}
