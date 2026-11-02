import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import GlBoundary from './GlBoundary'
import TravelFx from './TravelFx'
import Nebula from './Nebula'
import Planet from './Planet'
import StarField from './StarField'
// import Orbs from './Orbs'
// import ParticleField from './ParticleField'
// import Nodes from './Nodes'
import Warp from './Warp'
import SpeedLines from './SpeedLines'
import GuideCore from './GuideCore'
import BlackHole from './BlackHole'
import Effects from './Effects'

const BG = '#0a0a0a'

export default function Experience() {
  const [hq, setHq] = useState(true) // sharp (up to 2x pixels, smooth edges); drops to 1x automatically if the GPU struggles
  return (
    <GlBoundary>
    <Canvas
      camera={{ position: [0, 0, 7.5], fov: 45 }}
      dpr={[1, hq ? 2 : 1]}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (ev) => ev.preventDefault())
        // remember shader compile errors so ?debug can show them on screen (see DebugBadge)
        gl.debug.onShaderError = (ctx, program, vs, fs) => {
          const log = (ctx.getShaderInfoLog(fs) || '') + (ctx.getShaderInfoLog(vs) || '') + (ctx.getProgramInfoLog(program) || '')
          ;(window.__cosmosErrors = window.__cosmosErrors || []).push(log.trim().split('\n').slice(0, 3).join(' | '))
        }
      }}
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
        <GuideCore /> {/* invisible: only drives where IO floats */}
        {/* <Orbs /> off for the smoothness test */}
        {/* <Nodes /> off for the smoothness test */}
        {/* <ParticleField /> off for the smoothness test */}
        <BlackHole />
        <Effects hq={hq} />
      </Suspense>
    </Canvas>
    </GlBoundary>
  )
}
