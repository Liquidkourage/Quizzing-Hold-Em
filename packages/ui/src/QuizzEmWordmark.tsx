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
  /** When set, ignores `size`; image scales to fill the parent box (contain, centered). */
  layout?: 'fixed' | 'fill'
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

const imgFillContain: React.CSSProperties = {
  width: '100%',
  height: '100%',
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain',
  objectPosition: 'center',
  display: 'block',
  backgroundColor: 'transparent',
  // Drop-shadow belongs on this <img> only — parent `filter:` + transparent PNGs often rasterize as a black slab in Chrome.
  filter:
    'drop-shadow(0 0 67px rgba(251, 191, 36, 0.22)) drop-shadow(0 3px 22px rgba(0, 0, 0, 0.42))',
}

/** Official Quizz'Em marquee logo (RGBA artwork). */
export function QuizzEmWordmark({ size = 'md', layout = 'fixed', className }: QuizzEmWordmarkProps) {
  const imgStyle = layout === 'fill' ? imgFillContain : { ...imgFit, ...imgStyleFor[size] }
  const rootClass =
    layout === 'fill'
      ? clsx(
          'isolate flex h-full min-h-0 w-full min-w-0 items-center justify-center bg-transparent leading-none',
          className,
        )
      : clsx('isolate flex shrink-0 bg-transparent leading-none', className)

  return (
    <div className={rootClass} role="img" aria-label={"Quizz'Em"}>
      <img src={officialLogo} alt={"Quizz'Em"} style={imgStyle} decoding="async" />
    </div>
  )
}
