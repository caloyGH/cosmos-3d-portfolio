import { useEffect } from 'react'

/**
 * Tiny scroll parallax: any element with data-parallax="<depth>" drifts a little against the
 * scroll, which gives the page depth. Depth 1 ≈ 28px of travel; use 0.5 for subtler.
 * (Measures the parent <section>, not the moving element, so there is no feedback loop.)
 */
export default function useParallax() {
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    const update = () => {
      raf = 0
      const vh = window.innerHeight
      document.querySelectorAll('[data-parallax]').forEach((el) => {
        const ref = el.closest('section') || el.parentElement
        const r = ref.getBoundingClientRect()
        const d = (r.top + r.height / 2 - vh / 2) / vh // ~ -1 .. 1 around the viewport centre
        const depth = parseFloat(el.dataset.parallax) || 1
        el.style.transform = `translate3d(0, ${(-d * 28 * depth).toFixed(1)}px, 0)`
      })
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])
}
