/**
 * Trims transparent / near-transparent margins from the official marquee PNG.
 * Preserves RGBA. Run after replacing the artwork: node scripts/trim-quizzem-logo.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const input = path.resolve(__dirname, '../packages/ui/src/assets/quizzem-official-logo.png')
/** Ignore fringe pixels softer than this (0–255). */
const ALPHA_CUTOFF = 12

/** @param {Buffer} data @param {number} width @param {number} height @param {number} channels */
function alphaBBox(data, width, height, channels) {
  const aCh = channels - 1
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels + aCh
      if (data[i] > ALPHA_CUTOFF) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX === -1) throw new Error('No visible pixels (image empty or entirely transparent).')
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

function gcd(a, b) {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y) [x, y] = [y, x % y]
  return x || 1
}

const metaIn = await sharp(input).metadata()
const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

const bbox = alphaBBox(data, info.width, info.height, info.channels)

const trimmed = await sharp(input).extract(bbox).ensureAlpha().png({ compressionLevel: 9 }).toBuffer()

await fs.promises.writeFile(input, trimmed)

const metaOut = await sharp(trimmed).metadata()
const w = metaOut.width ?? bbox.width
const h = metaOut.height ?? bbox.height
const g = gcd(w, h)
console.log(
  JSON.stringify({
    prev: `${metaIn.width}x${metaIn.height}`,
    bbox,
    cropped: `${w}x${h}`,
    aspectRatio: `${w}/${h}`,
    aspectSimplified: `${w / g}/${h / g}`,
    tailwindAspect: `[${w}/${h}]`,
  }, null, 2),
)
