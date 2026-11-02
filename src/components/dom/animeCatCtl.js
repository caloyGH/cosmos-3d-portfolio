import { pose, shapesToPath, earsPath } from './animeCatRig.js'

const TAU = Math.PI * 2
const clamp = (v, a, b) => Math.min(Math.max(v, a), b)
const damp = (x, y, l, dt) => x + (y - x) * (1 - Math.exp(-l * dt))
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }

export const VB = { x: -30, y: 0, w: 290, h: 160 }

export function svgMarkup() {
  return `
<svg viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" width="${VB.w}" height="${VB.h}" style="overflow:visible;display:block" aria-hidden="true">
  <defs>
    <filter id="cat-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.2"/></filter>
    <linearGradient id="cat-fur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1018"/><stop offset="1" stop-color="#04060a"/></linearGradient>
  </defs>
  <g data-k="lines" stroke="#00f0ff" stroke-linecap="round" stroke-width="2.2" opacity="0">
    <line x1="-8" y1="66" x2="-70" y2="66"/><line x1="4" y1="96" x2="-80" y2="96"/><line x1="-2" y1="124" x2="-58" y2="124"/>
  </g>
  <path data-k="glow" fill="#00f0ff" stroke="#00f0ff" stroke-width="5" stroke-linejoin="round" opacity=".55" filter="url(#cat-glow)"/>
  <path data-k="rim" fill="none" stroke="#00f0ff" stroke-width="2.6" stroke-linejoin="round"/>
  <path data-k="fur" fill="url(#cat-fur)"/>
  <path data-k="eye" fill="#9ffcff" style="filter:drop-shadow(0 0 3px #00f0ff)"/>
  <path data-k="pupil" fill="#032a30"/>
  <path data-k="earin" fill="#00f0ff" opacity=".35"/>
</svg>`
}

export function createAnimeCat(host, scrollState) {
  host.innerHTML = svgMarkup()
  const $ = (k) => host.querySelector(`[data-k="${k}"]`)
  const el = { glow: $('glow'), rim: $('rim'), fur: $('fur'), eye: $('eye'), pupil: $('pupil'), earin: $('earin'), lines: $('lines') }
  const st = { y: null, vy: 0, run: 0, phase: 0, dir: 1, face: -1, a: 0, t: 0 }

  function frame(dt, now, W, H) {
    dt = Math.min(dt, 0.05)
    const desktop = W > 900
    const catW = clamp(H * (desktop ? 0.24 : 0.17), 96, 210) // length of the cat in px
    const k = catW / VB.w
    const catH = VB.h * k
    const p = clamp(scrollState.pos / 4, 0, 1)
    const top = catW / 2 + 70, bot = H - catW / 2 - 24
    const wy = top + (bot - top) * p
    const cx = W - catH / 2 - (desktop ? 14 : 6)
    if (st.y === null) st.y = wy
    const prev = st.y
    st.y = damp(st.y, wy, 3.4, dt)
    st.vy = damp(st.vy, (st.y - prev) / Math.max(dt, 1e-3), 12, dt)
    const speed = Math.abs(st.vy)
    st.run = damp(st.run, sstep(18, 260, speed), 6, dt)
    if (speed > 30) st.dir = Math.sign(st.vy)
    st.phase += clamp((speed / (catW * 0.95)) * TAU, 0, 17) * dt
    st.t += dt

    const P = pose(st.phase, st.run, now)
    const d = shapesToPath(P.shapes) + earsPath(P.ears)
    el.glow.setAttribute('d', d)
    el.rim.setAttribute('d', d)
    el.fur.setAttribute('d', d)
    const h = P.head
    // anime eye: almond with slit pupil, squints a little when running
    const sq = 1 - st.run * 0.35
    el.eye.setAttribute('d', `M${h[0] + 0} ${h[1] - 2}q7 ${-7 * sq} 15 -1q-7 ${7 * sq} -15 1z`)
    el.pupil.setAttribute('d', `M${h[0] + 8.2} ${h[1] - 5 * sq}q1.6 ${3.2 * sq} 0 ${6.4 * sq}q-1.6 ${-3.2 * sq} 0 ${-6.4 * sq}z`)
    const e = P.ears
    el.earin.setAttribute('d', e.map((t) => `M${(t[0][0] * 0.7 + t[1][0] * 0.3).toFixed(1)} ${(t[0][1] * 0.7 + t[1][1] * 0.3 + 3).toFixed(1)}L${t[1][0].toFixed(1)} ${(t[1][1] + 6).toFixed(1)}L${(t[2][0] * 0.7 + t[1][0] * 0.3).toFixed(1)} ${(t[2][1] * 0.7 + t[1][1] * 0.3 + 3).toFixed(1)}Z`).join(''))
    // speed lines trail behind the cat
    const wob = 0.6 + 0.4 * Math.sin(now * 38)
    el.lines.setAttribute('opacity', (0.55 * st.run * wob).toFixed(2))

    // orientation: stand upright facing the page when idle; run along the screen edge head-first
    const faceT = st.run > 0.15 ? (st.dir > 0 ? -1 : 1) : -1
    st.face = damp(st.face, faceT, 9, dt)
    const rot = -90 * st.run
    st.a = damp(st.a, now > 2.2 ? 1 : 0, 3, dt)
    host.style.opacity = st.a.toFixed(3)
    host.style.transform = `translate(${(cx - VB.w / 2 - VB.x * 0 ).toFixed(1)}px, ${(st.y - VB.h / 2).toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${(st.face * k).toFixed(3)}, ${k.toFixed(3)})`
  }
  return { frame, state: st }
}
