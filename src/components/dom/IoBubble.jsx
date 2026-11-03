import { useEffect, useRef, useState } from 'react'
import { IO } from '../../data/profile'
import { scrollState } from '../../store/scroll'

// the heart: each emoji gets a number (the order they pop in), empty cells stay 0
let n = 0
const HEART = IO.finaleHeart.flatMap((row) => [...row].map((c) => (c === 'X' ? ++n : 0)))
const HEART_CELLS = n

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Remarks from IO that appear next to it when you arrive at a section. In IO.stay sections (contact) it stays until you leave. */
export default function IoBubble() {
  const box = useRef(null)
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [wide, setWide] = useState(false)
  const [heart, setHeart] = useState(false) // the final bubble: a heart made of heart emojis
  const [shown, setShown] = useState(0)
  const run = useRef(0) // token so a newer remark cancels an older one

  // follow IO on screen
  useEffect(() => {
    let raf
    const loop = () => {
      const el = box.current
      if (el) {
        const W = window.innerWidth, H = window.innerHeight
        if (W < 768 || H < 500) { // phones (also turned sideways): a strip above the timeline
          if (W < 768 && scrollState.fin > 0.9) {
            // the very end on a phone: a small bubble stuck right under IO
            const io = scrollState.ioPos || scrollState.io
            const x = ((1 + io.x) / 2) * W, y = ((1 - io.y) / 2) * H
            const r = scrollState.io.r || 40
            const left = Math.min(Math.max(x - el.offsetWidth / 2, 8), W - el.offsetWidth - 8)
            el.style.transform = `translate3d(${left.toFixed(1)}px, ${(y + r * 0.8).toFixed(1)}px, 0)`
          } else el.style.transform = `translate3d(12px, ${(H - 92 - el.offsetHeight).toFixed(1)}px, 0)`
          raf = requestAnimationFrame(loop)
          return
        }
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
    let finSaid = false
    const sayHeart = async () => {
      const id = ++run.current
      setHeart(true)
      setShown(0)
      setWide(true)
      setText('')
      setOpen(true)
      scrollState.ioTalk = 1
      for (let c = 1; c <= IO.finaleText.length && run.current === id; c++) {
        setText(IO.finaleText.slice(0, c))
        await sleep(reduced() ? 0 : 30)
      }
      for (let i = 1; i <= HEART_CELLS && run.current === id; i++) {
        setShown(i)
        await sleep(reduced() ? 0 : 75)
      }
      scrollState.ioTalk = 0
    }
    const say = async (msg, stay) => {
      const id = ++run.current
      setHeart(false)
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
      if (stay && window.innerWidth >= 768 && window.innerHeight >= 500) return // stays until you leave the section (on phones it leaves by itself, it would cover the page)
      await sleep(stay ? 6500 : 4200)
      if (run.current === id) setOpen(false)
    }
    const loop = (now) => {
      // the very end of the page: IO says its last words
      if (scrollState.fin > 0.9 && !finSaid) {
        finSaid = true
        staying = 4
        sayHeart()
      } else if (finSaid && scrollState.fin < 0.8) {
        finSaid = false
        run.current++
        scrollState.ioTalk = 0
        setOpen(false)
        staying = 0
        last = 0
      }
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
        if (sec !== last && sec > 0 && IO.hints[sec] && now - since > 450 && scrollState.vel < 0.6 && scrollState.fin < 0.05) {
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
    <div ref={box} aria-live="polite" className="io-bubble-wrap pointer-events-none fixed left-0 top-0 z-[35]" style={{ maxWidth: wide ? 'min(18rem, 70vw)' : 'min(15rem, 60vw)', width: 'max-content' }}>
      <div className={`io-mini ${open ? 'io-mini-open' : ''} ${wide ? 'io-mini-wide' : ''}`}>
        <span className="io-mini-name">{IO.name}</span>
        {text}
        {heart && (
          <div className="io-hearts" aria-label="heart">
            {HEART.map((on, k) => (
              <i key={k} style={{ opacity: on && on <= shown ? 1 : 0, transform: on && on <= shown ? 'none' : 'scale(.3)' }}>{on ? '❤️' : ''}</i>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
