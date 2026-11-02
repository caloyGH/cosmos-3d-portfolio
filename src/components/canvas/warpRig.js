// Scroll-driven 3D "flight" props: ring gates you fly through, fly-by shards, and a section shockwave.
// Pure three.js (no React) so the per-frame maths is easy to test. Wrapped by Warp.jsx.
import {
  AdditiveBlending, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, InstancedMesh,
  Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, SphereGeometry, Float32BufferAttribute as F32,
  RingGeometry, DirectionalLight, HemisphereLight, TorusGeometry, BoxGeometry,
} from 'three'

const SPAN = 72 // length of the tunnel in front of the camera (same as the starfield)
const CAM_Z = 7.5
const clamp = (v, a, b) => Math.min(Math.max(v, a), b)
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
const wrap = (v, m) => ((v % m) + m) % m

// 0 in the calm hero, full strength through the story (pos 0..1), then a quieter backdrop
export function flightStrength(pos, vel) {
  const story = sstep(0.02, 0.14, pos) * (1 - sstep(0.86, 1.0, pos))
  return clamp(0.3 + 0.7 * story + Math.min(vel, 2) * 0.22, 0, 1.25)
}

// glue lit geometries (position + normal) into one, so a gate costs a few draw calls
function mergeLit(geos) {
  const pos = [], nor = [], idx = []
  let off = 0
  for (const g of geos) {
    const p = g.attributes.position, n = g.attributes.normal
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)) }
    const ix = g.index
    for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + off)
    off += p.count
  }
  const m = new BufferGeometry()
  m.setAttribute('position', new Float32BufferAttribute(pos, 3))
  m.setAttribute('normal', new Float32BufferAttribute(nor, 3))
  m.setIndex(idx)
  return m
}
// n separate arcs of a thin tube (real round bars, lit like metal), each `len` radians long
const tubeArcs = (R, tube, n, len, phase = 0) =>
  mergeLit(Array.from({ length: n }, (_, i) => new TorusGeometry(R, tube, 8, 40, len).rotateZ(phase + (i / n) * Math.PI * 2)))
// a few small solid blocks sitting on the ring
const blocks = (R, n, phase = 0) =>
  mergeLit(Array.from({ length: n }, (_, i) => {
    const a = phase + (i / n) * Math.PI * 2
    return new BoxGeometry(0.34, 0.07, 0.2).rotateZ(a + Math.PI / 2).translate(Math.cos(a) * R, Math.sin(a) * R, 0)
  }))

/**
 * Gates you fly through: quiet, solid rings made of real round bars (lit, so one side is bright and the other dark), a few small
 * blocks and one very faint full ring. Fewer and fainter than before: they are scenery, not a light show.
 */
export function createGates(N = 8) {
  const root = new Group()
  const geo = {
    outer: tubeArcs(3.5, 0.05, 3, 1.5),
    inner: tubeArcs(2.95, 0.028, 2, 1.7, 0.6),
    marks: blocks(3.5, 3, 0.4),
    halo: new TorusGeometry(3.25, 0.012, 6, 96),
  }
  const gates = []
  for (let i = 0; i < N; i++) {
    const tint = new Color(i % 2 ? '#2f7bff' : '#00f0ff')
    const mk = (k, emissive) => {
      const m = new MeshStandardMaterial({ color: '#8fb4d8', emissive: tint, emissiveIntensity: emissive, metalness: 0.7, roughness: 0.32, transparent: true, opacity: 0, depthWrite: false })
      return { m, k }
    }
    const M = { outer: mk(1, 0.55), marks: mk(1, 0.9), inner: mk(0.8, 0.45), halo: mk(0.35, 0.8) }
    const g = new Group()
    const A = new Mesh(geo.outer, M.outer.m), B = new Mesh(geo.marks, M.marks.m), C = new Mesh(geo.inner, M.inner.m), D = new Mesh(geo.halo, M.halo.m)
    g.add(A, B, C, D)
    root.add(g)
    gates.push({ g, A, B, C, D, mats: Object.values(M), base: (i / N) * SPAN, i })
  }
  function update(travel, strength, t) {
    for (const o of gates) {
      const un = o.base + travel // unwrapped distance along the tunnel
      const z = wrap(un, SPAN) - (SPAN - 8)
      const dist = CAM_Z - z
      const fade = sstep(5, 12, dist) * (1 - sstep(24, 56, dist)) // gone before they get big enough to fill the screen
      const op = fade * strength * 0.5
      for (const { m, k } of o.mats) m.opacity = op * k
      const ph = un * 0.09
      const dir = o.i % 2 ? 1 : -1
      o.g.position.set(Math.sin(ph) * 1.1, Math.cos(ph * 0.73) * 0.7, z)
      o.g.rotation.z = ph * 0.6
      o.g.rotation.x = Math.sin(ph * 0.8) * 0.28 // each gate leans a little, so you see its thickness and depth
      o.g.rotation.y = Math.cos(ph * 0.6) * 0.28
      o.A.rotation.z = t * 0.1 * dir
      o.B.rotation.z = -t * 0.16 * dir
      o.C.rotation.z = t * 0.3 * dir
      o.g.visible = op > 0.004
    }
  }
  return { root, update }
}

