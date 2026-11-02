import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, MathUtils } from 'three'

const { damp } = MathUtils

/** Pointer hover state (a ref, so no re-renders) + handlers to spread on a mesh. */
export function useHover() {
  const hovered = useRef(false)
  const bind = {
    onPointerOver: (e) => {
      e.stopPropagation()
      hovered.current = true
      document.body.style.cursor = 'pointer'
    },
    onPointerOut: () => {
      hovered.current = false
      document.body.style.cursor = 'auto'
    },
  }
  return { hovered, bind }
}

/** Smoothly raises the material's emissiveIntensity while hovered. */
export function useGlow(base = 0.25, hot = 1.2) {
  const mat = useRef()
  const { hovered, bind } = useHover()

  useFrame((_, dt) => {
    if (!mat.current) return
    mat.current.emissiveIntensity = damp(mat.current.emissiveIntensity, hovered.current ? hot : base, 6, dt)
  })

  return { mat, bind }
}

/* ---------- fresnel rim / glass shell ---------- */
const atmoVert = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`
const atmoFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uStrength;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    float f = pow(1.0 - max(dot(vN, vV), 0.0), uPower);
    gl_FragColor = vec4(uColor * f * uStrength, f);
  }
`

export function Atmosphere({ color, radius = 1.6, scale = 1.12, power = 3, strength = 1.2 }) {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new Color(color) },
      uPower: { value: power },
      uStrength: { value: strength },
    }),
    [color, power, strength]
  )
  return (
    <mesh scale={scale}>
      <sphereGeometry args={[radius, 64, 64]} />
      <shaderMaterial
        vertexShader={atmoVert}
        fragmentShader={atmoFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  )
}

/** A ring made of tiny glowing dots that slowly spins in its own plane. */
export function DotRing({ radius, count = 180, color = '#00f0ff', size = 0.045, speed = 0.1, rotation = [0, 0, 0] }) {
  const spin = useRef()

  const geometry = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2
      pos[i * 3] = Math.cos(a) * radius
      pos[i * 3 + 1] = 0
      pos[i * 3 + 2] = Math.sin(a) * radius
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(pos, 3))
    return g
  }, [count, radius])

  useFrame((_, dt) => {
    spin.current.rotation.y += dt * speed
  })

  return (
    <group rotation={rotation}>
      <group ref={spin}>
        <points geometry={geometry}>
          <pointsMaterial color={color} size={size} sizeAttenuation toneMapped={false} transparent opacity={0.9} depthWrite={false} />
        </points>
      </group>
    </group>
  )
}
