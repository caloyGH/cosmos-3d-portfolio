// Mutable scroll state shared between the DOM and the canvas (no React re-renders).
// pos      -> float section position (0 = hero ... 4 = contact)  (written by useScrollSections)
// progress -> 0..1 of the whole page                              (written by useScrollSections)
// vel      -> smoothed scroll speed in sections/second (>= 0)
// svel     -> smoothed SIGNED scroll speed (down +, up -)
// dir      -> last scroll direction (+1 down, -1 up)
// travel   -> signed "distance flown": scrolling down flies forward, up flies back (+ slow idle drift)
// odo      -> total distance travelled (never decreases)
// io     -> where the guide orb is on screen (x, y in -1..1, speed, scale)   (written by canvas/GuideCore)
// fin      -> 0..1 progress of the very last scroll (after Contact): everything gets pulled into the black hole  (written by useScrollSections)
// ioTalk -> 1 while IO is "speaking" (the orb pulses)                        (written by dom/Hero, dom/IoBubble)
export const scrollState = { pos: 0, progress: 0, vel: 0, svel: 0, dir: 1, travel: 0, odo: 0, io: { x: 0, y: 0, speed: 0, s: 1 }, ioTalk: 0, fin: 0 }

let last = null
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt))

/** Call ONCE per frame (TravelFx does it, mounted first). */
export function tickScroll(dt) {
  dt = Math.min(Math.max(dt, 1e-3), 0.1)
  if (last === null) last = scrollState.pos
  const d = scrollState.pos - last
  last = scrollState.pos
  const sv = Math.max(-3, Math.min(3, d / dt))
  scrollState.svel = damp(scrollState.svel, sv, 5, dt)
  scrollState.vel = damp(scrollState.vel, Math.abs(sv), 5, dt)
  if (Math.abs(d) > 1e-4) scrollState.dir = d > 0 ? 1 : -1
  scrollState.travel += d * 20 + dt * 0.6
  scrollState.odo += Math.abs(d) * 10 + dt * 0.02
}
