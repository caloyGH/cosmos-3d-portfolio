import { useEffect, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { scrollState } from '../../store/scroll'
import { createCore } from './coreRig'

/** The crystal "core" in the hero: reacts to the mouse and the scroll, then fades out as you leave. */
export default function HeroCore() {
  const core = useMemo(() => createCore(), [])
  const size = useThree((s) => s.size)
  const [ready, setReady] = useState(false)

  // appear once the loader has gone
  useEffect(() => {
    const id = setTimeout(() => setReady(true), 1700)
    return () => clearTimeout(id)
  }, [])

  useFrame(({ clock, pointer }, dt) => {
    core.update(clock.elapsedTime, Math.min(dt, 0.05), scrollState.pos, scrollState.vel, pointer, size.width > 1024, ready)
  })

  return <primitive object={core.root} />
}
