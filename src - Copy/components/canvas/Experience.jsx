import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import GlBoundary from './GlBoundary'
import TravelFx from './TravelFx'
import Nebula from './Nebula'
import Planet from './Planet'
import StarField from './StarField'
import Orbs from './Orbs'
import ParticleField from './ParticleField'
import Nodes from './Nodes'
import Warp from './Warp'
import SpeedLines from './SpeedLines'
import GuideCore from './GuideCore'
import Effects from './Effects'

const BG = '#0a0a0a'

export default function Experience() {
  const [hq, setHq] = useState(true) // sharp (up to 2x pixels, smooth edges); drops to 1x automatically if the GPU struggles
  return (
    <GlBoundary>
    <Canvas
      camera={{ position: [0, 0, 7.5], fov: 45 }}
      dpr={[1, hq ? 2 : 1]}
      onCreated={({ gl }) => gl.domElement.addEventListener('webglcontextlost', (ev) => ev.preventDefault())}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      // listen on #root so the pointer still reaches the canvas under the scrolling HTML
      eventSource={document.getElementById('root')}
      eventPrefix="client"
    >
      <color attach="background" args={[BG]} />
      <PerformanceMonitor onDecline={() => setHq(false)} flipflops={2} />

      <Suspense fallback={null}>
        <TravelFx />
        <Nebula />
        <Planet />
        <StarField />
        <Warp />
        <SpeedLines />
        <GuideCore />
        <Orbs />
        <Nodes />
        <ParticleField />
        <Effects hq={hq} />
      </Suspense>
    </Canvas>
    </GlBoundary>
  )
}
