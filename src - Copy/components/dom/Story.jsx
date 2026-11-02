import { useEffect, useRef } from 'react'
import { scrollState } from '../../store/scroll'
import { STORY } from '../../data/profile'

// scroll windows (in scrollState.pos units, 0 = hero ... 1 = about) when each caption is on screen
const WINDOWS = [
  [0.08, 0.3],
  [0.36, 0.6],
  [0.66, 0.9],
]
const sstep = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t) }

const ICONS = {
  code: <path d="M8 6l-6 6 6 6M16 6l6 6-6 6M14 4l-4 16" />,
  layers: <path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5" />,
  orbit: (
    <>
      <circle cx="12" cy="12" r="3" />
      <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-25 12 12)" />
    </>
  ),
}

/** Tall scroll area: captions fade in/out while the camera flies through the ring gates. */
export default function Story() {
  const refs = useRef([])

  useEffect(() => {
    let raf
    const loop = () => {
      const p = scrollState.pos
      WINDOWS.forEach(([a, b], i) => {
        const el = refs.current[i]
        if (!el) return
        const f = 0.05
        const inn = sstep(a, a + f, p)
        const out = sstep(b - f, b, p)
        const o = inn * (1 - out)
        el.style.opacity = o.toFixed(3)
        el.style.transform = `translateY(${((1 - inn) * 28 - out * 28).toFixed(1)}px)`
        el.style.filter = o > 0.99 ? 'none' : `blur(${((1 - o) * 8).toFixed(1)}px)`
      })
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <section id="story" aria-label="My story" className="relative h-[320vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        {STORY.map((s, i) => (
          <div
            key={i}
            ref={(el) => (refs.current[i] = el)}
            style={{ opacity: 0 }}
            className={`absolute top-1/2 w-full max-w-[min(26rem,86vw)] -translate-y-1/2 px-6 will-change-transform md:px-16 ${
              s.side === 'right' ? 'right-0 text-right md:max-w-md' : 'left-0 md:max-w-md'
            }`}
          >
            <div className={`mb-5 flex items-center gap-3 ${s.side === 'right' ? 'justify-end' : ''}`}>
              <span className="grid h-10 w-10 place-items-center rounded-full border border-neon/40 bg-neon/10 shadow-[0_0_20px_rgba(0,240,255,0.25)]">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-neon" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  {ICONS[s.icon]}
                </svg>
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                0{i + 1} / 0{STORY.length}
              </span>
            </div>
            <p className="font-display text-2xl font-medium leading-snug text-white md:text-3xl">{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
