import { useMemo, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { MathUtils } from 'three'
import { scrollState } from '../../store/scroll'
import { IO } from '../../data/profile'
import { createGuide } from './guideRig'

/**
 * The guide: a glass-and-metal orb that opens the hero, then keeps gliding along with you down the page.
 * Offline image-based lighting is built from Lightformers (no HDR download needed).
 */
export default function GuideCore() {
  const guide = useMemo(() => createGuide(), [])
  const size = useThree((s) => s.size)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setReady(true), 1700) // after the loader
    return () => clearTimeout(id)
  }, [])

  useFrame(({ clock, pointer, camera }, dt) => {
    const desktop = size.width > 1024
    guide.setQuality(desktop)
    const halfH = Math.tan(MathUtils.degToRad(camera.fov / 2)) * (7.5 - 0.5)
    const halfW = (halfH * size.width) / size.height
    guide.update(clock.elapsedTime, Math.min(dt, 0.05), scrollState.pos, scrollState.vel, pointer, desktop, ready, halfW, halfH, scrollState.ioTalk)
    guide.root.visible = IO.style === 'orb' // the mascot (DOM) is drawn instead; the rig still provides its position
    const io = scrollState.io
    io.x = guide.state.x / halfW
    io.y = guide.state.y / halfH
    io.speed = guide.state.speed
    io.s = guide.target.s
    // finale: IO is pulled into the black hole with everything else, then comes back to the right of the centre to say goodbye (its bubble opens to its left)
    const f = scrollState.fin
    if (f > 0.02) {
      const sst = (a, b, v) => { const t = Math.min(Math.max((v - a) / (b - a), 0), 1); return t * t * (3 - 2 * t) }
      const gone = sst(0.14, 0.5, f) * (1 - sst(0.86, 0.97, f))
      const back = sst(0.86, 0.97, f)
      const small = size.width < 768
      io.x = io.x * (1 - gone - back) + (small ? 0.0 : 0.8) * back
      io.y = io.y * (1 - gone - back) + (small ? -0.05 : 0.02) * back
      io.s = io.s * (1 - 0.97 * gone - (small ? 0.3 : 0.15) * back)
    }
  })

  return (
    <>
      {IO.style === 'orb' && (
      <Environment resolution={128} background={false}>
        <Lightformer form="rect" intensity={5} color="#00f0ff" position={[-6, 2, -4]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={3} color="#4d7cff" position={[6, -2, -3]} scale={[8, 4, 1]} />
        <Lightformer form="ring" intensity={4} color="#ffffff" position={[0, 5, -5]} scale={4} />
        <Lightformer form="rect" intensity={1.6} color="#ffffff" position={[0, -4, 4]} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={2} color="#00f0ff" position={[4, 3, 4]} scale={[3, 6, 1]} />
      </Environment>
      )}
      <primitive object={guide.root} />
    </>
  )
}
