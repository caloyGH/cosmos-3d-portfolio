import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { scrollState } from '../../store/scroll'
import { createGates, createShards, createPulse, flightStrength } from './warpRig'

/** Ring gates + fly-by shards + a shockwave on every section change. All driven by scroll "travel". */
export default function Warp() {
  const gates = useMemo(() => createGates(12), [])
  const shards = useMemo(() => createShards(90), [])
  const pulse = useMemo(() => createPulse(), [])

  useFrame(({ clock }, dt) => {
    const s = flightStrength(scrollState.pos, scrollState.vel)
    const t = clock.elapsedTime
    gates.update(scrollState.travel, s, t)
    shards.update(scrollState.travel, s, scrollState.vel, t)
    pulse.update(scrollState.pos, Math.min(dt, 0.05))
  })

  useEffect(() => () => { gates.root.clear?.() }, [gates])

  return (
    <>
      <primitive object={gates.root} />
      <primitive object={shards.root} />
      <primitive object={pulse.root} />
    </>
  )
}
