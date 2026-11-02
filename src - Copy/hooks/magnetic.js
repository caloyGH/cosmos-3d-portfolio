// "Magnetic" buttons: anything with  data-magnetic  leans a few pixels toward the cursor when it gets close, and eases back.
// Uses the CSS `translate` property, so it never fights with `transform` (tilt, hover scale, ...). Pure DOM, easy to test.
export function attachMagnetic({ selector = '[data-magnetic]', pull = 0.3, max = 11 } = {}) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return () => {}
  if (window.matchMedia?.('(hover: none)').matches) return () => {}
  const state = new WeakMap() // el -> { x, y, tx, ty }
  let els = []
  let mx = -9999
  let my = -9999
  let raf = 0
  let refreshed = 0

  const refresh = () => { els = [...document.querySelectorAll(selector)]; refreshed = performance.now() }

  const tick = () => {
    raf = 0
    if (performance.now() - refreshed > 2000) refresh()
    let busy = false
    for (const el of els) {
      let s = state.get(el)
      if (!s) { s = { x: 0, y: 0, tx: 0, ty: 0 }; state.set(el, s) }
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2 - s.x // centre without our own offset, so it does not feed back
      const cy = r.top + r.height / 2 - s.y
      const reach = Math.max(r.width, r.height) * 0.75 + 36
      const dx = mx - cx
      const dy = my - cy
      if (Math.hypot(dx, dy) < reach) {
        s.tx = Math.max(-max, Math.min(max, dx * pull))
        s.ty = Math.max(-max, Math.min(max, dy * pull))
      } else { s.tx = 0; s.ty = 0 }
      s.x += (s.tx - s.x) * 0.2
      s.y += (s.ty - s.y) * 0.2
      if (Math.abs(s.x - s.tx) < 0.05 && Math.abs(s.y - s.ty) < 0.05) { s.x = s.tx; s.y = s.ty } else busy = true
      el.style.translate = s.x || s.y ? `${s.x.toFixed(2)}px ${s.y.toFixed(2)}px` : ''
    }
    if (busy) raf = requestAnimationFrame(tick)
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick) }
  const move = (e) => { mx = e.clientX; my = e.clientY; kick() }
  const leave = () => { mx = my = -9999; kick() }

  refresh()
  window.addEventListener('pointermove', move, { passive: true })
  document.addEventListener('pointerleave', leave)
  return () => {
    window.removeEventListener('pointermove', move)
    document.removeEventListener('pointerleave', leave)
    if (raf) cancelAnimationFrame(raf)
    for (const el of els) el.style.translate = ''
  }
}
