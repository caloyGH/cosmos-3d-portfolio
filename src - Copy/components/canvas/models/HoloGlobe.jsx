import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, MathUtils } from 'three'
import { Atmosphere, DotRing, useHover } from '../shared'
import Annotation from '../Annotation'

const R = 1.6
const COUNT = 4800

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  attribute float aRand;
  varying float vFres;
  varying float vFace;
  varying float vBand;
  varying float vRand;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * position);
    vec3 v = normalize(-mv.xyz);
    float facing = dot(n, v);

    vFres = pow(1.0 - abs(facing), 1.6);                       // brighter toward the rim
    vFace = mix(0.35, 1.0, smoothstep(-0.2, 0.3, facing));     // far side is dimmer
    vRand = aRand;

    // scan band sweeping up the globe
    float h = position.y / ${R.toFixed(1)} * 0.5 + 0.5;
    vBand = smoothstep(0.12, 0.0, abs(h - fract(uTime * 0.1)));

    float twinkle = 0.65 + 0.35 * sin(uTime * 2.0 + aRand * 40.0);
    gl_PointSize = uSize * uPixelRatio * (8.0 / -mv.z) * (0.6 + 0.8 * aRand) * twinkle;
    gl_Position = projectionMatrix * mv;
  }
`

const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uBoost;
  varying float vFres;
  varying float vFace;
  varying float vBand;
  varying float vRand;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d);                        // soft round dot

    float lum = (0.35 + 1.1 * vFres + 1.8 * vBand + 0.6 * uBoost) * vFace;
    vec3 c = uColor * lum;
    c = mix(c, vec3(lum), step(0.97, vRand) * 0.8);            // a few white sparkles

    gl_FragColor = vec4(c, a * (0.55 + 0.45 * vFres + vBand) * vFace);
  }
`

/** Evenly spread points on a sphere (Fibonacci lattice). */
function buildGlobe() {
  const pos = new Float32Array(COUNT * 3)
  const rnd = new Float32Array(COUNT)
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < COUNT; i++) {
    const y = 1 - (i / (COUNT - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const t = golden * i
    pos[i * 3] = Math.cos(t) * r * R
    pos[i * 3 + 1] = y * R
    pos[i * 3 + 2] = Math.sin(t) * r * R
    rnd[i] = Math.random()
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(pos, 3))
  g.setAttribute('aRand', new BufferAttribute(rnd, 1))
  return g
}

export default function HoloGlobe({ color, index }) {
  const dpr = useThree((s) => s.viewport.dpr)
  const points = useRef()
  const mat = useRef()
  const boost = useRef(0)
  const { hovered, bind } = useHover()

  const geometry = useMemo(buildGlobe, [])
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColor: { value: new Color(color) },
      uSize: { value: 2.4 },
      uPixelRatio: { value: dpr },
      uBoost: { value: 0 },
    }),
    [color, dpr]
  )

  useFrame((_, dt) => {
    boost.current = MathUtils.damp(boost.current, hovered.current ? 1 : 0, 6, dt)
    mat.current.uniforms.uTime.value += dt
    mat.current.uniforms.uBoost.value = boost.current
    points.current.rotation.y += dt * (0.12 + boost.current * 0.35)
  })

  return (
    <Float speed={1.4} rotationIntensity={0.2} floatIntensity={0.8}>
      <points ref={points} geometry={geometry}>
        <shaderMaterial
          ref={mat}
          vertexShader={vertex}
          fragmentShader={fragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>

      {/* invisible hit area for hover */}
      <mesh {...bind}>
        <sphereGeometry args={[R * 1.05, 24, 24]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>

      <Atmosphere color={color} radius={R} scale={1.1} power={3.5} strength={0.9} />

      {/* rings */}
      <mesh rotation={[Math.PI / 2.3, 0.2, 0]}>
        <torusGeometry args={[2.7, 0.012, 16, 240]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <DotRing radius={2.3} count={140} color={color} speed={0.18} rotation={[Math.PI / 2.3, 0.2, 0]} />
      <DotRing radius={3.1} count={220} color="#ffffff" size={0.03} speed={-0.1} rotation={[Math.PI / 2.7, -0.3, 0.15]} />

      <pointLight color={color} intensity={6} distance={9} />

      <Annotation index={index} from={[1.1, 1.0, 0.6]} to={[2.6, 2.3, 0]} title="NODES" value="4,800" />
      <Annotation index={index} from={[-1.0, -1.0, 0.7]} to={[-2.3, -2.2, 0]} title="CORE" value="ONLINE" />
    </Float>
  )
}
