import { useEffect, useRef } from 'react'

const PHONE = () => window.innerWidth < 768
const rnd = (a, b) => a + Math.random() * (b - a)
const ease = (t) => 1 - Math.pow(1 - t, 3)
const COLORS = ['0,240,255', '47,123,255', '255,255,255']

/**
 * Nanobots for the toolkit: a few dozen tiny arrow-shaped bots drift through the section like dust in space. Now and then
 * (or when you hover a card) a squad of them swarms to a tool card, lines up along its edge and a selection frame with
 * handles snaps around it, then they scatter again. A 2D canvas over the section (pointer-events: none), drawn only while
 * the section is on screen. Cards are found by their `data-bot="Name"` attribute.
 */
export default function NanoSwarm() {
  const canvas = useRef(null)

  useEffect(() => {
    const cv = canvas.current
    const host = cv.parentElement
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const ctx = cv.getContext('2d')
    const touch = window.matchMedia?.('(hover: none)').matches
    const N = PHONE() ? 28 : 64
    const K = PHONE() ? 10 : 18 // bots in a squad
    let W = 0, H = 0, dpr = 1
    let visible = false
    let raf = 0
    let last = 0
    const ptr = { x: -999, y: -999 }
    const bots = Array.from({ length: N }, () => ({
      x: 0, y: 0, vx: rnd(-0.4, 0.4), vy: rnd(-0.4, 0.4), c: COLORS[Math.random() < 0.5 ? 0 : Math.random() < 0.6 ? 1 : 2],
      s: rnd(0.8, 1.35), ph: rnd(0, 100), slot: -1, u: 0,
    }))
    let cards = []
    let sel = null // { el, name, t0, out, squad: [bot] }
    let nextAt = 1.2 // when the next automatic scan starts
    let autoIdx = 0

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, PHONE() ? 1 : 1.5)
      W = host.clientWidth
      H = host.clientHeight
      cv.width = Math.round(W * dpr)
      cv.height = Math.round(H * dpr)
      cv.style.width = `${W}px`
      cv.style.height = `${H}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      for (const b of bots) if (!b.x) { b.x = rnd(0, W); b.y = rnd(0, H) }
    }
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    resize()

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame) }
    })
    io.observe(host)
    const onMove = (e) => { ptr.x = e.clientX; ptr.y = e.clientY }
    window.addEventListener('pointermove', onMove, { passive: true })

    // a point on the outline of a rectangle, u in 0..1 going clockwise from the top-left corner
    const onRect = (r, u) => {
      const w = r.w, h = r.h, per = 2 * (w + h)
      let d = (((u % 1) + 1) % 1) * per
      if (d < w) return [r.x + d, r.y]
      d -= w
      if (d < h) return [r.x + w, r.y + d]
      d -= h
      if (d < w) return [r.x + w - d, r.y + h]
      d -= w
      return [r.x, r.y + h - d]
    }
    const rectOf = (el, pad) => {
      const a = el.getBoundingClientRect(), b = cv.getBoundingClientRect()
      return { x: a.left - b.left - pad, y: a.top - b.top - pad, w: a.width + pad * 2, h: a.height + pad * 2 }
    }

    const select = (el, t) => {
      // the K bots nearest to the card form the squad
      const r = rectOf(el, 0)
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2
      const squad = [...bots].sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy)).slice(0, K)
      squad.forEach((b, i) => { b.slot = i; b.u = (i + 0.5) / K })
      sel = { el, name: el.dataset.bot || '', t0: t, out: 0, squad }
    }
    const release = () => {
      if (!sel) return
      for (const b of sel.squad) { b.slot = -1; b.vx += rnd(-1.4, 1.4); b.vy += rnd(-1.4, 1.4) } // scatter
      sel = null
    }

    function frame(now) {
      raf = 0
      if (!visible || document.hidden) return
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const k = dt * 60
      const t = now / 1000
      cards = [...host.querySelectorAll('[data-bot]')]

      // which card is hovered (mouse only)?
      let hover = null
      if (!touch) for (const el of cards) {
        const a = el.getBoundingClientRect()
        if (ptr.x > a.left && ptr.x < a.right && ptr.y > a.top && ptr.y < a.bottom) { hover = el; break }
      }
      if (hover && (!sel || sel.el !== hover)) { release(); select(hover, t) }
      else if (!hover && sel && sel.hovered) release()
      if (hover && sel) sel.hovered = true
      // automatic scans: one card at a time, every few seconds
      if (!sel && t > nextAt && cards.length) {
        const vis = cards.filter((el) => { const a = el.getBoundingClientRect(); return a.bottom > 40 && a.top < window.innerHeight - 40 })
        if (vis.length) { select(vis[autoIdx++ % vis.length], t); sel.hovered = false }
      } else if (sel && !sel.hovered && t - sel.t0 > 2.8) {
        release()
        nextAt = t + 1.1
      }

      ctx.clearRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'lighter'

      // the bots
      const cb = cv.getBoundingClientRect()
      const px = ptr.x - cb.left, py = ptr.y - cb.top
      for (const b of bots) {
        if (b.slot >= 0 && sel) {
          // in the squad: slide along the card's outline
          b.u += 0.0006 * k
          const [tx, ty] = onRect(rectOf(sel.el, 7), b.u)
          b.vx += (tx - b.x) * 0.045 * k
          b.vy += (ty - b.y) * 0.045 * k
          b.vx *= Math.pow(0.8, k)
          b.vy *= Math.pow(0.8, k)
        } else {
          // free: wander on a slow flow field
          const a = Math.sin(b.x * 0.004 + t * 0.25 + b.ph) * 2.4 + Math.cos(b.y * 0.005 - t * 0.2 + b.ph * 0.7) * 2.4
          b.vx += Math.cos(a) * 0.035 * k
          b.vy += Math.sin(a) * 0.035 * k
          const dx = b.x - px, dy = b.y - py, d = Math.hypot(dx, dy)
          if (!touch && d < 80 && d > 0.1) { b.vx += (dx / d) * 0.12 * k; b.vy += (dy / d) * 0.12 * k } // shy of the cursor
          const sp = Math.hypot(b.vx, b.vy)
          const max = 1.15
          if (sp > max) { b.vx *= 1 - (1 - max / sp) * Math.min(1, 0.1 * k); b.vy *= 1 - (1 - max / sp) * Math.min(1, 0.1 * k) }
          b.vx *= Math.pow(0.992, k)
          b.vy *= Math.pow(0.992, k)
        }
        b.x += b.vx * k
        b.y += b.vy * k
        if (b.slot < 0) { // wrap around the edges
          if (b.x < -12) b.x = W + 12
          else if (b.x > W + 12) b.x = -12
          if (b.y < -12) b.y = H + 12
          else if (b.y > H + 12) b.y = -12
        }
        const ang = Math.atan2(b.vy, b.vx)
        const sp = Math.hypot(b.vx, b.vy)
        const s = b.s * (b.slot >= 0 ? 1.15 : 1)
        // faint glow and a short trail
        ctx.fillStyle = `rgba(${b.c},0.07)`
        ctx.beginPath(); ctx.arc(b.x, b.y, 7 * s, 0, 6.2832); ctx.fill()
        if (sp > 0.25) {
          ctx.strokeStyle = `rgba(${b.c},${Math.min(0.35, sp * 0.2)})`
          ctx.lineWidth = 1
          ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 7, b.y - b.vy * 7); ctx.stroke()
        }
        // the bot: a tiny arrow, like a cursor
        const c = Math.cos(ang), n = Math.sin(ang)
        const P = (x, y) => [b.x + (x * c - y * n) * s, b.y + (x * n + y * c) * s]
        const p0 = P(4.6, 0), p1 = P(-3.2, 2.9), p2 = P(-1.4, 0), p3 = P(-3.2, -2.9)
        ctx.fillStyle = `rgba(${b.c},0.92)`
        ctx.beginPath(); ctx.moveTo(...p0); ctx.lineTo(...p1); ctx.lineTo(...p2); ctx.lineTo(...p3); ctx.closePath(); ctx.fill()
      }

      // the selection frame: snaps in around the card once the squad has arrived
      if (sel) {
        const p = ease(Math.min(1, (t - sel.t0) / 0.55))
        const r = rectOf(sel.el, 6 + (1 - p) * 16)
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = p
        ctx.strokeStyle = 'rgba(0,240,255,0.55)'
        ctx.lineWidth = 1
        ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.w, r.h)
        // handles on the four corners
        ctx.fillStyle = '#0a0a0a'
        ctx.strokeStyle = '#00f0ff'
        for (const [hx, hy] of [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]]) {
          ctx.fillRect(hx - 3, hy - 3, 7, 7)
          ctx.strokeRect(hx - 2.5, hy - 2.5, 6, 6)
        }
        // name tag, like a design tool
        if (sel.name) {
          ctx.font = '500 10px "JetBrains Mono", ui-monospace, monospace'
          const label = sel.name.toUpperCase()
          const tw = ctx.measureText(label).width + 14
          ctx.fillStyle = '#00f0ff'
          ctx.fillRect(r.x, r.y - 20, tw, 16)
          ctx.fillStyle = '#031014'
          ctx.fillText(label, r.x + 7, r.y - 8)
        }
        ctx.globalAlpha = 1
      }
      ctx.globalCompositeOperation = 'source-over'
      raf = requestAnimationFrame(frame)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return <canvas ref={canvas} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-[6]" />
}
