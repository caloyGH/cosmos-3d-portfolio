import { useEffect, useRef } from 'react'
import { IO } from '../../data/profile'
import { scrollState } from '../../store/scroll'
import { createMascot, place, VB } from './mascotRig' // (not 'ioMascot': that name collides with IoMascot.jsx on Windows)

/**
 * IO as a cute 2D mascot (SVG). Position and size come from the guide logic in canvas/GuideCore
 * (scrollState.io), so it opens the hero in the centre and then keeps floating beside you as you scroll.
 * Drag IO anywhere if it is in your way (double-click to send it back). Set IO.style = 'orb' in data/profile.js to use the 3D glass orb instead.
 */
export default function IoMascot() {
  if (IO.style !== 'mascot') return null
  return <Inner />
}

function Inner() {
  const host = useRef(null)
  const hit = useRef(null)

  useEffect(() => {
    const el = host.current
    if (!el) return
    const mascot = createMascot(el)
    const pointer = { x: 0, y: 0 }
    const hitEl = hit.current
    const drag = { x: 0, y: 0, on: false, over: false, back: false, sx: 0, sy: 0, ox: 0, oy: 0, moved: 0 }
    const life = { last: performance.now(), card: false, burst: 0 } // last visitor activity, hovering a project card, click-burst counter
    const down = (e) => { drag.on = true; drag.back = false; drag.sx = e.clientX; drag.sy = e.clientY; drag.ox = drag.x; drag.oy = drag.y; hitEl.setPointerCapture?.(e.pointerId); hitEl.style.cursor = 'grabbing'; drag.moved = 0; e.preventDefault() }
    const move = (e) => { if (drag.on) { drag.x = drag.ox + e.clientX - drag.sx; drag.y = drag.oy + e.clientY - drag.sy; drag.moved = Math.max(drag.moved, Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy)) } }
    const up = () => { if (drag.on && drag.moved < 6) life.burst++; drag.on = false; hitEl.style.cursor = 'grab' } // a click (not a drag) makes a sparkle burst
    const enter = () => { drag.over = true }
    const leave = () => { drag.over = false }
    const dbl = () => { drag.back = true }
    hitEl.addEventListener('pointerdown', down)
    hitEl.addEventListener('pointermove', move)
    hitEl.addEventListener('pointerup', up)
    hitEl.addEventListener('pointercancel', up)
    hitEl.addEventListener('pointerenter', enter)
    hitEl.addEventListener('pointerleave', leave)
    hitEl.addEventListener('dblclick', dbl)
    const onMove = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = 1 - (e.clientY / window.innerHeight) * 2
    }
    window.addEventListener('pointermove', onMove)
    // idle tracking + "ooh" when the cursor is over a project card
    const touch = () => { life.last = performance.now() }
    const over = (e) => { life.card = !!e.target.closest?.('.pcard:not([data-soon])') }
    for (const ev of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart']) window.addEventListener(ev, touch, { passive: true })
    document.addEventListener('pointerover', over)

    let raf
    let last = performance.now()
    const t0 = last
    let lastSec = 0
    let waveUntil = 0
    const loop = (now) => {
      const dt = (now - last) / 1000
      last = now
      const t = (now - t0) / 1000
      const W = window.innerWidth
      const H = window.innerHeight

      // wave hello when it appears and whenever you reach a new section
      const sec = Math.round(scrollState.pos)
      if (sec !== lastSec) { lastSec = sec; waveUntil = t + 1.6; if (!drag.on) drag.back = true } // IO goes back to its spot on a new section
      const appearTarget = t > 1.7 ? 1 : 0
      if (appearTarget && t < 1.75) waveUntil = t + 3.2

      mascot.frame(dt, t, {
        appear: appearTarget,
        talk: scrollState.ioTalk,
        vel: scrollState.vel,
        wave: t < waveUntil || drag.over || drag.on ? 1 : 0,
        pointer,
        idle: (now - life.last) / 1000,
        excite: life.card || drag.over ? 1 : 0,
        burstId: life.burst,
      })
      if (drag.back && !drag.on) { drag.x *= Math.exp(-5 * dt); drag.y *= Math.exp(-5 * dt); if (Math.abs(drag.x) + Math.abs(drag.y) < 0.5) { drag.x = drag.y = 0; drag.back = false } }
      const base = scrollState.io
      const r0 = (base.r || 70) * 1.1
      const bx = ((1 + base.x) / 2) * W, by = ((1 - base.y) / 2) * H
      drag.x = Math.min(Math.max(drag.x, r0 - bx), W - r0 - bx)
      drag.y = Math.min(Math.max(drag.y, r0 - by), H - r0 - by)
      const eff = { ...base, x: base.x + (drag.x * 2) / W, y: base.y - (drag.y * 2) / H }
      const r = place(el, eff, W, H, mascot.state.appear, t)
      scrollState.io.r = r
      scrollState.ioPos = { x: eff.x, y: eff.y }
      const hr = r * 1.15
      hitEl.style.transform = `translate3d(${(((1 + eff.x) / 2) * W - hr).toFixed(1)}px, ${(((1 - eff.y) / 2) * H - hr).toFixed(1)}px, 0)`
      hitEl.style.width = hitEl.style.height = `${(hr * 2).toFixed(1)}px`
      hitEl.style.display = mascot.state.appear > 0.9 ? 'block' : 'none'
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      for (const ev of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart']) window.removeEventListener(ev, touch)
      document.removeEventListener('pointerover', over)
      scrollState.ioPos = null
    }
  }, [])

  return (
    <>
    <div ref={hit} title="Drag me" style={{ position: 'fixed', left: 0, top: 0, zIndex: 32, borderRadius: '50%', cursor: 'grab', touchAction: 'none', display: 'none' }} />
    <div
      ref={host}
      aria-hidden="true"
      style={{ position: 'fixed', left: 0, top: 0, width: VB.w, height: VB.h, zIndex: 31, pointerEvents: 'none', opacity: 0, transformOrigin: '0 0', willChange: 'transform', filter: 'drop-shadow(0 0 22px rgba(90,170,255,.55))' }}
    />
    </>
  )
}
