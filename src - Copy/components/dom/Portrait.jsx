import { useEffect, useRef } from 'react'
import { scrollState } from '../../store/scroll'

// every frame of the turn-around clip (src/assets/turn/t_00.webp ... t_48.webp), cut out of its background
const URLS = Object.entries(import.meta.glob('../../assets/turn/*.webp', { eager: true, query: '?url', import: 'default' }))
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url)

const INTRO_DELAY = 1.7 // s: starts right as the loader fades out
const INTRO_TIME = 4.2 // s: how long the "turn to face you" intro takes

const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b)
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * You, cut out of the video, floating over the 3D scene on the hero.
 * - on load you turn to face the viewer (plays once)
 * - scrolling down plays it in reverse: you turn away, drift sideways and fade out
 * - soft mouse tilt on top
 */
export default function Portrait() {
  const wrap = useRef(null)
  const tilt = useRef(null)
  const canvas = useRef(null)

  useEffect(() => {
    if (!URLS.length) return
    const imgs = URLS.map((u) => {
      const i = new Image()
      i.src = u
      return i
    })
    const last = imgs.length - 1
    const ctx = canvas.current.getContext('2d')
    const m = { x: 0, y: 0, cx: 0, cy: 0 }
    const onMove = (e) => {
      m.x = (e.clientX / window.innerWidth - 0.5) * 2
      m.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('pointermove', onMove, { passive: true })

    const t00 = performance.now()
    let t0 = t00
    let shown = -1
    let raf

    const draw = (idx) => {
      if (idx === shown) return
      const img = imgs[idx]
      if (!img?.complete || !img.naturalWidth) return // not loaded yet, try again next frame
      const c = canvas.current
      if (c.width !== img.naturalWidth) {
        c.width = img.naturalWidth
        c.height = img.naturalHeight
      }
      ctx.clearRect(0, 0, c.width, c.height)
      ctx.drawImage(img, 0, 0)
      shown = idx
    }

    const loop = (now) => {
      const dt = Math.min((now - t0) / 1000, 0.05)
      t0 = now
      const k = 1 - Math.exp(-4 * dt)
      m.cx += (m.x - m.cx) * k
      m.cy += (m.y - m.cy) * k

      const p = scrollState.pos
      const intro = reduced() ? 1 : clamp((now - t00) / 1000 / INTRO_TIME - INTRO_DELAY / INTRO_TIME)
      const scrub = 1 - smooth(0, 0.8, p) // 1 at the top, 0 once you have scrolled away
      draw(Math.round(Math.min(intro, scrub) * last))

      const away = smooth(0, 0.9, p)
      const fade = 1 - smooth(0.2, 0.85, p)
      const float = Math.sin(now / 1800) * 5

      if (wrap.current) {
        wrap.current.style.opacity = String(fade)
        wrap.current.style.visibility = fade < 0.01 ? 'hidden' : 'visible'
        wrap.current.style.transform = `translate3d(${away * 16}vw, ${away * 4}vh, 0) scale(${1 - away * 0.1})`
      }
      if (tilt.current) {
        tilt.current.style.transform = `perspective(1100px) rotateY(${m.cx * 6}deg) rotateX(${-m.cy * 3}deg) translateY(${float}px)`
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      ref={wrap}
      aria-hidden="true"
      className="pointer-events-none fixed bottom-0 right-[-10vw] z-[2] flex h-[74vh] items-end opacity-40 will-change-transform sm:right-[1vw] sm:opacity-100 md:h-[80vh] lg:right-[3vw]"
    >
      {/* soft cyan glow behind the figure */}
      <div className="absolute inset-x-[10%] bottom-[8%] top-[8%] rounded-full bg-neon/15 blur-[90px]" />
      <div
        ref={tilt}
        className="relative h-full will-change-transform [mask-image:linear-gradient(to_top,transparent_0%,#000_20%)] [-webkit-mask-image:linear-gradient(to_top,transparent_0%,#000_20%)]"
      >
        <canvas
          ref={canvas}
          width="640"
          height="659"
          className="h-full w-auto [filter:drop-shadow(0_0_1px_rgba(0,240,255,0.9))_drop-shadow(0_0_22px_rgba(0,240,255,0.26))_brightness(1.1)_contrast(1.05)]"
        />
      </div>
    </div>
  )
}
