import { useEffect } from 'react'

const IDS = ['about', 'projects', 'stack'] // (contact is tall and pinned for the finale, so it opts out)

/**
 * 3D scroll for the HTML: each section tilts back and sinks into the screen as it leaves
 * and rises toward you as it arrives (a gentle "page turn in depth"). Position comes from
 * offsetTop (not getBoundingClientRect) so the transform never feeds back into the measurement.
 */
export default function useDepthScroll() {
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const els = IDS.map((id) => document.getElementById(id)).filter(Boolean)
    els.forEach((el) => { el.style.willChange = 'transform'; el.style.transformOrigin = '50% 50%' })

    let raf = 0
    const update = () => {
      raf = 0
      const vh = window.innerHeight
      const mid = window.scrollY + vh / 2
      const mobile = window.innerWidth < 768
      for (const el of els) {
        const o = Math.max(-1.4, Math.min(1.4, (el.offsetTop + el.offsetHeight / 2 - mid) / vh)) // + below, - above
        const a = Math.abs(o)
        const rx = o * -(mobile ? 4 : 9)          // top edge tips away as it leaves
        const tz = -a * a * (mobile ? 90 : 260)   // sinks back with distance
        const sc = 1 - Math.min(a, 1) * 0.04
        el.style.transform = `perspective(1400px) translate3d(0,0,${tz.toFixed(1)}px) rotateX(${rx.toFixed(2)}deg) scale(${sc.toFixed(4)})`
      }
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
      els.forEach((el) => { el.style.transform = ''; el.style.willChange = '' })
    }
  }, [])
}
