import { useEffect, useState } from 'react'

/** A shooting star now and then, far behind the content. Skipped when the visitor prefers reduced motion. */
export default function Meteors() {
  const [list, setList] = useState([])

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const fast = new URLSearchParams(window.location.search).has('showcase') // ?showcase: more shooting stars
    let id = 0
    let timer
    const spawn = () => {
      const m = {
        id: ++id,
        top: `${Math.round(Math.random() * 55)}%`,
        left: `${Math.round(10 + Math.random() * 80)}%`,
        a: Math.round(18 + Math.random() * 22), // angle (deg)
        len: Math.round(110 + Math.random() * 120),
        dur: (1.1 + Math.random() * 0.8).toFixed(2),
      }
      setList((l) => [...l.slice(-3), m])
      setTimeout(() => setList((l) => l.filter((x) => x.id !== m.id)), 2200)
      timer = setTimeout(spawn, fast ? 1200 + Math.random() * 1800 : 5000 + Math.random() * 7000)
    }
    timer = setTimeout(spawn, 3500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="meteors" aria-hidden="true">
      {list.map((m) => (
        <span key={m.id} className="meteor" style={{ top: m.top, left: m.left, '--a': `${m.a}deg`, '--len': `${m.len}px`, '--dur': `${m.dur}s` }} />
      ))}
    </div>
  )
}
