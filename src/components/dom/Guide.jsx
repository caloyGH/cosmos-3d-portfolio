import { useEffect, useRef } from 'react'
import { scrollState } from '../../store/scroll'
import { GUIDE } from '../../data/profile'
import cat from '../../assets/cat.webp'

const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b)
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// where the cat sits: [scroll pos, x (vw, centre of the cat), facing]  facing: +1 = looks left, -1 = looks right
const PATH = [
  [0.0, 44, -1], // hero: next to you, looking your way
  [0.3, 44, -1],
  [0.4, 84, 1], // story: you step left, the cat trots to the right edge
  [0.62, 84, 1],
  [0.85, 58, 1],
  [1.0, 56, 1], // about
  [2.0, 86, 1], // work
  [3.0, 91, 1], // stack
  [4.0, 84, 1], // contact
]
function at(p) {
  if (p <= PATH[0][0]) return [PATH[0][1], PATH[0][2]]
  for (let i = 1; i < PATH.length; i++) {
    if (p <= PATH[i][0]) {
      const [a, xa, fa] = PATH[i - 1]
      const [b, xb, fb] = PATH[i]
      const t = smooth(a, b, p)
      return [xa + (xb - xa) * t, fa + (fb - fa) * smooth(0.35, 0.65, (p - a) / (b - a))]
    }
  }
  const l = PATH[PATH.length - 1]
  return [l[1], l[2]]
}

/**
 * Your black cat, cut out of a photo, follows you down the page: it sits next to the content,
 * trots (a little hop) to a new spot at every section and turns to face whatever you are reading.
 * Photo: src/assets/cat.webp.  Turn it off or name it in data/profile.js (GUIDE).
 */
export default function Guide() {
  const wrap = useRef(null)
  const flip = useRef(null)
  const body = useRef(null)
  const label = useRef(null)

  useEffect(() => {
    if (!GUIDE.enabled) return
    const m = { x: 44, f: -1, mx: 0.5, lift: 0, a: 0 }
    const onMove = (e) => (m.mx = e.clientX / window.innerWidth)
    window.addEventListener('pointermove', onMove, { passive: true })

    const t00 = performance.now()
    let t0 = t00
    let raf
    const loop = (now) => {
      const dt = Math.min((now - t0) / 1000, 0.05)
      t0 = now
      // the photo cat is shown when mode is 'photo', or as a fallback when the 3D running cat cannot start
      if (GUIDE.mode !== 'photo' && !scrollState.catFallback) {
        if (wrap.current) wrap.current.style.opacity = '0'
        t0 = now
        raf = requestAnimationFrame(loop)
        return
      }
      const calm = reduced()
      const [tx, tf] = at(scrollState.pos)
      const prev = m.x
      m.x += (tx - m.x) * (1 - Math.exp(-3.2 * dt))
      m.f += (tf - m.f) * (1 - Math.exp(-7 * dt))
      const speed = dt > 0 ? Math.abs(m.x - prev) / dt : 0 // vw / s
      m.lift += ((calm ? 0 : clamp(speed / 14) * 7) - m.lift) * (1 - Math.exp(-8 * dt)) // vh
      m.a += ((clamp((now - t00) / 1000 - 2.4) ) - m.a) * (1 - Math.exp(-2 * dt)) // fade in after the loader

      const t = now / 1000
      const breathe = calm ? 1 : 1 + Math.sin(t * 1.7) * 0.012
      const tilt = calm ? 0 : (m.mx - m.x / 100) * -3 // leans a little towards the cursor
      const sleepy = smooth(3.6, 4.0, scrollState.pos) // settles down at the very end

      if (wrap.current) {
        wrap.current.style.opacity = String(m.a)
        wrap.current.style.transform = `translate3d(${m.x}vw, ${-m.lift}vh, 0)`
      }
      if (flip.current) flip.current.style.transform = `scaleX(${m.f.toFixed(3)})`
      if (body.current) {
        body.current.style.transform = `rotate(${tilt}deg) scale(${1 - sleepy * 0.05}, ${breathe * (1 - sleepy * 0.05)})`
      }
      if (label.current) label.current.style.opacity = String(clamp(1 - m.lift / 3) * 0.9 * m.a) // label only while it sits still
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  if (!GUIDE.enabled) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-0 left-0 z-[2] h-[17vh] w-0 opacity-0 sm:h-[22vh] lg:h-[26vh]"
      ref={wrap}
    >
      <div className="absolute bottom-0 left-0 h-full -translate-x-1/2 will-change-transform" style={{ aspectRatio: '900 / 683' }}>
        {/* soft glow on the floor under the cat */}
        <div className="absolute inset-x-[8%] bottom-[-6%] h-[26%] rounded-full bg-neon/10 blur-3xl" />
        <div ref={flip} className="relative h-full w-full will-change-transform">
          <img
            ref={body}
            src={cat}
            alt=""
            draggable="false"
            style={{ transformOrigin: '50% 100%' }}
            className="h-full w-full select-none object-contain [filter:drop-shadow(0_0_1px_rgba(0,240,255,0.85))_drop-shadow(0_0_18px_rgba(0,240,255,0.22))_brightness(1.3)]"
          />
        </div>
        {GUIDE.name && (
          <span
            ref={label}
            className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.3em] text-neon"
          >
            {GUIDE.name}
          </span>
        )}
      </div>
    </div>
  )
}
