// Scroll-driven 3D "flight" props: ring gates you fly through, fly-by shards, and a section shockwave.
// Pure three.js (no React) so the per-frame maths is easy to test. Wrapped by Warp.jsx.
import {
  AdditiveBlending, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, InstancedMesh,
  LineBasicMaterial, LineLoop, LineSegments, Mesh, MeshBasicMaterial, Object3D, OctahedronGeometry, RingGeometry,
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

function loop(r, n, rot = 0) {
  const p = []
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2
    p.push(Math.cos(a) * r, Math.sin(a) * r, 0)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(p, 3))
  return g
}
function ticks(r0, r1, n) {
  const p = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const r = i % 6 === 0 ? r1 + 0.18 : r1
    p.push(Math.cos(a) * r0, Math.sin(a) * r0, 0, Math.cos(a) * r, Math.sin(a) * r, 0)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(p, 3))
  return g
}

export function createGates(N = 12) {
  const root = new Group()
  const geo = { ring: loop(3.5, 96), hex: loop(4.3, 6, Math.PI / 6), ticks: ticks(3.7, 3.95, 72) }
  const gates = []
  for (let i = 0; i < N; i++) {
    const mat = new LineBasicMaterial({ color: new Color(i % 2 ? '#2f7bff' : '#00f0ff'), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending })
    const g = new Group()
    g.add(new LineLoop(geo.ring, mat), new LineLoop(geo.hex, mat), new LineSegments(geo.ticks, mat))
    root.add(g)
    gates.push({ g, mat, base: (i / N) * SPAN, i })
  }
  function update(travel, strength, t) {
    for (const o of gates) {
      const un = o.base + travel // unwrapped distance along the tunnel
      const z = wrap(un, SPAN) - (SPAN - 8)
      const dist = CAM_Z - z
      const fade = sstep(1.5, 6, dist) * (1 - sstep(28, 62, dist))
      o.mat.opacity = fade * strength * 0.55
      const ph = un * 0.09
      o.g.position.set(Math.sin(ph) * 1.1, Math.cos(ph * 0.73) * 0.7, z)
      o.g.rotation.z = ph * 0.6 + t * 0.06 * (o.i % 2 ? 1 : -1)
      o.g.scale.setScalar(1 + 0.12 * Math.sin(ph * 1.7 + t * 0.8))
      o.g.visible = o.mat.opacity > 0.004
    }
  }
  return { root, update }
}

export function createShards(N = 90) {
  const geo = new OctahedronGeometry(1, 0)
  const mat = new MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.8, depthWrite: false, blending: AdditiveBlending })
  const mesh = new InstancedMesh(geo, mat, N)
  mesh.frustumCulled = false
  let s = 7
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const data = []
  for (let i = 0; i < N; i++) {
    const side = rnd() < 0.5 ? -1 : 1
    data.push({
      x: side * (2.8 + rnd() * 7), y: (rnd() - 0.5) * 9, base: rnd() * SPAN,
      size: 0.1 + rnd() * rnd() * 0.5, rx: (rnd() - 0.5) * 1.2, ry: (rnd() - 0.5) * 1.2, k: 0.7 + rnd() * 0.6, c: rnd() < 0.25 ? 1 : 0,
    })
  }
  const d = new Object3D()
  const col = new Color()
  const cyan = new Color('#00f0ff'), blue = new Color('#3a7bff')
  function update(travel, strength, vel, t) {
    for (let i = 0; i < N; i++) {
      const o = data[i]
      const z = wrap(o.base + travel * o.k, SPAN) - (SPAN - 8)
      const dist = CAM_Z - z
      const fade = sstep(1, 5, dist) * (1 - sstep(24, 60, dist))
      d.position.set(o.x, o.y + Math.sin(t * 0.3 + i) * 0.15, z)
      d.rotation.set(t * o.rx + i, t * o.ry, 0)
      const st = 1 + Math.min(vel, 2.5) * 1.4 // stretch along the flight direction when scrolling fast
      d.scale.set(o.size, o.size, o.size * st)
      d.updateMatrix()
      mesh.setMatrixAt(i, d.matrix)
      col.copy(o.c ? blue : cyan).multiplyScalar(fade * clamp(strength, 0.25, 1) * 0.9)
      mesh.setColorAt(i, col)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }
  return { root: mesh, update }
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
