import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, MathUtils } from 'three'
import { scrollState } from '../../store/scroll'

const N = 54
const MAX_SEG = 150
const LINK = 3.1 // max distance for a link

function rng(seed) {
  let s = seed
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

const vertex = /* glsl */ `
  uniform float uPixelRatio;
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime;
  varying float vA;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 0.7 + 0.3 * sin(uTime * 1.5 + aPhase * 6.28);
    vA = tw;
    gl_PointSize = aSize * uPixelRatio * tw * (9.0 / -mv.z);
  }
`
const fragment = /* glsl */ `
  uniform float uOpacity;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = smoothstep(0.5, 0.0, d);
    float a = pow(core, 1.6) * vA * uOpacity;
    gl_FragColor = vec4(mix(vec3(0.0, 0.7, 1.0), vec3(0.85, 1.0, 1.0), core * core), a);
  }
`

/** Floating glowing nodes joined by thin lines: a drifting "network" around the intro. */
export default function Nodes() {
  const dpr = useThree((s) => s.viewport.dpr)
  const group = useRef()

  const { base, phase, pointsGeo, linesGeo, uniforms } = useMemo(() => {
    const r = rng(77)
    const base = new Float32Array(N * 3)
    const phase = new Float32Array(N)
    const size = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      base[i * 3] = (r() - 0.5) * 17
      base[i * 3 + 1] = (r() - 0.5) * 9
      base[i * 3 + 2] = -5 + r() * 7
      phase[i] = r()
      size[i] = 4 + r() * r() * 22
    }
    const pointsGeo = new BufferGeometry()
    pointsGeo.setAttribute('position', new BufferAttribute(new Float32Array(N * 3), 3))
    pointsGeo.setAttribute('aSize', new BufferAttribute(size, 1))
    pointsGeo.setAttribute('aPhase', new BufferAttribute(phase, 1))
    const linesGeo = new BufferGeometry()
    linesGeo.setAttribute('position', new BufferAttribute(new Float32Array(MAX_SEG * 6), 3))
    linesGeo.setAttribute('color', new BufferAttribute(new Float32Array(MAX_SEG * 6), 3))
    linesGeo.setDrawRange(0, 0)
    return {
      base, phase, pointsGeo, linesGeo,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uOpacity: { value: 1 } },
    }
  }, [])

  const cur = useMemo(() => new Float32Array(N * 3), [])

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const pos = pointsGeo.attributes.position.array
    for (let i = 0; i < N; i++) {
      const ph = phase[i] * 6.28
      cur[i * 3] = base[i * 3] + Math.sin(t * 0.25 + ph) * 0.45
      cur[i * 3 + 1] = base[i * 3 + 1] + Math.cos(t * 0.21 + ph * 1.3) * 0.4
      cur[i * 3 + 2] = base[i * 3 + 2] + Math.sin(t * 0.18 + ph * 0.7) * 0.35
    }
    pos.set(cur)
    pointsGeo.attributes.position.needsUpdate = true

    // links between close nodes (brightness falls off with distance)
    const lp = linesGeo.attributes.position.array
    const lc = linesGeo.attributes.color.array
    let seg = 0
    for (let i = 0; i < N && seg < MAX_SEG; i++) {
      for (let j = i + 1; j < N && seg < MAX_SEG; j++) {
        const dx = cur[i * 3] - cur[j * 3], dy = cur[i * 3 + 1] - cur[j * 3 + 1], dz = cur[i * 3 + 2] - cur[j * 3 + 2]
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (d > LINK) continue
        const k = (1 - d / LINK) * 0.55
        lp.set([cur[i * 3], cur[i * 3 + 1], cur[i * 3 + 2], cur[j * 3], cur[j * 3 + 1], cur[j * 3 + 2]], seg * 6)
        lc.set([0, 0.75 * k, 1 * k, 0, 0.75 * k, 1 * k], seg * 6)
        seg++
      }
    }
    linesGeo.setDrawRange(0, seg * 2)
    linesGeo.attributes.position.needsUpdate = true
    linesGeo.attributes.color.needsUpdate = true

    uniforms.uTime.value = t
    uniforms.uPixelRatio.value = dpr
    // strongest in the intro, a quiet backdrop afterwards
    const p = scrollState.pos
    uniforms.uOpacity.value = MathUtils.damp(uniforms.uOpacity.value, p < 1 ? 1 : 0.35, 2.5, dt)

    // the network drifts upward with the scroll and slides toward you as you "travel"
    const g = group.current
    g.position.y = MathUtils.damp(g.position.y, p * 1.2, 3, dt)
    g.position.z = MathUtils.damp(g.position.z, Math.min(scrollState.vel, 3) * 0.9, 3, dt)
  })

  return (
    <group ref={group}>
      <lineSegments geometry={linesGeo} frustumCulled={false}>
        <lineBasicMaterial vertexColors transparent depthWrite={false} blending={AdditiveBlending} />
      </lineSegments>
      <points geometry={pointsGeo} frustumCulled={false}>
        <shaderMaterial
          vertexShader={vertex}
          fragmentShader={fragment}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
    </group>
  )
}
