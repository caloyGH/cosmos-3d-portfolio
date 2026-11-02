import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import { MathUtils } from 'three'
import { scrollState } from '../../store/scroll'

/**
 * Floating HUD label with a leader line pointing at a spot on a 3D object.
 * `index` = which scene it belongs to (it fades in/out with the scroll position).
 */
export default function Annotation({ index, from, to, title, value }) {
  const el = useRef()

  useFrame(() => {
    if (!el.current) return
    const v = MathUtils.clamp(1 - Math.abs(scrollState.pos - index) * 1.8, 0, 1)
    el.current.style.opacity = v
    el.current.style.visibility = v < 0.02 ? 'hidden' : 'visible'
  })

  return (
    <group>
      <Line points={[from, to]} color="#00f0ff" lineWidth={1} transparent opacity={0.55} />
      <mesh position={from}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshBasicMaterial color="#00f0ff" toneMapped={false} />
      </mesh>
      <Html position={to} pointerEvents="none" zIndexRange={[10, 0]}>
        <div
          ref={el}
          style={{ transform: 'translateY(-50%)' }}
          className="whitespace-nowrap border border-neon/40 bg-black/50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-neon backdrop-blur-md"
        >
          <span className="text-white/50">{title} </span>
          {value}
        </div>
      </Html>
    </group>
  )
}
