// "Guide core": a glass orb with a glowing crystal inside, wrapped in polished metal rings.
// It starts big in the hero, then glides along with you through every section, leaving a comet trail.
// Pure three.js (no React) so the per-frame maths is testable. Wrapped by GuideCore.jsx.
import {
  AdditiveBlending, CanvasTexture, Color, Group, IcosahedronGeometry, Mesh, MeshBasicMaterial, MeshPhysicalMaterial,
  MeshStandardMaterial, PointLight, ShaderMaterial, SphereGeometry, Sprite, SpriteMaterial, TorusGeometry,
} from 'three'

const clamp = (v, a, b) => Math.min(Math.max(v, a), b)
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
const damp = (x, y, l, dt) => x + (y - x) * (1 - Math.exp(-l * dt))

// Where the guide wants to be for a float section position: [pos, x (fraction of half-width), y (fraction of half-height), scale]
// hero: big on the right; story: sits opposite each caption (captions alternate left/right); then it docks on the right edge.
const KEYS = [
  [0.0, 0.0, 0.1, 1.15],
  [0.06, 0.0, 0.1, 1.15],
  [0.16, 0.6, 0.12, 0.62],
  [0.28, 0.6, -0.05, 0.62],
  [0.38, -0.6, 0.12, 0.62],
  [0.58, -0.6, -0.05, 0.62],
  [0.68, 0.6, 0.12, 0.62],
  [0.88, 0.6, -0.05, 0.62],
  [1.0, 0.91, 0.6, 0.34],
  [2.0, 0.91, 0.3, 0.34],
  [3.0, 0.91, -0.1, 0.34],
  [3.6, 0.91, -0.4, 0.34],
  [4.0, 0.74, 0.58, 0.55], // contact: IO pops up at the top-right of the card and talks
]
export function guideTarget(pos, desktop, out = { x: 0, y: 0, s: 1 }) {
  const p = clamp(pos, 0, KEYS[KEYS.length - 1][0])
  let i = 1
  while (i < KEYS.length - 1 && p > KEYS[i][0]) i++
  const a = KEYS[i - 1], b = KEYS[i]
  const t = sstep(a[0], b[0], p)
  out.x = a[1] + (b[1] - a[1]) * t
  out.y = a[2] + (b[2] - a[2]) * t
  out.s = a[3] + (b[3] - a[3]) * t
  if (!desktop) { // phones: one column of text, so the guide hugs the right edge and stays small
    out.x = p < 0.06 ? 0.0 : 0.86
    out.y = p < 0.06 ? 0.38 : out.y * 0.9
    out.s *= 0.62
  }
  return out
}

