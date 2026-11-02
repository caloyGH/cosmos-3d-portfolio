import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial } from '@react-three/drei'
import { Atmosphere, useGlow } from '../shared'
import Annotation from '../Annotation'

/** A metallic gyroscope ring with a glowing node riding on it. */
function GyroRing({ radius, speed, axis = 'x', tilt = 0, color }) {
  const spin = useRef()

  useFrame((_, dt) => {
    spin.current.rotation[axis] += dt * speed
  })

  return (
    <group rotation={[0, 0, tilt]}>
      <group ref={spin}>
        <mesh>
          <torusGeometry args={[radius, 0.035, 24, 180]} />
          <meshStandardMaterial color="#0b0f14" metalness={1} roughness={0.18} envMapIntensity={1.8} />
        </mesh>
        <mesh position={[radius, 0, 0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

export default function EnergyCore({ color, index }) {
  const { mat, bind } = useGlow(1.2, 2.4)

  return (
    <Float speed={1.6} rotationIntensity={0.3} floatIntensity={1}>
      {/* pulsing energy core */}
      <mesh {...bind}>
        <icosahedronGeometry args={[0.95, 12]} />
        <MeshDistortMaterial
          ref={mat}
          color="#031018"
          emissive={color}
          emissiveIntensity={1.2}
          roughness={0.2}
          metalness={0.8}
          distort={0.32}
          speed={2}
        />
      </mesh>

      {/* glass shell + lattice */}
      <Atmosphere color={color} radius={1.45} scale={1} power={1.6} strength={0.55} />
      <mesh>
        <icosahedronGeometry args={[1.45, 2]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.12} />
      </mesh>

      {/* gyroscope rings */}
      <GyroRing radius={1.9} speed={0.6} axis="x" tilt={0} color={color} />
      <GyroRing radius={2.3} speed={-0.45} axis="y" tilt={0.6} color="#ffffff" />
      <GyroRing radius={2.7} speed={0.3} axis="x" tilt={-0.9} color={color} />

      <pointLight color={color} intensity={10} distance={8} />

      <Annotation index={index} from={[1.0, 0.9, 0.5]} to={[2.0, 2.3, 0]} title="ENERGY" value="98.6%" />
      <Annotation index={index} from={[-1.0, -0.9, 0.5]} to={[-2.4, -2.2, 0]} title="RING.SYNC" value="03/03" />
    </Float>
  )
}
