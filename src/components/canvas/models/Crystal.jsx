import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges, Float } from '@react-three/drei'
import { useGlow } from '../shared'
import Annotation from '../Annotation'

// small shards orbiting the crystal
const SHARDS = Array.from({ length: 6 }, (_, i) => {
  const a = (i / 6) * Math.PI * 2
  return {
    position: [Math.cos(a) * 2.1, Math.sin(i * 1.7) * 0.9, Math.sin(a) * 2.1],
    rotation: [a, a * 2, 0],
    scale: 0.16 + (i % 3) * 0.05,
  }
})

export default function Crystal({ color, index }) {
  const body = useRef()
  const shards = useRef()
  const { mat, bind } = useGlow(0.05, 0.8)

  useFrame((_, dt) => {
    body.current.rotation.y += dt * 0.35
    shards.current.rotation.y -= dt * 0.5
    shards.current.rotation.x += dt * 0.1
  })

  return (
    <Float speed={1.2} rotationIntensity={0.4} floatIntensity={1}>
      {/* iridescent crystal (needs the Environment for its reflections) */}
      <group ref={body}>
        <mesh scale={[1, 1.7, 1]} {...bind}>
          <octahedronGeometry args={[1.15, 0]} />
          <meshPhysicalMaterial
            ref={mat}
            color="#05070a"
            metalness={1}
            roughness={0.06}
            clearcoat={1}
            iridescence={1}
            iridescenceIOR={1.7}
            iridescenceThicknessRange={[200, 900]}
            envMapIntensity={2.2}
            emissive={color}
            emissiveIntensity={0.05}
          />
          <Edges threshold={15} color="#ffffff" />
        </mesh>
      </group>

      <group ref={shards}>
        {SHARDS.map((s, i) => (
          <mesh key={i} {...s}>
            <tetrahedronGeometry args={[1, 0]} />
            <meshPhysicalMaterial
              color="#05070a"
              metalness={1}
              roughness={0.1}
              iridescence={1}
              envMapIntensity={2}
            />
          </mesh>
        ))}
      </group>

      <mesh>
        <icosahedronGeometry args={[2.4, 1]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.07} />
      </mesh>

      <pointLight color={color} intensity={8} distance={9} />

      <Annotation index={index} from={[0.5, 1.4, 0.4]} to={[1.9, 2.5, 0]} title="REFRACT" value="1.62" />
      <Annotation index={index} from={[-0.6, -1.3, 0.4]} to={[-2.2, -2.3, 0]} title="FACETS" value="08" />
    </Float>
  )
}
