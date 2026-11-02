import { useEffect, useRef, useState } from 'react'
import { Section } from './ui'
import { IO } from '../../data/profile'
import { scrollState } from '../../store/scroll'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Types `lines` one after another (the orb "talks" while it types). */
function useTypedLines(lines, startDelay) {
  const [out, setOut] = useState([])
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (reduced()) {
      setOut(lines)
      setDone(true)
      return
    }
    let dead = false
    ;(async () => {
      await sleep(startDelay)
      for (let i = 0; i < lines.length && !dead; i++) {
        scrollState.ioTalk = 1
        for (let c = 1; c <= lines[i].length && !dead; c++) {
          setOut((o) => {
            const n = o.slice()
            n[i] = lines[i].slice(0, c)
            return n
          })
          await sleep(c % 12 === 0 ? 120 : 24)
        }
        scrollState.ioTalk = 0
        if (i < lines.length - 1) await sleep(560)
      }
      if (!dead) setDone(true)
    })()
    return () => {
      dead = true
      scrollState.ioTalk = 0
    }
  }, [lines, startDelay])

  return { out, done }
}

/** Intro: no headline. IO (the glowing orb in the 3D scene) greets you in a chat box, then tells you to scroll. */
export default function Hero() {
  const wrap = useRef(null)
  const { out, done } = useTypedLines(IO.lines, 2700) // starts right after the orb appears

  // the box drifts and fades as you scroll away
  useEffect(() => {
    const f = () => {
      const y = window.scrollY
      const k = Math.min(y / (window.innerHeight * 0.55), 1)
      if (wrap.current) {
        wrap.current.style.transform = `translateY(${y * 0.12}px)`
        wrap.current.style.opacity = String(1 - k)
      }
    }
    f()
    window.addEventListener('scroll', f, { passive: true })
    return () => window.removeEventListener('scroll', f)
  }, [])

  const typingIdx = done ? -1 : out.length - 1

  return (
    <Section id="hero" className="items-end pb-32 md:items-center md:pb-28">
      <div ref={wrap} className="io-anchor w-full max-w-[17.5rem] will-change-transform md:max-w-[19rem]">
        <div className="io-box" role="status" aria-live="polite">
          <div className="io-head">
            <span className="io-dot" />
            <span>{IO.name}</span>
            <span className="io-sub">· your guide</span>
          </div>

          <div className="io-body">
            {IO.lines.map((full, i) => {
              const text = out[i]
              if (text === undefined) return null
              const first = i === 0
              return (
                <p key={i} className={first ? 'io-line io-first' : 'io-line'}>
                  {text}
                  {typingIdx === i && <span className="io-caret" />}
                </p>
              )
            })}
          </div>

          {done && (
            <div className="io-cue">
              {IO.cue}
              <span className="io-arrows">
                <i />
                <i />
                <i />
              </span>
            </div>
          )}
          <span className="io-tail" />
        </div>
      </div>
    </Section>
  )
}
