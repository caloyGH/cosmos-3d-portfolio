// Layout of the black-cat guide, in cat-local units (y up, +z = the way the cat faces, ~2.25 tall when sitting).
// Pure data so it can be tested without three.js.
//   t: 'sphere' (unit sphere, scaled) | 'cone'      p: position      s: scale (cone: [radius, height, radius])
//   r: rotation in radians [x, y, z]

export const BODY = [
  { n: 'haunch', t: 'sphere', p: [0, 0.5, -0.05], s: [0.62, 0.5, 0.7] },
  { n: 'thighL', t: 'sphere', p: [-0.36, 0.42, 0.0], s: [0.3, 0.4, 0.5] },
  { n: 'thighR', t: 'sphere', p: [0.36, 0.42, 0.0], s: [0.3, 0.4, 0.5] },
  { n: 'chest', t: 'sphere', p: [0, 1.05, 0.12], s: [0.44, 0.74, 0.4], r: [0.16, 0, 0] },
  { n: 'legL', t: 'sphere', p: [-0.16, 0.44, 0.44], s: [0.1, 0.46, 0.1] },
  { n: 'legR', t: 'sphere', p: [0.16, 0.44, 0.44], s: [0.1, 0.46, 0.1] },
  { n: 'pawL', t: 'sphere', p: [-0.16, 0.07, 0.53], s: [0.13, 0.07, 0.17] },
  { n: 'pawR', t: 'sphere', p: [0.16, 0.07, 0.53], s: [0.13, 0.07, 0.17] },
]

// everything inside the head group (which sits at HEAD_POS and turns to look at the cursor)
export const HEAD_POS = [0, 1.76, 0.3]
export const HEAD = [
  { n: 'skull', t: 'sphere', p: [0, 0, 0], s: [0.46, 0.38, 0.4] },
  { n: 'muzzle', t: 'sphere', p: [0, -0.1, 0.3], s: [0.2, 0.14, 0.16] },
  { n: 'earL', t: 'cone', p: [-0.26, 0.34, -0.02], s: [0.18, 0.4, 0.18], r: [0, 0, 0.28] },
  { n: 'earR', t: 'cone', p: [0.26, 0.34, -0.02], s: [0.18, 0.4, 0.18], r: [0, 0, -0.28] },
]
export const EYES = [
  { p: [-0.17, 0.04, 0.34], s: [0.05, 0.085, 0.03] },
  { p: [0.17, 0.04, 0.34], s: [0.05, 0.085, 0.03] },
]

// tail: a chain of spheres that sways
export const TAIL_SEGMENTS = 12
export const TAIL_ROOT = [0.2, 0.3, -0.5]
export function tailPoint(i, time, energy, out) {
  const t = i / (TAIL_SEGMENTS - 1)
  const wave = Math.sin(time * (1.4 + energy * 2.2) - t * 3.2)
  out[0] = TAIL_ROOT[0] + (0.1 + 0.55 * t) * wave
  out[1] = TAIL_ROOT[1] + 1.05 * t - 0.2 * t * t
  out[2] = TAIL_ROOT[2] - 0.15 - 0.3 * t
  return 0.1 * (1 - 0.5 * t) // radius
}

// whisker line segments (head-local): from the muzzle outward
export const WHISKERS = (() => {
  const out = []
  for (const side of [-1, 1]) {
    for (const [dy, dz] of [[0.06, 0.1], [0.0, 0.14], [-0.06, 0.18]]) {
      out.push(side * 0.12, -0.08 + dy * 0.2, 0.42, side * 0.62, -0.08 + dy * 2.2, 0.42 - dz)
    }
  }
  return new Float32Array(out)
})()

// where the guide sits in each section, as fractions of the visible half-width / half-height
// index = section (0 hero, 1 about, 2 projects, 3 stack, 4 contact); yaw > 0 faces right
export const SPOTS = [
  { x: 0.18, y: -0.4, yaw: -0.6 },
  { x: 0.18, y: -0.4, yaw: -0.6 },
  { x: 0.78, y: -0.62, yaw: -0.7 },
  { x: 0.8, y: 0.55, yaw: -0.65 },
  { x: 0.76, y: -0.62, yaw: -0.7 },
]
