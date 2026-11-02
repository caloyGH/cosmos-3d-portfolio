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

    const measure = () => {
      centers = SECTIONS.map((id) => {
        const el = document.getElementById(id)
        return el ? el.offsetTop + el.offsetHeight / 2 : 0
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
