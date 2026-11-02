import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

/** Full-height section wrapper (left-aligned content; the 3D model lives on the right). */
export function Section({ id, className = '', children }) {
  return (
    <section id={id} className={`relative flex min-h-screen items-center px-6 py-28 md:px-16 ${className}`}>
      {children}
    </section>
  )
}

/** Fade + slide in when scrolled into view. */
export function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        setShown(true)
        io.disconnect()
      },
      { threshold: 0.15 }
    )
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  )
}

/** Mono label: // 01 — ABOUT */
export function SectionLabel({ index, children }) {
  return (
    <p className="mb-4 font-mono text-xs uppercase tracking-[0.35em] text-neon">
      <span className="text-white/40">// {index} — </span>
      <Scramble text={String(children)} />
    </p>
  )
}

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** "Decode" effect: random characters resolve into the real text when scrolled into view. */
function Scramble({ text }) {
  const ref = useRef(null)
  const [out, setOut] = useState(() => text.replace(/[^ ]/g, '·'))

  useEffect(() => {
    if (reduced()) {
      setOut(text)
      return
    }
    const CH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/<>_'
    let raf
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        const t0 = performance.now()
        const dur = 800
        const loop = (now) => {
          const k = Math.min((now - t0) / dur, 1)
          setOut(
            text
              .split('')
              .map((c, i) => (c === ' ' || i < k * text.length ? c : CH[Math.floor(Math.random() * CH.length)]))
              .join('')
          )
          if (k < 1) raf = requestAnimationFrame(loop)
        }
        raf = requestAnimationFrame(loop)
      },
      { threshold: 0.5 }
    )
    io.observe(ref.current)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [text])

  return <span ref={ref}>{out}</span>
}

/**
 * Section heading whose words blur in one by one when it scrolls into view.
 * parts = [{ t: 'Plain text' }, { t: 'highlighted', accent: true }]
 */
export function Heading({ parts, className = '', accentClass = 'font-serif font-normal italic text-neon' }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        setShown(true)
        io.disconnect()
      },
      { threshold: 0.3 }
    )
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])

  let n = 0
  return (
    <h2 ref={ref} className={className}>
      {parts.map((p, pi) =>
        p.t.split(' ').map((w, i) => (
          <span
            key={`${pi}-${i}`}
            data-shown={shown}
            style={{ '--w': n++ }}
            className={`word-reveal mr-[0.25em] inline-block ${p.accent ? accentClass : ''}`}
          >
            {w}
          </span>
        ))
      )}
    </h2>
  )
}

/** Glass panel with HUD corner brackets that expand on hover. */
export function Panel({ children, className = '' }) {
  const corners = [
    'left-0 top-0 border-l border-t',
    'right-0 top-0 border-r border-t',
    'bottom-0 left-0 border-b border-l',
    'bottom-0 right-0 border-b border-r',
  ]
  // soft spotlight that follows the cursor inside the panel
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  return (
    <div
      onMouseMove={onMove}
      className={`group glass relative ${className}`}
    >
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: 'radial-gradient(260px circle at var(--mx, 50%) var(--my, 50%), rgba(0,240,255,0.10), transparent 70%)',
        }}
      />
      {corners.map((c) => (
        <span
          key={c}
          className={`pointer-events-none absolute h-3 w-3 border-neon/70 transition-all duration-300 group-hover:h-5 group-hover:w-5 ${c}`}
        />
      ))}
      {children}
    </div>
  )
}

/** Number that counts up the first time it is visible. */
export function CountUp({ to, suffix = '' }) {
  const ref = useRef(null)
  const [val, setVal] = useState(0)

  useEffect(() => {
    let tween
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        const obj = { v: 0 }
        tween = gsap.to(obj, {
          v: to,
          duration: 1.8,
          ease: 'power3.out',
          onUpdate: () => setVal(Math.round(obj.v)),
        })
      },
      { threshold: 0.5 }
    )
    io.observe(ref.current)
    return () => {
      io.disconnect()
      tween?.kill()
    }
  }, [to])

  return (
    <span ref={ref}>
      {val}
      {suffix}
    </span>
  )
}

/** Skill level bar that fills when visible. */
export function Bar({ level }) {
  const ref = useRef(null)
  const [w, setW] = useState(0)

  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        setW(level)
        io.disconnect()
      },
      { threshold: 0.5 }
    )
    io.observe(ref.current)
    return () => io.disconnect()
  }, [level])

  return (
    <div ref={ref} className="h-1 w-full overflow-hidden bg-white/10">
      <div
        className="h-full bg-neon shadow-[0_0_10px_#00f0ff] transition-all duration-1000 ease-out"
        style={{ width: `${w}%` }}
      />
    </div>
  )
}
