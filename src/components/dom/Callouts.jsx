import { useEffect, useRef } from 'react'
import { scrollState } from '../../store/scroll'
import { CALLOUTS } from '../../data/profile'

const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b)
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}

const ICONS = {
  code: <path d="M8 7 3 12l5 5M16 7l5 5-5 5M14 4l-4 16" />,
  atom: (
    <>
      <circle cx="12" cy="12" r="1.6" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)" />
    </>
  ),
  cube: <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12v9M12 12 4 7.5" />,
  rocket: (
    <>
      <path d="M14 4c3 0 6 3 6 6-2 4-5 7-9 8l-5-5c1-4 4-7 8-9Z" />
      <circle cx="14.5" cy="9.5" r="1.4" />
      <path d="M7 13c-2 .5-3 2-3.5 4.5C6 17 7.5 16 8 14M11 17c-.5 2-2 3-4.5 3.5C7 18 8 16.5 10 16" />
    </>
  ),
}

/**
 * Short notes that swoop in from the right edge in the gap between two sections, like checkpoints on a
 * journey: a cyan streak sweeps across, the card is revealed left to right, then flies off again.
 * Entirely driven by scroll position (scrolling back up plays it in reverse).
 */
export default function Callouts() {
  const refs = useRef([])

  useEffect(() => {
    if (!CALLOUTS.enabled) return
    let raf
    const loop = () => {
      const p = scrollState.pos
      CALLOUTS.items.forEach((_, i) => {
        const el = refs.current[i]
        if (!el) return
        const c = i + 1.5 // centre of the gap after section i+1 (hero -> about is covered by <Story>)
        const inn = smooth(c - 0.3, c - 0.1, p)
        const out = smooth(c + 0.1, c + 0.3, p)
        const vis = inn * (1 - out)
        el.style.visibility = vis < 0.005 ? 'hidden' : 'visible'
        el.style.opacity = String(vis)
        // fly in from the right, fly out to the left
        el.style.transform = `translate3d(${(1 - inn) * 90 - out * 120}px, 0, 0)`
        const card = el.firstChild
        const streak = el.lastChild
        card.style.clipPath = `inset(0 ${(1 - smooth(0.15, 1, inn)) * 100}% 0 0)`
        streak.style.opacity = String(Math.sin(Math.PI * clamp(inn)) * (1 - out))
        streak.style.transform = `translateX(${(inn - 0.5) * 220}%) scaleX(${0.4 + inn})`
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  if (!CALLOUTS.enabled) return null

  return (
    <div aria-hidden="true" className="pointer-events-none fixed right-6 top-[44vh] z-[3] hidden md:right-16 md:block">
      {CALLOUTS.items.map((c, i) => (
        <div
          key={c.tag}
          ref={(el) => (refs.current[i] = el)}
          className="invisible absolute right-0 top-0 w-60 will-change-transform"
        >
          <div className="flex items-center gap-4 border border-neon/25 bg-black/40 p-4 backdrop-blur-md [box-shadow:0_0_30px_rgba(0,240,255,0.12)]">
            <svg
              viewBox="0 0 24 24"
              className="h-10 w-10 shrink-0 fill-none stroke-neon [filter:drop-shadow(0_0_6px_rgba(0,240,255,0.8))]"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {ICONS[c.icon]}
            </svg>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-neon">{c.tag}</p>
              <p className="mt-1 font-display text-sm font-medium leading-snug text-white">{c.text}</p>
            </div>
          </div>
          <span className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-neon to-transparent [box-shadow:0_0_14px_#00f0ff]" />
        </div>
      ))}
    </div>
  )
}
