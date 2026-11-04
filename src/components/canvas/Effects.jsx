import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing'
import { MathUtils, Vector2 } from 'three'
import { scrollState } from '../../store/scroll'

/** hq: smooth (4x MSAA) edges. Experience turns it off automatically if the GPU struggles. */
export default function Effects({ hq = true, lite = false }) {
  const offset = useMemo(() => new Vector2(0.0005, 0.0005), [])
  const last = useRef(scrollState.pos)
  const vel = useRef(0)

  // chromatic aberration "kicks" when you scroll fast (a cheap glitch feel)
  useFrame((_, dt) => {
    const speed = Math.abs(scrollState.pos - last.current) / Math.max(dt, 0.001)
    last.current = scrollState.pos
    vel.current = MathUtils.damp(vel.current, speed, 6, dt)
    const k = 0.0005 + Math.min(vel.current * 0.006, 0.013)
    offset.set(k, k)
  })

  // phones: no post-processing at all (the bloom's mip chain costs a lot of fill rate); a CSS vignette stands in for it
  if (lite) return null

  return (
    <EffectComposer multisampling={hq ? 4 : 0}>
      <Bloom intensity={0.9} luminanceThreshold={0.55} luminanceSmoothing={0.3} mipmapBlur />
      <ChromaticAberration offset={offset} radialModulation={false} modulationOffset={0} />
      <Vignette offset={0.25} darkness={0.8} />
    </EffectComposer>
  )
}
