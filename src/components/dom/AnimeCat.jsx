import { useEffect, useRef } from 'react'
import { scrollState } from '../../store/scroll'
import { GUIDE } from '../../data/profile'
import { createAnimeCat } from './animeCatCtl'

// 2D anime-style black cat (SVG, no WebGL). Runs down the right edge of the screen with the scroll.
export default function AnimeCat() {
  if (!GUIDE.enabled || GUIDE.mode !== 'anime') return null
  return <AnimeCatInner />
}

function AnimeCatInner() {
  const host = useRef(null)
  useEffect(() => {
    const el = host.current
    const cat = createAnimeCat(el, scrollState)
    let raf = 0
    let last = performance.now()
    const t0 = last
    const loop = (t) => {
      const dt = (t - last) / 1000
      last = t
      cat.frame(dt, (t - t0) / 1000, window.innerWidth, window.innerHeight)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div
      ref={host}
      aria-hidden="true"
      style={{ position: 'fixed', left: 0, top: 0, width: 290, height: 160, zIndex: 40, pointerEvents: 'none', opacity: 0, transformOrigin: '50% 50%', willChange: 'transform' }}
    />
  )
}
