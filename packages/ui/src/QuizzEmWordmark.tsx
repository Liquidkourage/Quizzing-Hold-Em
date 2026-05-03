import React from 'react'
import { clsx } from 'clsx'

const markDims = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
} as const

const textClamp = {
  sm: 'text-lg sm:text-xl',
  md: 'text-xl sm:text-2xl',
  lg: 'text-2xl sm:text-4xl',
} as const

export type QuizzEmWordmarkProps = {
  size?: keyof typeof markDims
  className?: string
}

/** Brand logo + wordmark for Quizz'Em — trivia-meets-table felt. SVG mark works at any Tailwind backdrop. */
export function QuizzEmWordmark({ size = 'md', className }: QuizzEmWordmarkProps) {
  return (
    <div
      className={clsx('flex shrink-0 items-center gap-2.5 sm:gap-3.5', className)}
      role="img"
      aria-label={"Quizz'Em"}
    >
      <svg
        className={clsx(markDims[size], 'shrink-0 drop-shadow-[0_0_14px_rgba(250,204,21,0.35)]')}
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <defs>
          <linearGradient id="qem-ring-grad" x1="22" y1="2" x2="22" y2="42" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fde68a" />
            <stop offset="0.5" stopColor="#f59e0b" />
            <stop offset="1" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="qem-felt" x1="8" y1="34" x2="36" y2="14" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0f766e" />
            <stop offset="1" stopColor="#22c55e" />
          </linearGradient>
        </defs>
        <circle cx="22" cy="22" r="18" stroke="url(#qem-ring-grad)" strokeWidth="2.25" opacity="0.95" />
        <path d="M22 22c9.941 0 18-9.851 18-15.87A18 18 0 0136.13 39.74L22 22z" fill="url(#qem-felt)" opacity="0.55" />
        <circle cx="22" cy="22" r="7.75" stroke="rgba(253,224,71,0.5)" strokeWidth="1.25" strokeDasharray="3 4" />
        <path
          d="M22 29.5v.9M22 12.8c4.62 1.72 7.62 10.92-8.15 17.92"
          stroke="#fef9c3"
          strokeWidth="2.05"
          strokeLinecap="round"
          opacity="0.92"
          fill="none"
        />
        <ellipse cx="22" cy="10.85" rx="2.85" ry="2.95" fill="#fef08a" />
      </svg>
      <div className={clsx('leading-none tracking-tight', textClamp[size])}>
        <span className="bg-gradient-to-br from-amber-100 via-yellow-300 to-amber-600 bg-clip-text font-black text-transparent">
          Quizz
        </span>
        <span className="bg-gradient-to-b from-amber-100 to-white/85 bg-clip-text font-black text-transparent">
          &apos;
        </span>
        <span className="bg-gradient-to-br from-emerald-200 via-teal-300 to-emerald-600 bg-clip-text font-black text-transparent">
          Em
        </span>
      </div>
    </div>
  )
}
