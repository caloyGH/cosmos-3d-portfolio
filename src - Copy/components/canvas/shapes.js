// Target point clouds for the particle morph. Every shape has the same number of
// points, so particle i simply travels from shape[i] to the next shape[i] on scroll.
// Pure JS (no three.js) so it is easy to tweak or test.

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rnd = mulberry32(1337) // seeded: the same shapes on every load
const g = () => (rnd() + rnd() + rnd() + rnd() - 2) * 1.732 // ~gaussian, sd = 1
const TAU = Math.PI * 2

/** Rotate every point around X then Y (bakes a 3D tilt into a shape). */
function tilt(a, ax, ay) {
  const cx = Math.cos(ax), sx = Math.sin(ax)
  const cy = Math.cos(ay), sy = Math.sin(ay)
  for (let i = 0; i < a.length; i += 3) {
    let x = a[i], y = a[i + 1], z = a[i + 2]
    const y1 = y * cx - z * sx
    const z1 = y * sx + z * cx
    const x2 = x * cy + z1 * sy
    const z2 = -x * sy + z1 * cy
    a[i] = x2
    a[i + 1] = y1
    a[i + 2] = z2
  }
  return a
}

/** 0 · Hero: spiral galaxy / vortex with a dense bright core. */
export function vortex(n) {
  const a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    let x, y, z
    if (rnd() < 0.22) {
      const r = Math.abs(g()) * 0.35
      const th = rnd() * TAU
      x = Math.cos(th) * r
      y = Math.sin(th) * r
      z = g() * 0.18
    } else {
      const arm = Math.floor(rnd() * 3)
      const r = Math.pow(rnd(), 0.6) * 2.6 + 0.1
      const th = arm * (TAU / 3) + r * 1.6 + g() * (0.12 + r * 0.07)
      x = Math.cos(th) * r
      y = Math.sin(th) * r
      z = g() * 0.1 * (1.1 - r / 3.2)
    }
    a[i * 3] = x
    a[i * 3 + 1] = y
    a[i * 3 + 2] = z
  }
  return tilt(a, 0.5, 0)
}

/** 1 · About: glowing crescent ring (an eclipse). */
export function eclipse(n) {
  const a = new Float32Array(n * 3)
  const R = 1.8
  let i = 0
  while (i < n) {
    if (rnd() < 0.1) {
      // faint dust across the field
      const r = Math.sqrt(rnd()) * 3.0
      const th = rnd() * TAU
      a[i * 3] = Math.cos(th) * r
      a[i * 3 + 1] = Math.sin(th) * r
      a[i * 3 + 2] = g() * 0.3
      i++
      continue
    }
    const th = rnd() * TAU
    const w = Math.pow(0.5 + 0.5 * Math.cos(th - 0.7), 2.4) // brightest on one side
    if (rnd() > w + 0.05) continue
    let r = R + g() * (0.07 + w * 0.12)
    if (rnd() < 0.3) r = R + Math.abs(g()) * 0.5 * (0.3 + w) // outer glow
    a[i * 3] = Math.cos(th) * r
    a[i * 3 + 1] = Math.sin(th) * r
    a[i * 3 + 2] = g() * 0.1 * (0.5 + w)
    i++
  }
  return a
}

/** 2 · Work: trefoil knot. */
export function knot(n) {
  const a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const t = rnd() * TAU
    // classic trefoil: three symmetric lobes when seen face-on
    a[i * 3] = (Math.sin(t) + 2 * Math.sin(2 * t)) * 0.7 + g() * 0.07
    a[i * 3 + 1] = (Math.cos(t) - 2 * Math.cos(2 * t)) * 0.7 + g() * 0.07
    a[i * 3 + 2] = -Math.sin(3 * t) * 0.7 + g() * 0.07
  }
  return a
}

/** 3 · Stack: cube lattice (edges, corner clusters and the three centre axes). */
export function lattice(n) {
  const a = new Float32Array(n * 3)
  const h = 1.5
  const p = [0, 0, 0]
  for (let i = 0; i < n; i++) {
    const u = rnd()
    if (u < 0.72) {
      const edge = Math.floor(rnd() * 12)
      const axis = Math.floor(edge / 4)
      p[(axis + 1) % 3] = edge & 1 ? h : -h
      p[(axis + 2) % 3] = edge & 2 ? h : -h
      p[axis] = (rnd() * 2 - 1) * h
    } else if (u < 0.86) {
      p[0] = (rnd() < 0.5 ? h : -h) + g() * 0.12
      p[1] = (rnd() < 0.5 ? h : -h) + g() * 0.12
      p[2] = (rnd() < 0.5 ? h : -h) + g() * 0.12
    } else {
      const axis = Math.floor(rnd() * 3)
      p[0] = g() * 0.03
      p[1] = g() * 0.03
      p[2] = g() * 0.03
      p[axis] = (rnd() * 2 - 1) * h
    }
    a[i * 3] = p[0] + g() * 0.03
    a[i * 3 + 1] = p[1] + g() * 0.03
    a[i * 3 + 2] = p[2] + g() * 0.03
  }
  return tilt(a, 0.5, 0.6)
}

/** 4 · Contact: a "C" mark (for Cosmos) with a thin orbit ring. */
export function mark(n) {
  const a = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    if (rnd() < 0.12) {
      const th = rnd() * TAU
      const r = 2.6 + g() * 0.02
      a[i * 3] = Math.cos(th) * r
      a[i * 3 + 1] = Math.sin(th) * r
      a[i * 3 + 2] = g() * 0.02
    } else {
      const th = Math.PI * 0.28 + rnd() * Math.PI * 1.44 // opening faces right
      const r = 1.25 + Math.sqrt(rnd()) * 0.6
      a[i * 3] = Math.cos(th) * r
      a[i * 3 + 1] = Math.sin(th) * r
      a[i * 3 + 2] = g() * 0.08
    }
  }
  return a
}

/** Stars for the warp field: each star is a 2-vertex line (head + tail). Own seeded rng. */
export function buildStars(n, depth = 70) {
  const srnd = mulberry32(2024)
  const pos = new Float32Array(n * 2 * 3)
  const side = new Float32Array(n * 2)
  const rand = new Float32Array(n * 2)
  for (let i = 0; i < n; i++) {
    const th = srnd() * TAU
    const r = 1.5 + Math.pow(srnd(), 0.7) * 22
    const x = Math.cos(th) * r
    const y = Math.sin(th) * r
    const z = srnd() * depth
    const q = srnd()
    for (let k = 0; k < 2; k++) {
      const j = i * 2 + k
      pos[j * 3] = x
      pos[j * 3 + 1] = y
      pos[j * 3 + 2] = z
      side[j] = k
      rand[j] = q
    }
  }
  return { pos, side, rand }
}

/** All five shapes + a per-particle random vec4. */
export function buildShapes(n) {
  const rand = new Float32Array(n * 4)
  for (let i = 0; i < rand.length; i++) rand[i] = rnd()
  return { shapes: [vortex(n), eclipse(n), knot(n), lattice(n), mark(n)], rand }
}
