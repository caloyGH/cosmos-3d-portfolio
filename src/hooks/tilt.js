// Pointer-driven 3D tilt + spotlight for a card element. Pure DOM so it is easy to test.
export function attachTilt(el, { max = 9 } = {}) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return () => {}
  if (window.matchMedia?.('(hover: none)').matches) return () => {}
  let raf = 0
  let tx = 0, ty = 0
  const apply = () => {
    raf = 0
    el.style.setProperty('--rx', `${(-ty * max).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${(tx * max).toFixed(2)}deg`)
  }
  const move = (e) => {
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    tx = px * 2 - 1
    ty = py * 2 - 1
    el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`)
    el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`)
    el.dataset.hot = 'true'
    if (!raf) raf = requestAnimationFrame(apply)
  }
  const leave = () => {
    tx = ty = 0
    delete el.dataset.hot
    if (!raf) raf = requestAnimationFrame(apply)
  }
  el.addEventListener('pointermove', move)
  el.addEventListener('pointerleave', leave)
  return () => {
    el.removeEventListener('pointermove', move)
    el.removeEventListener('pointerleave', leave)
    if (raf) cancelAnimationFrame(raf)
  }
}
