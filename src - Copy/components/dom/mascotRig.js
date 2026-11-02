// IO, the guide, v2: a detailed, volumetric "3D" mascot made of stacked SVG layers.
// Every layer sits at its own depth (CSS translateZ) inside a perspective container, so IO really tilts toward the
// mouse with parallax, and the orbit rings pass in front of AND behind the body. Plain DOM/SVG: no WebGL needed.
// Heavy SVG filters live only on STATIC layers (the body); animated layers are filter-free.

const TAU = Math.PI * 2
const clamp = (v, a, b) => Math.min(Math.max(v, a), b)
const damp = (x, y, l, dt) => x + (y - x) * (1 - Math.exp(-l * dt))
const f1 = (n) => n.toFixed(1)

function star(cx, cy, R, r, n = 5, rot = -Math.PI / 2) {
  let d = ''
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n
    const rr = i % 2 ? r : R
    d += (i ? 'L' : 'M') + f1(cx + Math.cos(a) * rr) + ' ' + f1(cy + Math.sin(a) * rr)
  }
  return d + 'Z'
}
function sparkle(cx, cy, R) {
  const r = R * 0.22
  return `M${cx} ${cy - R}L${f1(cx + r)} ${f1(cy - r)}L${cx + R} ${cy}L${f1(cx + r)} ${f1(cy + r)}L${cx} ${cy + R}L${f1(cx - r)} ${f1(cy + r)}L${cx - R} ${cy}L${f1(cx - r)} ${f1(cy - r)}Z`
}

function bodyCircles() {
  const c = [{ x: 200, y: 228, r: 92 }]
  const N = 15
  for (let k = 0; k < N; k++) {
    const a = (k / N) * TAU + 0.2
    c.push({ x: 200 + Math.cos(a) * 92, y: 232 + Math.sin(a) * 78, r: 30 + (k % 2 ? 7 : 0), a })
  }
  return c
}

const RINGS = [
  { rx: 196, ry: 64, rot: -26, sp: 0.55, off: 0.4, n: 2 },
  { rx: 186, ry: 60, rot: 38, sp: -0.42, off: 2.2, n: 2 },
  { rx: 200, ry: 52, rot: 92, sp: 0.34, off: 4.0, n: 1 },
]
export const VB = { x: -50, y: -20, w: 500, h: 470 }
const CX = 200, CY = 228
const BURST_N = 14

// z-depth (px) of every layer inside the perspective container
// Layers are only a few px apart: the front and back halves of each ring must stay joined when IO tilts (big gaps made the rings look cut)
// kept very close together on purpose: the two halves of every ring live in different layers and must still meet when IO tilts
const Z = { back: -4, ant: -2, body: 0, face: 3, front: 6, spark: 10 }

function eye(side) { // side: -1 left, +1 right
  const lash = side < 0 ? 'M-25 -10 q-7 -3 -11 -11 M-26 -2 q-8 0 -12 -5' : 'M25 -10 q7 -3 11 -11 M26 -2 q8 0 12 -5'
  return `
    <ellipse rx="26.5" ry="32.5" fill="#0c1547"/>
    <g data-k="iris${side}">
      <ellipse rx="23" ry="29.5" fill="url(#io-iris)"/>
      <ellipse cx="0" cy="-1" rx="11.5" ry="16" fill="#0a1240"/>
      <path d="M-15 15 Q0 27 15 15" fill="none" stroke="#c4efff" stroke-width="3.2" stroke-linecap="round" opacity=".55"/>
    </g>
    <circle cx="-8" cy="-12.5" r="9.6" fill="#fff"/>
    <circle cx="9.5" cy="12" r="4.4" fill="#fff" opacity=".95"/><circle cx="-12" cy="8" r="2" fill="#bff6ff"/><circle cx="3" cy="19" r="1.8" fill="#ffd2f5"/><circle cx="14" cy="-9" r="1.8" fill="#bff6ff"/>
    <path d="${sparkle(12, -3, 5.5)}" fill="#fff" opacity=".9"/>
    <path d="${lash}" fill="none" stroke="#0c1547" stroke-width="3.2" stroke-linecap="round"/>`
}

