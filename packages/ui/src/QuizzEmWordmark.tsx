import React from 'react'
import { clsx } from 'clsx'
import officialLogo from './assets/quizzem-official-logo.png'

const heights = {
  sm: 'h-9 w-auto max-h-9 sm:h-10 sm:max-h-10',
  md: 'h-11 w-auto max-h-11 sm:h-14 sm:max-h-14',
  lg: 'h-[4.75rem] w-auto max-h-[4.75rem] sm:h-28 sm:max-h-28',
} as const

export type QuizzEmWordmarkProps = {
  size?: keyof typeof heights
  className?: string
}

/** Official Quizz'Em marquee logo (brand asset). */
export function QuizzEmWordmark({ size = 'md', className }: QuizzEmWordmarkProps) {
  return (
    <div className={clsx('flex shrink-0 items-center', className)} role="img" aria-label={"Quizz'Em"}>
      <img
        src={officialLogo}
        alt={"Quizz'Em"}
        className={clsx('object-contain object-left drop-shadow-[0_0_20px_rgba(56,189,248,0.25)]', heights[size])}
        decoding="async"
      />
    </div>
  )
}
