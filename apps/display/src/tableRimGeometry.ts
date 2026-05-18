/**
 * Shared stadium / capsule rim math for hero felt and venue mosaic tables.
 * Matches CSS `border-radius: rx% / 50%` on wide rounded rectangles.
 */

export type CapsuleHit = { x: number; y: number; nx: number; ny: number; t: number }

function capsuleBoundaryHitsAlongRayPx(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  dx: number,
  dy: number
): CapsuleHit[] {
  const len = Math.hypot(dx, dy)
  if (len < 1e-9) return []
  dx /= len
  dy /= len

  const hits: CapsuleHit[] = []
  const consider = (t: number, nx: number, ny: number) => {
    if (!(t > 1e-6)) return
    const nLen = Math.hypot(nx, ny) || 1
    hits.push({
      x: cx + t * dx,
      y: cy + t * dy,
      nx: nx / nLen,
      ny: ny / nLen,
      t,
    })
  }

  const r = halfH
  const flat = halfW - r
  if (flat <= 0) {
    consider(r, dx, dy)
    return hits
  }

  if (dy < -1e-9) {
    const t = (-halfH) / dy
    const x = cx + t * dx
    if (x >= cx - flat - 0.5 && x <= cx + flat + 0.5) consider(t, 0, -1)
  }
  if (dy > 1e-9) {
    const t = halfH / dy
    const x = cx + t * dx
    if (x >= cx - flat - 0.5 && x <= cx + flat + 0.5) consider(t, 0, 1)
  }

  for (const sign of [-1, 1] as const) {
    const acx = cx + sign * flat
    const aox = cx - acx
    const B = 2 * aox * dx
    const C = aox * aox - r * r
    const disc = B * B - 4 * C
    if (disc < 0) continue
    const sqrtD = Math.sqrt(disc)
    for (const t of [(-B - sqrtD) / 2, (-B + sqrtD) / 2]) {
      const x = cx + t * dx
      const y = cy + t * dy
      consider(t, (x - acx) / r, (y - cy) / r)
    }
  }

  return hits
}

/** Nearest boundary hit along the ray from `(cx, cy)` — for rays starting outside the shape. */
export function capsuleBoundaryHitPx(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  dx: number,
  dy: number
): CapsuleHit | null {
  const hits = capsuleBoundaryHitsAlongRayPx(cx, cy, halfW, halfH, dx, dy)
  if (hits.length === 0) return null
  return hits.reduce((a, b) => (a.t < b.t ? a : b))
}

/**
 * Farthest boundary hit along the ray from `(cx, cy)` — for origins **inside** the stadium
 * (venue mosaic: table center). Using the nearest hit pulls side seats into the felt center.
 */
export function capsuleOuterBoundaryHitPx(
  cx: number,
  cy: number,
  halfW: number,
  halfH: number,
  dx: number,
  dy: number
): CapsuleHit | null {
  const hits = capsuleBoundaryHitsAlongRayPx(cx, cy, halfW, halfH, dx, dy)
  if (hits.length === 0) return null
  return hits.reduce((a, b) => (a.t > b.t ? a : b))
}

/** Capsule border-radius so wide boxes get flat top/bottom (not a tall ellipse). */
export function capsuleBorderRadiusCss(widthPx: number, heightPx: number): string {
  if (!(widthPx > 0 && heightPx > 0)) return '50%'
  const aspect = widthPx / heightPx
  if (aspect <= 1.02) return '50%'
  const rxPct = Math.min(50, 50 / aspect)
  return `${rxPct.toFixed(2)}% / 50%`
}

/**
 * Cupholder / seat-dot center on the rail midline (px, origin top-left of rail box).
 * @param seatIndex 0 = clock top, advances CCW
 * @param seatCount usually 8
 * @param railW rail element width px
 * @param railH rail element height px
 * @param dotRadiusPx half of dot diameter
 * @param radialScale 1 = on rail midline, >1 outward along normal
 */
export function seatDotCenterOnRailPx(
  seatIndex: number,
  seatCount: number,
  railW: number,
  railH: number,
  dotRadiusPx: number,
  radialScale = 1
): { x: number; y: number } {
  const cx = railW / 2
  const cy = railH / 2
  const halfW = railW / 2
  const halfH = railH / 2
  const θ = (seatIndex / seatCount) * 2 * Math.PI - Math.PI / 2
  const hit = capsuleBoundaryHitPx(cx, cy, halfW, halfH, Math.cos(θ), Math.sin(θ))
  if (!hit) return { x: cx, y: cy }
  /** Place dot center so its outer edge meets the rail outline (inward along the normal). */
  const scale = radialScale
  return {
    x: cx + (hit.x - cx) * scale - hit.nx * dotRadiusPx,
    y: cy + (hit.y - cy) * scale - hit.ny * dotRadiusPx,
  }
}

export function seatDotCenterOnRailPct(
  seatIndex: number,
  seatCount: number,
  railW: number,
  railH: number,
  dotRadiusPx: number,
  radialScale = 1
): { leftPct: number; topPct: number } {
  const { x, y } = seatDotCenterOnRailPx(
    seatIndex,
    seatCount,
    railW,
    railH,
    dotRadiusPx,
    radialScale
  )
  return {
    leftPct: railW > 0 ? (x / railW) * 100 : 50,
    topPct: railH > 0 ? (y / railH) * 100 : 50,
  }
}
