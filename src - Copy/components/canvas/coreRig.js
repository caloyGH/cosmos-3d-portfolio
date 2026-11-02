// Hero "core": a glowing faceted crystal wrapped in gyroscope rings, orbiting beads and outgoing scan pulses.
// Pure three.js (no React) so it can be tested without a browser. Wrapped by HeroCore.jsx.
import {
  AdditiveBlending, CanvasTexture, Color, DoubleSide, EdgesGeometry, Group, IcosahedronGeometry, LineBasicMaterial,
  LineSegments, Mesh, MeshBasicMaterial, RingGeometry, Sprite, SpriteMaterial, SphereGeometry, TorusGeometry,
} from 'three'

const clamp = (v, a, b) => Math.min(Math.max(v, a), b)
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
const damp = (x, y, l, dt) => x + (y - x) * (1 - Math.exp(-l * dt))

function glowTexture() {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  gr.addColorStop(0, 'rgba(160,250,255,0.9)')
  gr.addColorStop(0.25, 'rgba(0,240,255,0.35)')
  gr.addColorStop(1, 'rgba(0,240,255,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, 128, 128)
  return new CanvasTexture(c)
}

const add = (color, opacity = 1) => ({ color: new Color(color), transparent: true, opacity, depthWrite: false, blending: AdditiveBlending })

export function createCore() {
  const root = new Group()
  const spin = new Group() // everything that tumbles
  root.add(spin)

  // faceted crystal: dark solid (hides the back edges) + bright edges + inner energy shell
  const solid = new Mesh(new IcosahedronGeometry(0.78, 1), new MeshBasicMaterial({ color: new Color('#031017'), transparent: true, opacity: 1 }))
  const edgesMat = new LineBasicMaterial(add('#37f6ff'))
  const edges = new LineSegments(new EdgesGeometry(new IcosahedronGeometry(0.8, 1)), edgesMat)
  const shellMat = new MeshBasicMaterial({ ...add('#00c8ff', 0.18), side: DoubleSide })
  const shell = new Mesh(new IcosahedronGeometry(0.98, 2), shellMat)
  spin.add(solid, shell, edges)

  // gyroscope rings, each on its own axis
  const rings = []
  const specs = [
    { r: 1.35, c: '#00f0ff', ax: [1, 0.2, 0], sp: 0.55, tilt: [0.5, 0, 0] },
    { r: 1.65, c: '#2f7bff', ax: [0, 1, 0.3], sp: -0.4, tilt: [0, 0.4, 1.0] },
    { r: 1.98, c: '#00f0ff', ax: [0.3, 0, 1], sp: 0.3, tilt: [1.2, 0.5, 0] },
  ]
  for (const s of specs) {
    const holder = new Group()
    const mat = new MeshBasicMaterial(add(s.c, 0.75))
    const ring = new Mesh(new TorusGeometry(s.r, 0.011, 6, 180), mat)
    const bead = new Mesh(new SphereGeometry(0.055, 12, 12), new MeshBasicMaterial(add('#ffffff', 1)))
    bead.position.set(s.r, 0, 0)
    const arm = new Group()
    arm.add(bead)
    holder.add(ring, arm)
    holder.rotation.set(s.tilt[0], s.tilt[1], s.tilt[2])
    root.add(holder)
    rings.push({ holder, ring, mat, arm, sp: s.sp })
  }

  // soft halo behind everything
  const tex = glowTexture()
  const haloMat = new SpriteMaterial({ map: tex, color: new Color('#7ff8ff'), transparent: true, opacity: 0.7, depthWrite: false, blending: AdditiveBlending })
  const halo = new Sprite(haloMat)
  halo.scale.set(5.2, 5.2, 1)
  halo.position.z = -0.4
  root.add(halo)

  // outgoing scan pulses (flat rings facing the camera)
  const pulses = [0, 1].map((i) => {
    const mat = new MeshBasicMaterial({ ...add('#00f0ff', 0), side: DoubleSide })
    const m = new Mesh(new RingGeometry(0.985, 1, 128), mat)
    m.position.z = -0.2
    root.add(m)
    return { m, mat, off: i * 0.5 }
  })

  let appear = 0
  const st = { x: 0 }
  /**
   * t seconds, dt, pos = float section position, vel = scroll speed, pointer {x,y}, desktop, ready (loader finished)
   */
  function update(t, dt, pos, vel, pointer, desktop, ready) {
    appear = damp(appear, ready ? 1 : 0, 1.6, dt)
    const gone = sstep(0.05, 0.75, pos) // fades out as you leave the hero
    const vis = appear * (1 - gone)
    root.visible = vis > 0.01

    const v = clamp(vel, 0, 2)
    // placement: right-hand side on desktop (same spot as the particle vortex), centred on mobile
    st.x = damp(st.x, desktop ? 2.3 : 0, 4, dt)
    root.position.set(st.x, 0.1 + pos * 0.8, 1.0 - pos * 1.5 + v * 0.6)
    const scl = (desktop ? 1 : 0.7) * (0.35 + 0.65 * appear) * (1 + v * 0.12)
    root.scale.setScalar(scl)
    root.rotation.y = damp(root.rotation.y, pointer.x * 0.35, 3, dt)
    root.rotation.x = damp(root.rotation.x, -pointer.y * 0.25, 3, dt)

    // tumble faster while scrolling
    spin.rotation.y += dt * (0.35 + v * 1.4)
    spin.rotation.x += dt * (0.18 + v * 0.6)
    const beat = 0.5 + 0.5 * Math.sin(t * 1.6)
    edgesMat.opacity = vis * (0.65 + 0.35 * beat)
    shellMat.opacity = vis * (0.12 + 0.12 * beat)
    solid.material.opacity = vis
    haloMat.opacity = vis * (0.45 + 0.25 * beat + v * 0.15)
    halo.scale.set(5.2 + beat * 0.5 + v, 5.2 + beat * 0.5 + v, 1)

    for (const r of rings) {
      r.holder.rotation.z += dt * r.sp * (1 + v * 2.2)
      r.arm.rotation.z += dt * r.sp * 2.6 * (1 + v)
      r.mat.opacity = vis * 0.75
      r.arm.children[0].material.opacity = vis
    }
    for (const p of pulses) {
      const k = (t * 0.33 + p.off) % 1
      p.m.scale.setScalar(0.9 + k * 3.4)
      p.mat.opacity = vis * Math.pow(1 - k, 2) * 0.5
    }
  }
  return { root, update }
}