// ---- a detailed rock, built once and shared by every asteroid ----
// Everything is a function of the direction on the sphere, so the seam of the sphere closes perfectly and normals come out smooth.
const hsh = (x, y, z) => { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h) }
function vnoise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z)
  const fx = x - ix, fy = y - iy, fz = z - iz
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz)
  const l = (a, b, t) => a + (b - a) * t
  return l(
    l(l(hsh(ix, iy, iz), hsh(ix + 1, iy, iz), u), l(hsh(ix, iy + 1, iz), hsh(ix + 1, iy + 1, iz), u), v),
    l(l(hsh(ix, iy, iz + 1), hsh(ix + 1, iy, iz + 1), u), l(hsh(ix, iy + 1, iz + 1), hsh(ix + 1, iy + 1, iz + 1), u), v), w)
}
function fbmJ(x, y, z, oct) {
  let v = 0, a = 0.5
  for (let i = 0; i < oct; i++) { v += a * vnoise(x, y, z); x = x * 2.03 + 1.7; y = y * 2.03 + 3.1; z = z * 2.03 + 5.3; a *= 0.5 }
  return v
}
function makeCraters(n) {
  let sd = 11
  const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647)
  const out = []
  for (let i = 0; i < n; i++) {
    const z = r() * 2 - 1, a = r() * Math.PI * 2, q = Math.sqrt(1 - z * z)
    const big = i < 5
    out.push({ x: q * Math.cos(a), y: z, z: q * Math.sin(a), rho: big ? 0.28 + r() * 0.22 : 0.07 + r() * 0.16, depth: big ? 0.1 + r() * 0.05 : 0.04 + r() * 0.05 })
  }
  return out
}
const CRATERS = makeCraters(26)
// radius of the rock in direction (x,y,z) (unit), plus how deep into a crater that spot is (for the colour)
function rockR(x, y, z, out) {
  let r = 1 + 0.34 * (fbmJ(x * 1.5 + 4, y * 1.5, z * 1.5, 3) - 0.5)          // big lumps
  r += 0.1 * (fbmJ(x * 5 + 9, y * 5, z * 5, 3) - 0.5)                          // boulders
  r += 0.025 * (fbmJ(x * 22, y * 22 + 2, z * 22, 3) - 0.5)                     // fine grain
  let pit = 0
  for (const c of CRATERS) {
    const ang = Math.acos(Math.min(1, Math.max(-1, x * c.x + y * c.y + z * c.z)))
    const t = ang / c.rho
    if (t < 1.5) {
      if (t < 1) { const bowl = 1 - t * t; r -= c.depth * bowl; pit += bowl * c.depth * 8 }
      r += c.depth * 0.35 * Math.exp(-(((t - 1) / 0.22) ** 2))                    // raised rim
    }
  }
  if (out) out.pit = pit
  return r
}
function rockGeometry() {
  const g = new SphereGeometry(1, 56, 40)
  const p = g.attributes.position
  const n = p.count
  const col = new Float32Array(n * 3)
  const nor = new Float32Array(n * 3)
  const o = { pit: 0 }
  const E = 0.012
  for (let i = 0; i < n; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const l = Math.hypot(x, y, z); x /= l; y /= l; z /= l
    const r = rockR(x, y, z, o)
    p.setXYZ(i, x * r, y * r, z * r)
    // normal from the surface itself (finite differences along two tangents), identical on both sides of the seam
    const ax = Math.abs(x) < 0.9 ? 1 : 0, ay = ax ? 0 : 1
    let t1x = ay * z - 0 * y, t1y = 0 * x - ax * z, t1z = ax * y - ay * x // cross((ax,ay,0), d)
    const tl = Math.hypot(t1x, t1y, t1z); t1x /= tl; t1y /= tl; t1z /= tl
    const t2x = y * t1z - z * t1y, t2y = z * t1x - x * t1z, t2z = x * t1y - y * t1x
    const pt = (sx, sy, sz) => { let a = x + sx, b = y + sy, c = z + sz; const m = Math.hypot(a, b, c); a /= m; b /= m; c /= m; const rr = rockR(a, b, c); return [a * rr, b * rr, c * rr] }
    const A = pt(t1x * E, t1y * E, t1z * E), B = pt(t2x * E, t2y * E, t2z * E)
    const ux = A[0] - x * r, uy = A[1] - y * r, uz = A[2] - z * r
    const vx = B[0] - x * r, vy = B[1] - y * r, vz = B[2] - z * r
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
    if (nx * x + ny * y + nz * z < 0) { nx = -nx; ny = -ny; nz = -nz }
    const nl = Math.hypot(nx, ny, nz) || 1
    nor[i * 3] = nx / nl; nor[i * 3 + 1] = ny / nl; nor[i * 3 + 2] = nz / nl
    // albedo: patchy grey, darker inside the craters, a little lighter on the lumps
    const tone = 0.62 + 0.55 * (fbmJ(x * 4 + 2, y * 4, z * 4 + 7, 3) - 0.5) - Math.min(o.pit, 0.35) + 0.5 * (r - 1)
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = Math.max(0.12, tone)
  }
  g.setAttribute('normal', new F32(nor, 3))
  g.setAttribute('color', new F32(col, 3))
  return g
}

