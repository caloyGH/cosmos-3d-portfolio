import { PLANETS } from '../../data/planets'

// Nebula colours per section: [tintA (glow body), tintB (hot centre)]. They come from data/planets.js, so the whole sky
// takes on the colour of each world (Earth blue -> Mars rust -> Jupiter amber -> Saturn gold -> Neptune blue).
const PALETTE = PLANETS.map((p) => p.tint)

/** Smoothly interpolated tint for a float section position. */
export function tintAt(pos, out = [[0, 0, 0], [0, 0, 0]]) {
  const i = Math.min(Math.floor(Math.max(pos, 0)), PALETTE.length - 2)
  const f = Math.min(Math.max(pos - i, 0), 1)
  const s = f * f * (3 - 2 * f)
  for (let k = 0; k < 2; k++) {
    for (let c = 0; c < 3; c++) {
      out[k][c] = PALETTE[i][k][c] + (PALETTE[i + 1][k][c] - PALETTE[i][k][c]) * s
    }
  }
  return out
}
