import { useEffect, useRef, useState } from 'react'
import { scrollState } from '../../store/scroll'
import { createSpaceSound } from '../../audio/spaceSound'

/** Small speaker button (bottom-left). Sound is OFF until the visitor turns it on. */
export default function SoundToggle() {
  const sound = useRef(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    sound.current = createSpaceSound()
    return () => sound.current?.stop()
  }, [])

  // while on: wind follows the scroll speed, and a chime plays when you settle on a new section
  useEffect(() => {
    if (!on) return
    let raf = 0
    let shown = Math.round(scrollState.pos)
    let cand = shown
    let since = performance.now()
    const loop = () => {
      sound.current.update(scrollState.vel)
      const sec = Math.round(scrollState.pos)
      const now = performance.now()
      if (sec !== cand) { cand = sec; since = now }
      if (sec !== shown && now - since > 450 && scrollState.vel < 0.5) { shown = sec; sound.current.chime() }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [on])

  const toggle = async () => {
    if (on) { sound.current.stop(); setOn(false); return }
    if (await sound.current.start()) setOn(true)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? 'Turn sound off' : 'Turn sound on'}
      title={on ? 'Sound on' : 'Sound off'}
      className="sndbtn"
      data-on={on}
    >
      <span className="sndbars" aria-hidden="true">
        <i /><i /><i /><i />
      </span>
    </button>
  )
}
