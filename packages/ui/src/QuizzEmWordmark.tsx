import React from 'react'
import { clsx } from 'clsx'
import officialLogo from './assets/quizzem-official-logo.png'

/**
 * Sizes as inline CSS so host/display Tailwind pipelines never purge them —
 * `@qhe/ui` class strings live outside `${app}/src` and won't be scanned.
 */
const imgStyleFor = {
  sm: {
    maxHeight: 'clamp(10px, 2.1vmin, 16px)',
    maxWidth: 'min(34vmin, 96px)',
  },
  md: {
    maxHeight: 'clamp(11px, 2.65vmin, 19px)',
    maxWidth: 'min(38vmin, 132px)',
  },
  lg: {
    maxHeight: 'clamp(12px, 3vmin, 24px)',
    maxWidth: 'min(42vmin, 168px)',
  },
} as const

export type QuizzEmWordmarkProps = {
  size?: keyof typeof imgStyleFor
  className?: string
}

const imgFit: React.CSSProperties = {
  width: 'auto',
  height: 'auto',
  objectFit: 'contain',
  objectPosition: 'left center',
  display: 'block',
  backgroundColor: 'transparent',
  filter: 'drop-shadow(0 1px 8px rgba(0, 0, 0, 0.45))',
}

/** Official Quizz'Em marquee logo (RGBA artwork). */
export function QuizzEmWordmark({ size = 'md', className }: QuizzEmWordmarkProps) {
  return (
    <div className={clsx('flex shrink-0 bg-transparent leading-none', className)} role="img" aria-label={"Quizz'Em"}>
      <img
        src={officialLogo}
        alt={"Quizz'Em"}
        style={{ ...imgFit, ...imgStyleFor[size] }}
        decoding="async"
      />
    </div>
  )
}
