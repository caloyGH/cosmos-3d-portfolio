import { useEffect, useState } from 'react'
import { scrollState } from '../../store/scroll'
import { PLANETS } from '../../data/planets'

/** Small "now approaching our next destination" note (lower right) that appears after you land on a new section. */
export default function PlanetTag() {
  const [tag, setTag] = useState(null)

  useEffect(() => {
    let shown = 0
    let cand = -1
    let since = 0
    let hide
    const id = setInterval(() => {
      const sec = Math.round(scrollState.pos)
      const now = performance.now()
      if (sec !== cand) { cand = sec; since = now }
      if (sec !== shown && now - since > 500 && scrollState.vel < 0.6) {
        shown = sec
        if (sec < 1 || sec >= PLANETS.length) return
        setTag({ k: now })
        clearTimeout(hide)
        hide = setTimeout(() => setTag(null), 3200)
      }
    }, 150)
    return () => { clearInterval(id); clearTimeout(hide) }
  }, [])

  if (!tag) return null
  return (
    <div key={tag.k} className="ptag" aria-hidden="true">
      <span className="ptag-dot" />
      <span className="ptag-k">Now approaching</span>
      <span className="ptag-f">our next destination</span>
    </div>
  )
}