export function mascotMarkup() {
  const circles = bodyCircles()
  const clipC = circles.map((c) => `<circle cx="${f1(c.x)}" cy="${f1(c.y)}" r="${f1(c.r)}"/>`).join('')
  const fillC = circles.map((c) => `<circle cx="${f1(c.x)}" cy="${f1(c.y)}" r="${f1(c.r)}"/>`).join('')
  // fur tufts on the outline
  let tufts = ''
  circles.slice(1).forEach((c, i) => {
    for (const da of [-0.5, 0, 0.5]) {
      const a = c.a + da * 0.6
      const x0 = c.x + Math.cos(a) * (c.r - 3), y0 = c.y + Math.sin(a) * (c.r - 3)
      const len = 8 + ((i * 7 + (da > 0 ? 3 : 0)) % 5)
      const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len
      const nx = -Math.sin(a) * 3.5 * (da > 0 ? 1 : -1)
      tufts += `<path d="M${f1(x0)} ${f1(y0)} Q${f1((x0 + x1) / 2 + nx)} ${f1((y0 + y1) / 2)} ${f1(x1)} ${f1(y1)}" />`
    }
  })

  // dense fur strands (seeded), flowing around the body centre
  let fur = ''
  let seed = 7
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  for (let i = 0; i < 260; i++) {
    const a = rnd() * TAU, rr = Math.sqrt(rnd()) * 128
    const x = 200 + Math.cos(a) * rr * 1.08, y = 232 + Math.sin(a) * rr * 0.92
    const dir = a + Math.PI / 2 + (rnd() - 0.5) * 1.1
    const len = 10 + rnd() * 16
    const x1 = x + Math.cos(dir) * len, y1 = y + Math.sin(dir) * len
    const cx = (x + x1) / 2 - Math.sin(dir) * (rnd() - 0.5) * 9, cy = (y + y1) / 2 + Math.cos(dir) * (rnd() - 0.5) * 9
    fur += `<path d="M${f1(x)} ${f1(y)} Q${f1(cx)} ${f1(cy)} ${f1(x1)} ${f1(y1)}" stroke="${rnd() > 0.55 ? '#ffffff' : '#bccbef'}" stroke-opacity="${(0.35 + rnd() * 0.4).toFixed(2)}"/>`
  }
  const curl = `<path d="M176 156 C176 128 220 122 226 150 C230 172 200 180 192 164 C186 152 202 144 208 154" fill="none" stroke="#c9d6f7" stroke-width="5" stroke-linecap="round"/><path d="M176 156 C176 128 220 122 226 150 C230 172 200 180 192 164 C186 152 202 144 208 154" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" transform="translate(-1.5 -2)"/>`
  const ringArc = (r, front) => {
    // each half runs a little past the join points so the two halves overlap and the loop reads as one closed ring
    const o = 0.2
    const t0 = front ? -o : Math.PI - o
    const t1 = front ? Math.PI + o : TAU + o
    const P = (t) => `${f1(r.rx * Math.cos(t))} ${f1(r.ry * Math.sin(t))}`
    const d = `M${P(t0)} A${r.rx} ${r.ry} 0 1 1 ${P(t1)}`
    return `<g transform="translate(${CX} ${CY}) rotate(${r.rot})"><path d="${d}" fill="none" stroke="#9fe8ff" stroke-opacity=".35" stroke-width="13" stroke-linecap="butt" filter="url(#io-blur2)"/><path d="${d}" fill="none" stroke="url(#io-ring)" stroke-width="6" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.8" stroke-linecap="round" transform="translate(0 -1.6)"/></g>`
  }
  const ringsBack = RINGS.map((r) => ringArc(r, false)).join('')
  const ringsFront = RINGS.map((r) => ringArc(r, true)).join('')
  let nodes = ''
  RINGS.forEach((r, i) => { for (let k = 0; k < r.n; k++) nodes += `<g data-k="node-${i}-${k}"><circle r="26" fill="url(#io-halo)"/><circle r="14.5" fill="url(#io-bead)" stroke="#e9f6ff" stroke-opacity=".9" stroke-width="2"/><ellipse cx="-4.5" cy="-6" rx="5.2" ry="3" fill="#fff" opacity=".9" transform="rotate(-35 -4.5 -6)"/><circle cx="5" cy="6" r="2.2" fill="#fff" opacity=".75"/><path d="M-9 6 Q0 15 9 8" fill="none" stroke="#ff9fe4" stroke-width="2" opacity=".7" stroke-linecap="round"/></g>` })
  const L = (k, z, inner) => `<svg data-k="${k}" viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" width="${VB.w}" height="${VB.h}" style="position:absolute;left:0;top:0;overflow:visible;display:block;transform:translateZ(${z}px);will-change:transform" aria-hidden="true">${inner}</svg>`

  const defs = `
  <defs>
    <clipPath id="io-clip">${clipC}</clipPath>
    <radialGradient id="io-body" gradientUnits="userSpaceOnUse" cx="160" cy="165" r="230"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#f6f8ff"/><stop offset=".7" stop-color="#d9e3fb"/><stop offset="1" stop-color="#a9b9ea"/></radialGradient>
    <radialGradient id="io-halo"><stop offset="0" stop-color="#c9f6ff" stop-opacity=".95"/><stop offset=".45" stop-color="#4fb8ff" stop-opacity=".42"/><stop offset="1" stop-color="#4fb8ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="io-aura"><stop offset="0" stop-color="#7fd0ff" stop-opacity=".55"/><stop offset=".6" stop-color="#3f86ff" stop-opacity=".18"/><stop offset="1" stop-color="#3f86ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="io-bead" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".35" stop-color="#d7f3ff" stop-opacity=".28"/><stop offset=".75" stop-color="#b9d4ff" stop-opacity=".28"/><stop offset="1" stop-color="#ffb8ee" stop-opacity=".7"/></radialGradient>
    <linearGradient id="io-ring" x1="0" x2="1"><stop offset="0" stop-color="#6ff0ff"/><stop offset=".3" stop-color="#d6c2ff"/><stop offset=".55" stop-color="#ffffff"/><stop offset=".78" stop-color="#ffa6e8"/><stop offset="1" stop-color="#7fdcff"/></linearGradient>
    <radialGradient id="io-iris" cx="50%" cy="80%" r="90%"><stop offset="0" stop-color="#a6f4ff"/><stop offset=".35" stop-color="#4f8cff"/><stop offset=".75" stop-color="#2d3cc0"/><stop offset="1" stop-color="#171a70"/></radialGradient>
    <linearGradient id="io-star" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#bfeaff"/><stop offset=".7" stop-color="#e7c8ff"/><stop offset="1" stop-color="#fff"/></linearGradient>
    <linearGradient id="io-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c4"/><stop offset="1" stop-color="#ffc02e"/></linearGradient>
    <linearGradient id="io-limb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c3d1f3"/></linearGradient>
    <linearGradient id="io-bow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#78b4ff"/><stop offset="1" stop-color="#2c63dc"/></linearGradient>
    <filter id="io-fluff" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="13" xChannelSelector="R" yChannelSelector="G"/></filter>
    <filter id="io-blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
    <filter id="io-blur2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.2"/></filter>
    <filter id="io-cotton" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="9"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 -.35"/></filter>
  </defs>`

  const back = `${defs}
    <ellipse data-k="aura" cx="${CX}" cy="${CY + 4}" rx="215" ry="190" fill="url(#io-aura)"/>
        <g>${ringsBack}</g>
    <g data-k="nodes-back">${nodes}</g>`

  const ant = (side) => {
    const x0 = 200 + side * 32, bx = 200 + side * 50
    return `<g data-k="ant${side}">
      <path d="M${x0 - 0} 150 C${200 + side * 14} 120 ${200 + side * 52} 100 ${bx + side * 2} 80" fill="none" stroke="#dfe8ff" stroke-width="6.5" stroke-linecap="round"/>
      <path d="M${x0 - 0} 150 C${200 + side * 14} 120 ${200 + side * 52} 100 ${bx + side * 2} 80" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" transform="translate(-1.5 -1)"/>
      <circle cx="${bx + side * 2}" cy="62" r="34" fill="url(#io-halo)" opacity=".8"/>
      <path d="${star(bx + side * 2, 62, 24, 10.5)}" fill="url(#io-star)" stroke="#b9e6ff" stroke-width="2.8" stroke-linejoin="round"/>
      <path d="${star(bx + side * 2, 62, 13, 5.5)}" fill="#fff" opacity=".85"/>
    </g>`
  }
  const antL = ant(-1), antR = ant(1)
  const armL = `<g data-k="armL" transform="translate(110 252) rotate(20)"><rect x="-4" y="-10" width="40" height="20" rx="10" fill="url(#io-limb)" stroke="#dbe6fb" stroke-width="2.4" transform="scale(-1 1)"/><circle cx="-36" cy="0" r="12" fill="#e6eefc" stroke="#dbe6fb" stroke-width="2.4"/><circle cx="-38" cy="-3" r="4.5" fill="#fff" opacity=".55"/></g>`
  const armR = `<g data-k="armR" transform="translate(288 248) rotate(-34)"><rect x="-6" y="-11" width="48" height="22" rx="11" fill="url(#io-limb)" stroke="#dbe6fb" stroke-width="2.4"/><rect x="-2" y="-8" width="30" height="5" rx="2.5" fill="#fff" opacity=".4"/><circle cx="44" cy="0" r="14" fill="#eef3ff" stroke="#dbe6fb" stroke-width="2.4"/><ellipse cx="40" cy="-4" rx="6" ry="4" fill="#fff" opacity=".6"/><ellipse cx="52" cy="-12" rx="5" ry="6.5" fill="#eef3ff" stroke="#d6efff" stroke-width="2.2" transform="rotate(25 52 -12)"/><g stroke="#e9f7ff" stroke-width="2.6" stroke-linecap="round" opacity=".9"><path d="M62 -10 l9 -6"/><path d="M64 0 l12 0"/><path d="M62 10 l9 6"/></g></g>`

  const body = `
    <g filter="url(#io-fluff)">
      <g fill="#e2f6ff" opacity=".9" filter="url(#io-blur2)">${circles.map((c) => `<circle cx="${f1(c.x)}" cy="${f1(c.y)}" r="${f1(c.r + 4)}"/>`).join('')}</g>
      <g fill="url(#io-body)">${fillC}</g>
      <g clip-path="url(#io-clip)">
        <ellipse cx="262" cy="338" rx="150" ry="60" fill="#7f93d6" opacity=".55" filter="url(#io-blur)"/>
        <ellipse cx="330" cy="240" rx="52" ry="120" fill="#8fe6ff" opacity=".35" filter="url(#io-blur)"/>
        <ellipse cx="150" cy="150" rx="78" ry="46" fill="#fff" opacity=".6" filter="url(#io-blur)"/>
        <ellipse cx="205" cy="278" rx="62" ry="36" fill="#fff" opacity=".35" filter="url(#io-blur)"/>
        <rect x="30" y="80" width="340" height="300" filter="url(#io-cotton)" opacity=".18"/>
        <g fill="none" stroke-linecap="round" stroke-width="2.6">${fur}</g>
        ${curl}
      </g>
    </g>
    <g fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity=".9">${tufts}</g>
    <g fill="#fff"><ellipse cx="142" cy="150" rx="22" ry="11" opacity=".75" transform="rotate(-24 142 150)"/><circle cx="108" cy="188" r="5" opacity=".7"/></g>`

  const face = `
    <g data-k="face">
      <ellipse cx="128" cy="268" rx="26" ry="16" fill="#ff7fae" opacity=".55" filter="url(#io-blur2)"/>
      <ellipse cx="272" cy="268" rx="26" ry="16" fill="#ff7fae" opacity=".55" filter="url(#io-blur2)"/>
      <g fill="#fff" opacity=".6"><ellipse cx="130" cy="262" rx="5" ry="2.4"/><ellipse cx="262" cy="262" rx="5" ry="2.4"/></g>
      <g data-k="eyeL" transform="translate(163 226)">${eye(-1)}</g>
      <g data-k="eyeR" transform="translate(237 226)">${eye(1)}</g>
      <path data-k="smile" d="M187 264 q6.5 10 13 0 q6.5 10 13 0" fill="none" stroke="#1a2f86" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
      <g data-k="mouth" opacity="0"><ellipse cx="200" cy="268" rx="10" ry="8" fill="#1a2f86"/><ellipse cx="200" cy="273" rx="6" ry="3.4" fill="#ff7aa8"/></g>
    </g>
    `

  const front = `
    <g opacity=".2">${ringsBack}</g>  <!-- faint ghost of the back half so the orbit never seems to vanish behind the body -->
    <g>${ringsFront}</g>
    <g data-k="nodes-front"></g>
    ${armR}`
  const SP = [[10, 70, 9], [395, 120, 7], [30, 330, 6], [378, 330, 10], [340, 30, 6], [60, 20, 5], [420, 230, 5], [-10, 200, 5]]
  const sparks = `<g fill="#fff" data-k="sparkles">${SP.map((s) => `<path d="${sparkle(s[0], s[1], s[2])}" opacity=".8"/>`).join('')}</g>
    <g data-k="burst" opacity="0">${Array.from({ length: BURST_N }, (_, i) => `<path d="${i % 3 === 0 ? star(0, 0, 15, 6.2) : sparkle(0, 0, 13)}" fill="${i % 3 === 0 ? '#ffe27a' : i % 3 === 1 ? '#bff4ff' : '#ffc4ee'}"/>`).join('')}</g>`

  return `<div data-k="tilt" style="position:relative;width:${VB.w}px;height:${VB.h}px;transform-style:preserve-3d;will-change:transform">
    ${L('L0', Z.back, back)}${L('L1', Z.ant, antL + antR + armL)}${L('L2', Z.body, body)}${L('L3', Z.face, face)}${L('L4', Z.front, front)}${L('L5', Z.spark, sparks)}
  </div>`
}