/** Asteroids that streak past as you scroll: real lit 3D rocks (they tumble, have a bright side and a dark side). */
export function createShards(N = 26) {
  const mesh = new InstancedMesh(rockGeometry(), new MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.95, metalness: 0.04 }), N)
  mesh.frustumCulled = false
  const root = new Group()
  const sun = new DirectionalLight('#ffe9d2', 3.2)
  sun.position.set(5, 4, 6)
  const fill = new HemisphereLight('#3a7bff', '#05070d', 0.55) // cool bounce light so the dark side is never pitch black
  root.add(mesh, sun, fill)
  let s = 7
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const tones = ['#8a8178', '#6f6a66', '#9a8b7a', '#5f6670', '#7d7468'] // grey-brown rock, a few colder ones
  const data = []
  for (let i = 0; i < N; i++) {
    const side = rnd() < 0.5 ? -1 : 1
    data.push({
      x: side * (2.8 + rnd() * 7), y: (rnd() - 0.5) * 9, base: rnd() * SPAN,
      size: 0.05 + rnd() * rnd() * 0.3, rx: (rnd() - 0.5) * 0.9, ry: (rnd() - 0.5) * 0.9, k: 0.7 + rnd() * 0.6,
      sx: 0.75 + rnd() * 0.6, sy: 0.7 + rnd() * 0.6, sz: 0.75 + rnd() * 0.6, tone: new Color(tones[i % tones.length]),
    })
  }
  const d = new Object3D()
  const col = new Color()
  function update(travel, strength, vel, t) {
    for (let i = 0; i < N; i++) {
      const o = data[i]
      const z = wrap(o.base + travel * o.k, SPAN) - (SPAN - 8)
      const dist = CAM_Z - z
      const fade = sstep(1, 5, dist) * (1 - sstep(24, 60, dist)) // dims into the dark with distance (and when too close)
      d.position.set(o.x, o.y + Math.sin(t * 0.3 + i) * 0.15, z)
      d.rotation.set(t * o.rx + i, t * o.ry + i * 0.7, t * 0.1 * o.rx)
      const st = 1 + Math.min(vel, 2.5) * 0.5
      d.scale.set(o.size * o.sx, o.size * o.sy, o.size * o.sz * st)
      d.updateMatrix()
      mesh.setMatrixAt(i, d.matrix)
      col.copy(o.tone).multiplyScalar(fade * clamp(strength, 0.3, 1))
      mesh.setColorAt(i, col)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }
  return { root, update }
}

export function createPulse() {
  const mat = new MeshBasicMaterial({ color: '#00f0ff', transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, side: DoubleSide })
  const mesh = new Mesh(new RingGeometry(0.94, 1, 96), mat)
  mesh.position.z = -5
  mesh.visible = false
  let age = 1
  let last = null
  function update(pos, dt) {
    const sec = Math.round(pos)
    if (last === null) last = sec
    if (sec !== last) { last = sec; age = 0 }
    if (age < 1) {
      age += dt / 1.2
      const k = clamp(age, 0, 1)
      mesh.scale.setScalar(0.5 + k * 16)
      mat.opacity = Math.pow(1 - k, 2) * 0.55
      mesh.visible = true
    } else mesh.visible = false
  }
  return { root: mesh, update }
}
