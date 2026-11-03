import { useEffect, useState } from 'react'
import { SECTIONS } from '../data/scenes'
import { scrollState } from '../store/scroll'

export function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

/** Tracks scroll, writes to scrollState and returns the active section index. */
export default function useScrollSections() {
  const [section, setSection] = useState(0)

  useEffect(() => {
    let centers = []
    const clamp01 = (v) => Math.min(Math.max(v, 0), 1)
    const sst = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t) }
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)') // no finale at all
    const compact = window.matchMedia?.('(max-width: 767px), (max-height: 640px)') // finale runs on its own track after Contact

    const measure = () => {
      centers = SECTIONS.map((id) => {
        const el = document.getElementById(id)
        // Contact is pinned for the finale and therefore very tall: for the section maths it counts as one screen
        return el ? el.offsetTop + Math.min(el.offsetHeight, window.innerHeight) / 2 : 0
      })
    }

    const update = () => {
      const y = window.scrollY + window.innerHeight / 2
      const last = centers.length - 1
      let pos = 0

      if (y >= centers[last]) pos = last
      else if (y > centers[0]) {
        let i = 0
        while (i < last && y > centers[i + 1]) i++
        pos = i + (y - centers[i]) / (centers[i + 1] - centers[i])
      }

      const max = document.documentElement.scrollHeight - window.innerHeight
      scrollState.pos = pos
      scrollState.progress = max > 0 ? window.scrollY / max : 0
      setSection(Math.round(pos))

      // the finale: scrolling on past Contact (which stays pinned) pulls the whole scene into a black hole
      const c = document.getElementById('contact')
      let fin = 0
      const track = document.getElementById('finale-track')
      const pinned = !compact?.matches
      if (!reduced?.matches) {
        const el = pinned ? c : track
        if (el) {
          const range = el.offsetHeight - window.innerHeight
          fin = range > 40 ? clamp01((window.scrollY - el.offsetTop) / range) : 0
        }
      }
      if (fin !== scrollState.fin) {
        scrollState.fin = fin
        document.body.dataset.finale = fin > 0.1 ? '1' : '0'
        document.body.dataset.finEnd = fin > 0.9 ? '1' : '0'
        document.body.style.setProperty('--fin', fin.toFixed(3)) // lets the CSS tidy the HUD away as everything is swallowed
        if (c && pinned) {
          const sink = Math.pow(sst(0.1, 0.55, fin), 2.2) // contact card: slow at first, then falls in
          c.style.setProperty('--sink', sink.toFixed(4))
          c.style.setProperty('--hint', (1 - sst(0.0, 0.1, fin)).toFixed(3))
        }
        const ui = document.getElementById('finale-ui')
        if (ui) {
          ui.style.setProperty('--reveal', sst(0.74, 0.95, fin).toFixed(3))
          ui.dataset.on = fin > 0.74 ? '1' : '0'
        }
      }
    }

    const onResize = () => {
      measure()
      update()
    }

    measure()
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', onResize)
    window.addEventListener('load', onResize)
    const ro = new ResizeObserver(onResize)
    ro.observe(document.body)

    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('load', onResize)
      ro.disconnect()
    }
  }, [])

  return section
}