export function createMascot(host) {
  host.innerHTML = mascotMarkup()
  const $ = (k) => host.querySelector(`[data-k="${k}"]`)
  const el = {
    tilt: $('tilt'), L2: $('L2'), L3: $('L3'), L4: $('L4'), aura: $('aura'),
    antL: $('ant-1'), antR: $('ant1'), armR: $('armR'), armL: $('armL'), eyeL: $('eyeL'), eyeR: $('eyeR'),
    irisL: $('iris-1'), irisR: $('iris1'), smile: $('smile'), mouth: $('mouth'), face: $('face'),
    nodesBack: $('nodes-back'), nodesFront: $('nodes-front'), sparkles: $('sparkles'), burst: $('burst'),
  }
  const nodes = []
  RINGS.forEach((r, i) => { for (let k = 0; k < r.n; k++) nodes.push({ g: host.querySelector(`[data-k="node-${i}-${k}"]`), r, i, k }) })
  const sp = [...el.sparkles.children]
  const bursts = [...el.burst.children]
  const st = { spin: 0, blink: 0, nextBlink: 2.2, wave: 0, appear: 0, look: { x: 0, y: 0 }, lean: 0, bounce: 0, yawn: 0, excite: 0, pop: 0, burstT: 0, burstId: 0 }

  /** p: { appear:0..1, talk:0..1, vel: scroll speed, pointer:{x,y} -1..1, wave:0..1,
   *       idle: seconds since the visitor did anything, excite: 0..1 (hovering something interesting), burstId: bump it to fire a sparkle burst } */
  function frame(dt, t, p) {
    dt = Math.min(dt, 0.05)
    st.appear = damp(st.appear, p.appear, 5, dt)
    const run = clamp(p.vel / 1.2, 0, 1)
    const idle = p.idle || 0
    st.spin += dt * (0.5 + run * 2.6 + (idle > 24 ? 1.6 : 0)) // after a long while the rings twirl by themselves
    // yawn every ~10 s once the visitor has been still for a while
    let yawnTarget = 0
    if (idle > 9 && p.talk < 0.1) { const ph = (idle - 9) % 10; if (ph < 2.8) yawnTarget = Math.sin((Math.PI * ph) / 2.8) }
    st.yawn = damp(st.yawn, yawnTarget, 10, dt)
    st.excite = damp(st.excite, p.excite || 0, 8, dt)
    if (p.burstId !== undefined && p.burstId !== st.burstId) { st.burstId = p.burstId; st.burstT = 0.0001; st.pop = 1 }
    st.pop = damp(st.pop, 0, 7, dt)
    st.look.x = damp(st.look.x, p.pointer.x, 6, dt)
    st.look.y = damp(st.look.y, p.pointer.y, 6, dt)
    st.lean = damp(st.lean, run, 4, dt)
    st.bounce = damp(st.bounce, p.talk, 10, dt)

    // 3D tilt toward the pointer (a bit forward when travelling fast), gentle idle sway
    const ry = st.look.x * 17 + Math.sin(t * 0.9) * 2.2
    const rx = -st.look.y * 11 + st.lean * 9 + Math.cos(t * 0.7) * 1.6 - st.yawn * 7
    el.tilt.style.transform = `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`

    // breathing / talking bounce on the (static, filtered) body layer: a plain CSS transform, so no re-rasterising
    const br = Math.sin(t * 2.1)
    const sq = 1 + br * 0.018 + st.bounce * 0.012 * Math.sin(t * 16) + st.pop * 0.07 * Math.sin(st.burstT * 18 + 1.2) + st.yawn * 0.02
    el.L2.style.transform = `translateZ(${Z.body}px) scale(${sq.toFixed(4)}, ${(2 - sq).toFixed(4)})`
    el.L2.style.transformOrigin = `${CX - VB.x}px ${CY + 30 - VB.y}px`
    el.aura.setAttribute('opacity', (0.8 + 0.2 * Math.sin(t * 1.6) + p.talk * 0.25).toFixed(2))

    // antennae sway (trail back when travelling)
    const sway = Math.sin(t * 2.4) * 5 + run * 9
    el.antL.setAttribute('transform', `rotate(${(-sway * 0.9).toFixed(2)} 168 150)`)
    el.antR.setAttribute('transform', `rotate(${(sway * 0.8).toFixed(2)} 232 150)`)

    // eyes: blink, squint when fast, irises look at the pointer
    st.nextBlink -= dt
    if (st.nextBlink < 0) { st.blink = 0.14; st.nextBlink = 2.4 + ((t * 7.3) % 2.6) }
    st.blink = Math.max(0, st.blink - dt)
    const bl = (st.blink > 0 ? 0.1 : 1 - run * 0.22) * (1 - 0.88 * st.yawn) * (1 + 0.1 * st.excite)
    const bx = 1 + 0.06 * st.excite
    const lx = st.look.x * 5.5, ly = -st.look.y * 4.5
    el.eyeL.setAttribute('transform', `translate(163 226) scale(${bx.toFixed(3)} ${bl.toFixed(3)})`)
    el.eyeR.setAttribute('transform', `translate(237 226) scale(${bx.toFixed(3)} ${bl.toFixed(3)})`)
    el.irisL.setAttribute('transform', `translate(${lx.toFixed(2)} ${ly.toFixed(2)})`)
    el.irisR.setAttribute('transform', `translate(${lx.toFixed(2)} ${ly.toFixed(2)})`)
    el.face.setAttribute('transform', `translate(${(st.look.x * 5).toFixed(2)} ${(-st.look.y * 3.5).toFixed(2)})`)

    // mouth: talking, yawning (big slow oval) or a small "ooh" when something interesting is hovered
    const talkOpen = p.talk * (0.35 + 0.65 * Math.abs(Math.sin(t * 13)) * (0.6 + 0.4 * Math.sin(t * 5.1)))
    const open = Math.max(talkOpen, 0.5 * st.excite, 1.15 * st.yawn)
    const showMouth = p.talk > 0.15 || st.yawn > 0.06 || st.excite > 0.15
    el.mouth.setAttribute('opacity', showMouth ? '1' : '0')
    el.mouth.setAttribute('transform', `translate(200 268) scale(${(1 + 0.35 * st.yawn).toFixed(3)} ${(0.25 + open).toFixed(3)}) translate(-200 -268)`)
    el.smile.setAttribute('opacity', showMouth ? '0' : '1')

    // waving arm
    const periodic = (t % 9) < 1.8 ? 1 : 0
    st.wave = damp(st.wave, clamp(Math.max(p.wave, p.talk, periodic * 0.8 * (1 - st.yawn), st.excite * 0.6), 0, 1), 6, dt)
    const ang = -34 - st.wave * 18 + Math.sin(t * 9) * 16 * st.wave + Math.sin(t * 1.8) * 3
    el.armR.setAttribute('transform', `translate(288 248) rotate(${ang.toFixed(2)})`)
    el.armL.setAttribute('transform', `translate(110 252) rotate(${(20 + Math.sin(t * 1.6 + 1) * 4).toFixed(2)})`)

    // beads ride the rings; front-half beads live in the front layer, back-half in the back layer
    for (const n of nodes) {
      const a = n.r.off + st.spin * n.r.sp * 1.6 + n.k * Math.PI
      const ex = Math.cos(a) * n.r.rx, ey = Math.sin(a) * n.r.ry
      const cr = Math.cos((n.r.rot * Math.PI) / 180), sr = Math.sin((n.r.rot * Math.PI) / 180)
      const x = CX + ex * cr - ey * sr, y = CY + ex * sr + ey * cr
      const front = Math.sin(a) > 0
      const layer = front ? el.nodesFront : el.nodesBack
      if (n.g.parentNode !== layer) layer.appendChild(n.g)
      const pulse = 0.92 + 0.16 * Math.sin(t * 3 + n.i + n.k)
      n.g.setAttribute('transform', `translate(${f1(x)} ${f1(y)}) scale(${(pulse * (front ? 1.1 : 0.88)).toFixed(3)})`)
    }
    sp.forEach((s, i) => s.setAttribute('opacity', clamp(0.15 + 0.85 * Math.max(0, Math.sin(t * 2.2 + i * 1.7)) + st.excite * 0.3, 0, 1).toFixed(2)))

    // click burst: stars fly outward and fade
    if (st.burstT > 0) {
      st.burstT += dt
      const k = st.burstT / 1.1
      if (k >= 1) { st.burstT = 0; el.burst.setAttribute('opacity', '0') } else {
        el.burst.setAttribute('opacity', (1 - k * k).toFixed(2))
        const e = 1 - Math.pow(1 - k, 3)
        bursts.forEach((b, i) => {
          const a = (i / BURST_N) * TAU + 0.3
          const d = 50 + (110 + (i % 3) * 28) * e
          b.setAttribute('transform', `translate(${f1(CX + Math.cos(a) * d)} ${f1(CY - 24 + Math.sin(a) * d * 0.85)}) rotate(${f1(k * 200 * (i % 2 ? 1 : -1))}) scale(${(1.1 - k * 0.7).toFixed(2)})`)
        })
      }
    }
  }
  return { frame, state: st }
}

const easeOutBack = (x) => { const c1 = 1.9, c3 = c1 + 1; const t = clamp(x, 0, 1); return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2) }

/** Positions the mascot on screen. io = scrollState.io (x, y in -1..1 of the screen, s = scale), appear 0..1. Returns the radius in px. */
export function place(host, io, W, H, appear, t) {
  const size = clamp((H * 0.8 * io.s) / 1.15, 96, 600) // width of the whole drawing (rings included)
  const k = size / VB.w
  const a = Math.max(0.001, easeOutBack(appear))
  const cx = ((1 + io.x) / 2) * W
  const cy = ((1 - io.y) / 2) * H + Math.sin(t * 1.3) * 6 * k
  host.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0) scale(${(k * a).toFixed(4)}) translate(${-(CX - VB.x)}px, ${-(CY - VB.y)}px)`
  host.style.opacity = clamp(appear * 1.6, 0, 1).toFixed(3)
  return size * 0.3
}
