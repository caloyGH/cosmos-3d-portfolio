import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { scrollState } from '../../store/scroll'
import { createGates, createShards, createPulse, flightStrength } from './warpRig'

/** Ring gates + fly-by shards + a shockwave on every section change. All driven by scroll "travel". */
export default function Warp() {
  const gates = useMemo(() => createGates(8), [])
  const shards = useMemo(() => createShards(26), [])
  const pulse = useMemo(() => createPulse(), [])

  useFrame(({ clock }, dt) => {
    const fin = scrollState.fin
    const keep = 1 - Math.min(Math.max((fin - 0.05) / 0.25, 0), 1) // the gates and rocks fade out as the finale starts
    gates.root.visible = keep > 0.01
    shards.root.visible = keep > 0.01
    const s = flightStrength(scrollState.pos, scrollState.vel) * keep
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
