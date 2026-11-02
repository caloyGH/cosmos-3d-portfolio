import { useEffect, useRef, useState } from 'react'
import { IO } from '../../data/profile'
import { scrollState } from '../../store/scroll'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Remarks from IO that appear next to it when you arrive at a section. In IO.stay sections (contact) it stays until you leave. */
export default function IoBubble() {
  const box = useRef(null)
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [wide, setWide] = useState(false)
  const run = useRef(0) // token so a newer remark cancels an older one

  // follow IO on screen
  useEffect(() => {
    let raf
    const loop = () => {
      const el = box.current
      if (el) {
        const W = window.innerWidth, H = window.innerHeight
        const io = scrollState.ioPos || scrollState.io
        const x = ((1 + io.x) / 2) * W
        const y = ((1 - io.y) / 2) * H
        const off = scrollState.io.r || 64 * Math.max(scrollState.io.s, 0.3) * 1.4
        let left = x - off - el.offsetWidth
        if (left < 12) left = Math.min(x + off, W - el.offsetWidth - 12) // not enough room on the left: speak from the right
        el.style.transform = `translate3d(${left.toFixed(1)}px, ${(y - el.offsetHeight / 2).toFixed(1)}px, 0)`
      }
      raf = requestAnimationFrame(loop)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [])

  // say something when a new section is reached
  useEffect(() => {
    let last = 0
    let raf
    let cand = 0
    let since = 0
    let staying = 0
    const say = async (msg, stay) => {
      const id = ++run.current
      setWide(stay)
      setOpen(true)
      if (reduced()) setText(msg)
      else {
        scrollState.ioTalk = 1
        for (let c = 1; c <= msg.length && run.current === id; c++) {
          setText(msg.slice(0, c))
          await sleep(22)
        }
        scrollState.ioTalk = 0
      }
      if (stay) return // stays until you leave the section
      await sleep(4200)
      if (run.current === id) setOpen(false)
    }
    const loop = (now) => {
      const p = scrollState.pos
      const sec = p >= 0.95 ? Math.round(p) : 0
      if (staying && sec !== staying) {
        // you left the section IO was talking in
        run.current++
        scrollState.ioTalk = 0
        setOpen(false)
        staying = 0
      }
      if (sec === cand) {
        if (sec !== last && sec > 0 && IO.hints[sec] && now - since > 450 && scrollState.vel < 0.6) {
          last = sec
          const stay = !!IO.stay?.includes(sec)
          if (stay) staying = sec
          say(IO.hints[sec], stay)
        }
      } else {
        cand = sec
        since = now
        if (sec === 0) last = 0
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      run.current++
      scrollState.ioTalk = 0
    }
  }, [])

  return (
    <div ref={box} aria-live="polite" className="pointer-events-none fixed left-0 top-0 z-[35]" style={{ maxWidth: wide ? 'min(18rem, 70vw)' : 'min(15rem, 60vw)', width: 'max-content' }}>
      <div className={`io-mini ${open ? 'io-mini-open' : ''} ${wide ? 'io-mini-wide' : ''}`}>
        <span className="io-mini-name">{IO.name}</span>
        {text}
      </div>
    </div>
  )
}
