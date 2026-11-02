import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/** Neon ring + dot that follows the mouse (desktop / fine pointers only). */
export default function Cursor() {
  const ring = useRef(null)
  const dot = useRef(null)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return

    const rx = gsap.quickTo(ring.current, 'x', { duration: 0.35, ease: 'power3' })
    const ry = gsap.quickTo(ring.current, 'y', { duration: 0.35, ease: 'power3' })

    const move = (e) => {
      gsap.set([ring.current, dot.current], { opacity: 1 })
      rx(e.clientX)
      ry(e.clientY)
      gsap.set(dot.current, { x: e.clientX, y: e.clientY })
      const hot = e.target.closest?.('a, button')
      gsap.to(ring.current, { scale: hot ? 1.8 : 1, duration: 0.25, overwrite: 'auto' })
    }

    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [])

  return (
    <>
      <div
        ref={ring}
        className="pointer-events-none fixed left-0 top-0 z-[60] -ml-4 -mt-4 h-8 w-8 rounded-full border border-neon/70 opacity-0 mix-blend-screen"
      />
      <div
        ref={dot}
        className="pointer-events-none fixed left-0 top-0 z-[60] -ml-[2px] -mt-[2px] h-1 w-1 rounded-full bg-neon opacity-0"
      />
    </>
  )
}
