import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry } from 'three'
import { scrollState } from '../../store/scroll'

const N = 30

// tiny seeded RNG so the layout is the same every load
function rng(seed) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const common = /* glsl */ `
  uniform float uTime;
  uniform float uFade;
  uniform float uPixelRatio;
  attribute float aRand;
  varying float vA;
  varying float vR;

  vec3 drift(vec3 p, float r, float t) {
    return p + 0.32 * vec3(sin(t * 0.40 + r * 6.2), cos(t * 0.35 + r * 5.1), sin(t * 0.30 + r * 4.3));
  }
`

const vertPoints = /* glsl */ `
  ${common}
  void main() {
    vec3 p = drift(position, aRand, uTime);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float pulse = 0.8 + 0.2 * sin(uTime * 1.3 + aRand * 20.0);
    vA = uFade * pulse;
    vR = aRand;
    gl_PointSize = (40.0 + 110.0 * aRand * aRand) * uPixelRatio * (7.5 / -mv.z);
  }
`

const vertLines = /* glsl */ `
  ${common}
  void main() {
    vec3 p = drift(position, aRand, uTime);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    vA = uFade * 0.22;
    vR = aRand;
  }
`

const fragPoints = /* glsl */ `
  varying float vA;
  varying float vR;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float core = smoothstep(0.22, 0.0, d);
    float halo = pow(1.0 - d, 2.6);
    vec3 col = mix(vec3(0.0, 0.85, 1.0), vec3(0.75, 0.97, 1.0), core);
    gl_FragColor = vec4(col, (halo * 0.55 + core) * vA);
  }
`

const fragLines = /* glsl */ `
  varying float vA;
  varying float vR;
  void main() { gl_FragColor = vec4(0.0, 0.85, 1.0, vA); }
`

/**
 * Floating glowing nodes joined by thin lines (a little "network").
 * Strongest on the hero, dims as you scroll on, and drifts upward with the page.
 */
export default function Orbs() {
  const dpr = useThree((s) => s.viewport.dpr)

  const { pts, lines } = useMemo(() => {
    const r = rng(77)
    const pos = []
    const rnd = []
    for (let i = 0; i < N; i++) {
      pos.push([(r() - 0.5) * 17, (r() - 0.5) * 9, -6 + r() * 7.5])
      rnd.push(r())
    }
    // connect each node to its 1-2 nearest neighbours
    const seg = []
    const segR = []
    const seen = new Set()
    for (let i = 0; i < N; i++) {
      const near = pos
        .map((p, j) => [j, Math.hypot(p[0] - pos[i][0], p[1] - pos[i][1], (p[2] - pos[i][2]) * 0.5)])
        .filter(([j, d]) => j !== i && d < 4.6)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 2)
      for (const [j] of near) {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`
        if (seen.has(key)) continue
        seen.add(key)
        seg.push(...pos[i], ...pos[j])
        segR.push(rnd[i], rnd[j])
      }
    }
    const pg = new BufferGeometry()
    pg.setAttribute('position', new BufferAttribute(new Float32Array(pos.flat()), 3))
    pg.setAttribute('aRand', new BufferAttribute(new Float32Array(rnd), 1))
    const lg = new BufferGeometry()
    lg.setAttribute('position', new BufferAttribute(new Float32Array(seg), 3))
    lg.setAttribute('aRand', new BufferAttribute(new Float32Array(segR), 1))
    return { pts: pg, lines: lg }
  }, [])

  const shared = useMemo(() => ({ uTime: { value: 0 }, uFade: { value: 1 }, uPixelRatio: { value: 1 } }), [])
  const group = useMemo(() => ({ current: null }), [])

  useFrame(({ clock }) => {
    const pos = scrollState.pos
    shared.uTime.value = clock.elapsedTime
    shared.uPixelRatio.value = dpr
    // bright on the hero, a calm background glow afterwards
    shared.uFade.value = 0.3 + 0.7 * (1 - Math.min(Math.max(pos / 1.2, 0), 1))
    if (group.current) group.current.position.y = pos * 1.6
  })

  return (
    <group ref={(g) => (group.current = g)}>
      <lineSegments geometry={lines} frustumCulled={false}>
        <shaderMaterial
          vertexShader={vertLines}
          fragmentShader={fragLines}
          uniforms={shared}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </lineSegments>
      <points geometry={pts} frustumCulled={false}>
        <shaderMaterial
          vertexShader={vertPoints}
          fragmentShader={fragPoints}
          uniforms={shared}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
    </group>
  )
}
