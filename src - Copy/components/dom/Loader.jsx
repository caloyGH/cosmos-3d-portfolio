import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

export default function Loader() {
  const root = useRef(null)
  const [pct, setPct] = useState(0)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const n = { v: 0 }
    const tl = gsap.timeline()
    tl.to(n, {
      v: 100,
      duration: 1.6,
      ease: 'power2.inOut',
      onUpdate: () => setPct(Math.round(n.v)),
    })
      .to(root.current, { opacity: 0, duration: 0.7, ease: 'power2.out' })
      .call(() => setGone(true))
    return () => tl.kill()
  }, [])

  // safety net: never leave the loader on screen
  useEffect(() => {
    const t = setTimeout(() => setGone(true), 4000)
    return () => clearTimeout(t)
  }, [])

  if (gone) return null

  return (
    <div
      ref={root}
      className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#0a0a0a] font-mono text-xs uppercase tracking-[0.35em] text-neon"
    >
      <span>Initializing system</span>
      <div className="h-px w-56 bg-white/10">
        <div className="h-full bg-neon shadow-[0_0_12px_#00f0ff]" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-white/50">{String(pct).padStart(3, '0')} / 100</span>
    </div>
  )
}