function glowTexture() {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  gr.addColorStop(0, 'rgba(170,250,255,0.95)')
  gr.addColorStop(0.3, 'rgba(0,240,255,0.35)')
  gr.addColorStop(1, 'rgba(0,240,255,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, 128, 128)
  return new CanvasTexture(c)
}

const TRAIL = 26

export function createGuide() {
  const root = new Group()
  const trailGroup = new Group() // sprites live in world space
  const follow = new Group() // the orb itself
  root.add(trailGroup, follow)
  const body = new Group()
  follow.add(body)

  // glass shell (transmission = real refraction of whatever is behind it)
  const glass = new MeshPhysicalMaterial({
    color: new Color('#e4ecff'), roughness: 0.03, metalness: 0, transmission: 1, thickness: 0.9, ior: 1.35,
    clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 1, iridescenceIOR: 1.4,
    attenuationColor: new Color('#5b8dff'), attenuationDistance: 5, envMapIntensity: 0.9,
  })
  const shell = new Mesh(new SphereGeometry(0.86, 64, 48), glass)
  body.add(shell)

  // glowing faceted crystal inside (emissive -> picked up by the bloom)
  const coreMat = new MeshStandardMaterial({ color: new Color('#0a2d5a'), emissive: new Color('#8ff3ff'), emissiveIntensity: 2.4, roughness: 0.25, metalness: 0.3, flatShading: true })
  const core = new Mesh(new IcosahedronGeometry(0.5, 1), coreMat)
  body.add(core)
  const innerGlow = new Mesh(new SphereGeometry(0.58, 24, 24), new MeshBasicMaterial({ color: new Color('#2f7bff'), transparent: true, opacity: 0.1, depthWrite: false, blending: AdditiveBlending }))
  body.add(innerGlow)

  // fresnel rim: the edge of the orb glows (brighter toward the silhouette), with slow energy bands
  const rimMat = new ShaderMaterial({
    uniforms: { uColor: { value: new Color('#4fd8ff') }, uTime: { value: 0 }, uAmt: { value: 0.9 }, uVoice: { value: 0 } },
    vertexShader: `
      varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        vW = position;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uTime; uniform float uAmt; uniform float uVoice;
      varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main() {
        float f = 1.0 - clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
        float rim = pow(f, 2.6);
        float band = 0.5 + 0.5 * sin(vW.y * 14.0 - uTime * 1.6 + vW.x * 3.0);
        float a = rim * (0.55 + 0.45 * band) * uAmt * (1.0 + uVoice * 0.8);
        gl_FragColor = vec4(uColor * a * 1.6, a);
      }`,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  })
  const rim = new Mesh(new SphereGeometry(0.9, 48, 36), rimMat)
  body.add(rim)

  // a small face that does not spin with the body: two eyes that follow the mouse and blink, and a mouth that moves when IO talks
  const face = new Group()
  const eyeMat = new MeshBasicMaterial({ color: new Color('#eaffff'), toneMapped: false })
  const eyeL = new Mesh(new SphereGeometry(0.07, 16, 12), eyeMat)
  const eyeR = new Mesh(new SphereGeometry(0.07, 16, 12), eyeMat)
  eyeL.position.set(-0.2, 0.08, 0.66)
  eyeR.position.set(0.2, 0.08, 0.66)
  const mouth = new Mesh(new SphereGeometry(0.05, 16, 12), eyeMat)
  mouth.position.set(0, -0.11, 0.68)
  face.add(eyeL, eyeR, mouth)
  follow.add(face)

  // polished metal gyroscope rings (reflect the environment) + glowing beads
  const metal = new MeshStandardMaterial({ color: new Color('#a9c1e6'), metalness: 1, roughness: 0.28, envMapIntensity: 1.7 })
  const beadMat = new MeshStandardMaterial({ color: new Color('#ffffff'), emissive: new Color('#9fd8ff'), emissiveIntensity: 3 })
  const rings = []
  for (const s of [
    { r: 1.2, w: 0.022, tilt: [0.5, 0, 0], sp: 0.55 },
    { r: 1.42, w: 0.018, tilt: [0, 0.5, 1.0], sp: -0.42 },
    { r: 1.66, w: 0.014, tilt: [1.2, 0.5, 0], sp: 0.3 },
  ]) {
    const holder = new Group()
    const ring = new Mesh(new TorusGeometry(s.r, s.w, 16, 160), metal)
    const bead = new Mesh(new SphereGeometry(0.05, 16, 16), beadMat)
    bead.position.set(s.r, 0, 0)
    const arm = new Group()
    arm.add(bead)
    holder.add(ring, arm)
    holder.rotation.set(s.tilt[0], s.tilt[1], s.tilt[2])
    body.add(holder)
    rings.push({ holder, arm, sp: s.sp })
  }

  const light = new PointLight('#4d8bff', 12, 9, 2)
  follow.add(light)

  // soft halo + comet trail (sprites)
  const tex = glowTexture()
  const haloMat = new SpriteMaterial({ map: tex, color: new Color('#5aa0ff'), transparent: true, opacity: 0.5, depthWrite: false, blending: AdditiveBlending })
  const halo = new Sprite(haloMat)
  halo.position.z = -0.5
  follow.add(halo)
  const trail = []
  for (let i = 0; i < TRAIL; i++) {
    const m = new SpriteMaterial({ map: tex, color: new Color(i % 3 ? '#00f0ff' : '#5aa0ff'), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending })
    const sp = new Sprite(m)
    sp.visible = false
    trailGroup.add(sp)
    trail.push(sp)
  }

  const tgt = { x: 0, y: 0, s: 1 }
  const st = { x: null, y: 0, appear: 0, tick: 0, trailAge: 0, speed: 0, mode: null, talk: 0 }
  const hist = []
  let rotY = 0

  /** halfW/halfH: visible half-extent at the orb's depth. */
  function update(t, dt, pos, vel, pointer, desktop, ready, halfW, halfH, talk = 0) {
    st.talk = damp(st.talk, talk, 10, dt)
    guideTarget(pos, desktop, tgt)
    const wx = tgt.x * halfW, wy = tgt.y * halfH
    if (st.x === null) { st.x = wx; st.y = wy }
    const px = st.x, py = st.y
    st.x = damp(st.x, wx, 2.4, dt)
    st.y = damp(st.y, wy, 2.4, dt)
    st.speed = damp(st.speed, Math.hypot(st.x - px, st.y - py) / Math.max(dt, 1e-3), 8, dt)

    st.appear = damp(st.appear, ready ? 1 : 0, 1.7, dt)
    const v = clamp(vel, 0, 2)
    const sc = Math.max(0.0001, tgt.s * (0.4 + 0.6 * st.appear) * (1 + v * 0.06))
    follow.position.set(st.x, st.y + Math.sin(t * 1.1) * 0.07 * tgt.s, 0.5)
    follow.scale.setScalar(sc)
    root.visible = st.appear > 0.01

    // tumble: faster while you scroll; leans toward the mouse
    rotY += dt * (0.25 + v * 1.2)
    body.rotation.y = rotY
    follow.rotation.x = damp(follow.rotation.x, -pointer.y * 0.25, 3, dt)
    follow.rotation.z = damp(follow.rotation.z, -pointer.x * 0.1, 3, dt)
    core.rotation.x += dt * (0.5 + v * 1.5)
    core.rotation.y += dt * (0.7 + v * 1.5)
    const beat = 0.5 + 0.5 * Math.sin(t * 1.7)
    rimMat.uniforms.uTime.value = t
    rimMat.uniforms.uVoice.value = st.talk
    // face: look at the pointer, blink every few seconds, mouth opens while talking
    face.rotation.y = damp(face.rotation.y, pointer.x * 0.5, 6, dt)
    face.rotation.x = damp(face.rotation.x, -pointer.y * 0.35, 6, dt)
    const blink = (t % 4.3) < 0.13 ? 0.12 : 1
    eyeL.scale.set(1, 1.5 * blink, 0.6)
    eyeR.scale.set(1, 1.5 * blink, 0.6)
    mouth.scale.set(1.5 - st.talk * 0.5, 0.16 + st.talk * (0.35 + 0.35 * Math.sin(t * 22) * Math.sin(t * 9)), 0.5)
    face.visible = st.appear > 0.3
    const voice = st.talk * (0.5 + 0.5 * Math.sin(t * 17) * Math.sin(t * 6.3)) // flickers while IO speaks
    coreMat.emissiveIntensity = (1.8 + 1.2 * beat + v * 1.2 + voice * 2.2) * st.appear
    light.intensity = (10 + 8 * beat + v * 6 + voice * 14) * st.appear
    haloMat.opacity = st.appear * (0.32 + 0.2 * beat + voice * 0.25)
    const hs = 4.4 * sc * (1 + beat * 0.08 + voice * 0.12)
    halo.scale.set(hs, hs, 1)
    for (const r of rings) {
      r.holder.rotation.z += dt * r.sp * (1 + v * 2)
      r.arm.rotation.z += dt * r.sp * 2.4 * (1 + v)
    }

    // comet trail: remember where the orb has been, draw fading glows along it
    st.trailAge += dt
    if (st.trailAge > 0.028) {
      st.trailAge = 0
      hist.unshift([follow.position.x, follow.position.y, sc])
      if (hist.length > TRAIL) hist.pop()
    }
    const k = clamp(st.speed * 0.9, 0, 1) * st.appear
    for (let i = 0; i < TRAIL; i++) {
      const h = hist[i], sp = trail[i]
      if (!h || k < 0.02) { sp.visible = false; continue }
      const f = i / TRAIL
      sp.visible = true
      sp.position.set(h[0], h[1], 0.2)
      const s = h[2] * 1.5 * (1 - f * 0.8)
      sp.scale.set(s, s, 1)
      sp.material.opacity = k * Math.pow(1 - f, 1.6) * 0.5
    }
  }

  // phones skip the (heavier) refraction: a see-through tinted shell instead
  function setQuality(desktop) {
    const key = desktop ? 'hi' : 'lo'
    if (st.mode === key) return
    st.mode = key
    glass.transmission = desktop ? 1 : 0
    glass.transparent = !desktop
    glass.opacity = desktop ? 1 : 0.3
    glass.needsUpdate = true
  }

  return { root, update, setQuality, state: st, target: tgt }
}
