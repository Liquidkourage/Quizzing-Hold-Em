import type { CSSProperties } from 'react'

/** Shared poker-table felt used on showdown UI (matches venue mosaic greens). */
export const SHOWDOWN_FELT_STYLE: CSSProperties = {
  backgroundImage: `
    repeating-linear-gradient(
      45deg,
      #245c36 0px,
      #245c36 2px,
      #1b4528 2px,
      #1b4528 4px
    ),
    linear-gradient(135deg, #2d7a4a 0%, #1a4d2e 48%, #163d26 100%)
  `,
}

export const SHOWDOWN_RAIL_STYLE: CSSProperties = {
  background: 'linear-gradient(180deg, #5c3d1e 0%, #3d2810 35%, #2a1a0a 100%)',
  boxShadow:
    'inset 0 2px 0 rgba(255,220,160,0.12), inset 0 -4px 12px rgba(0,0,0,0.45), 0 12px 40px rgba(0,0,0,0.55)',
}
