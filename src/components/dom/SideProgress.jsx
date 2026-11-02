import { useEffect, useRef } from 'react'
import { scrollState } from '../../store/scroll'
import { SECTIONS } from '../../data/scenes'

/** Vertical scroll progress + section counter on the right edge. */
export default function SideProgress({ section }) {
  const bar = useRef(null)
  const dist = useRef(null)

  useEffect(() => {
    let raf
    const loop = () => {
      if (bar.current) bar.current.style.transform = `scaleY(${scrollState.progress})`
      // fun "distance travelled" readout
      if (dist.current) dist.current.textContent = `${(scrollState.progress * 4200).toFixed(1).padStart(6, '0')} LY`
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <aside className="fin-fade fixed right-5 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-3 md:flex">
      <span className="font-mono text-[10px] tracking-widest text-neon">0{section + 1}</span>
      <div className="relative h-40 w-px bg-white/10">
        <div ref={bar} className="absolute inset-0 origin-top bg-neon shadow-[0_0_8px_#00f0ff]" style={{ transform: 'scaleY(0)' }} />
      </div>
      <span className="font-mono text-[10px] tracking-widest text-white/30">0{SECTIONS.length}</span>
      <span
        ref={dist}
        className="mt-3 font-mono text-[9px] tracking-[0.25em] text-neon/70 [writing-mode:vertical-rl]"
      >
        0000.0 LY
      </span>
    </aside>
  )
}
