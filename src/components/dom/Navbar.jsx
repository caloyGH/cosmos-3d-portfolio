import { useLayoutEffect, useRef, useState } from 'react'
import { PROFILE } from '../../data/profile'

const LINKS = [
  { label: 'About', id: 'about', index: 1 },
  { label: 'Work', id: 'projects', index: 2 },
  { label: 'Stack', id: 'stack', index: 3 },
  { label: 'Contact', id: 'contact', index: 4 },
]

export default function Navbar({ section }) {
  const list = useRef(null)
  const [hover, setHover] = useState(0) // 0 = none, else the index of the hovered link
  const [bar, setBar] = useState({ x: 0, w: 0, on: false })
  const target = hover || section // the underline sits under the hovered link, or the current section

  // slide one underline under the active / hovered link (measured, so it works at any width)
  useLayoutEffect(() => {
    const measure = () => {
      const a = list.current?.querySelector(`[data-nav="${target}"]`)
      if (!a || target < 1 || target > LINKS.length) { setBar((b) => ({ ...b, on: false })); return }
      const parent = list.current.getBoundingClientRect()
      const r = a.getBoundingClientRect()
      setBar({ x: r.left - parent.left, w: r.width, on: true })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [target])

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 px-4 pt-4 md:px-10 md:pt-6">
      <nav className="pointer-events-auto glass glass-nav mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
        <a href="#hero" className="flex items-center gap-2.5 font-mono text-sm font-medium tracking-[0.25em] text-white">
          <span className="h-2.5 w-2.5 rounded-full bg-neon shadow-[0_0_12px_#00f0ff]" />
          {PROFILE.brand}
        </a>

        <ul ref={list} onMouseLeave={() => setHover(0)} className="relative hidden items-center gap-8 font-mono text-xs uppercase tracking-widest md:flex">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-2 left-0 h-px bg-neon shadow-[0_0_8px_#00f0ff]"
            style={{ width: bar.w, transform: `translateX(${bar.x}px)`, opacity: bar.on ? 1 : 0, transition: 'transform .45s cubic-bezier(.2,.8,.2,1), width .45s cubic-bezier(.2,.8,.2,1), opacity .3s' }}
          />
          {LINKS.map((l) => (
            <li key={l.id}>
              <a
                href={`#${l.id}`}
                data-nav={l.index}
                onMouseEnter={() => setHover(l.index)}
                className={`transition hover:text-neon ${section === l.index ? 'text-neon' : 'text-white/50'}`}
              >
                <span className="mr-1.5 text-white/30">0{l.index}</span>
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4">
          <span className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-white/50 lg:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-neon" />
            SYS.ONLINE
          </span>
          <a
            href="#contact"
            data-magnetic
            className="rounded-full bg-neon px-5 py-2 text-sm font-semibold text-black transition hover:shadow-[0_0_24px_rgba(0,240,255,0.6)]"
          >
            Let&apos;s Talk
          </a>
        </div>
      </nav>
    </header>
  )
}
