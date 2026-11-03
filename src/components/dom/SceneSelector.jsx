import { useEffect, useRef } from 'react'
import { scrollToSection } from '../../hooks/useScrollSections'
import { scrollState } from '../../store/scroll'

/** Bottom timeline: one marker per section / particle shape. Click to jump. */
export default function SceneSelector({ scenes, section }) {
  const fill = useRef(null)
  const last = scenes.length - 1

  // progress line follows the (float) scroll position
  useEffect(() => {
    let raf
    const loop = () => {
      if (fill.current) fill.current.style.width = `${(Math.min(scrollState.pos, last) / last) * 100}%`
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [last])

  return (
    <div className="fin-fade pointer-events-none fixed inset-x-0 bottom-0 z-30 px-6 pb-4 md:px-16 md:pb-5">
      <div className="pointer-events-auto relative mx-auto h-14 max-w-4xl">
        {/* phones: no room for five labels, so only the current one is shown, centred under the track */}
        <p className="absolute inset-x-0 top-5 text-center font-mono text-[10px] uppercase tracking-widest text-white md:hidden">
          <span className="text-neon">0{section + 1}</span> {scenes[section]?.name}
        </p>
        {/* track */}
        <div className="absolute inset-x-0 top-1 h-px bg-white/15">
          <div ref={fill} className="h-full bg-neon shadow-[0_0_8px_#00f0ff]" style={{ width: '0%' }} />
        </div>

        {scenes.map((s, i) => {
          const left = (i / last) * 100
          const active = i === section
          return (
            <button
              key={s.id}
              onClick={() => scrollToSection(s.section)}
              // the point at `left`% of the button sits exactly at `left`% of the track
              style={{ left: `${left}%`, transform: `translateX(-${left}%)` }}
              className="group absolute top-0 text-left max-md:h-9 max-md:w-11"
            >
              <span
                style={{ left: `${left}%` }}
                className={`absolute top-px h-[7px] w-[7px] -translate-x-1/2 rotate-45 border transition ${
                  active
                    ? 'border-neon bg-neon shadow-[0_0_10px_#00f0ff]'
                    : 'border-white/30 bg-[#0a0a0a] group-hover:border-neon'
                }`}
              />
              <span
                className={`block pt-4 font-mono text-[10px] uppercase tracking-widest transition max-md:hidden ${
                  active ? 'text-white' : 'text-white/40 group-hover:text-white/80'
                }`}
              >
                <span className="text-neon">0{i + 1}</span> {s.name}
              </span>
              <span className="hidden font-mono text-[9px] uppercase tracking-[0.25em] text-white/30 md:block">
                {s.shape}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
