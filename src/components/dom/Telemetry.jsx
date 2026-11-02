import { useEffect, useRef } from 'react'
import { scrollState } from '../../store/scroll'

const SECTORS = ['SOL', 'ORION', 'LYRA', 'VEGA', 'CYGNUS']

/** Tiny flight-computer readout: sector changes per section, warp follows your scroll speed. */
export default function Telemetry({ section }) {
  const warp = useRef(null)

  useEffect(() => {
    let raf
    const loop = () => {
      if (warp.current) warp.current.textContent = (scrollState.vel * 0.33).toFixed(2)
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="fin-fade pointer-events-none fixed bottom-24 right-6 z-30 hidden text-right font-mono text-[10px] uppercase leading-5 tracking-[0.25em] text-white/30 md:right-16 md:block">
      <div>
        Sector{' '}
        <span className="text-neon">
          {SECTORS[section]}-0{section + 1}
        </span>
      </div>
      <div>
        Warp{' '}
        <span className="text-neon">
          <span ref={warp}>0.00</span>c
        </span>
      </div>
    </div>
  )
}
