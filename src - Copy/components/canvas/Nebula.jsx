import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils, Vector2, Vector3 } from 'three'
import { scrollState } from '../../store/scroll'
import { tintAt } from './palette'

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0); // full-screen quad
  }
`

const fragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uPos;
  uniform float uAspect;
  uniform vec2 uCenter;
  uniform vec3 uTintA;
  uniform vec3 uTintB;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.02 + 7.1;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    vec2 q = p - uCenter;

    // the clouds drift as you scroll (a sense of moving through the nebula)
    float n = fbm(q * 1.6 + vec2(uTime * 0.03, uPos * 0.6));
    float glow = smoothstep(1.5, 0.0, length(q));
    float bottom = smoothstep(-0.15, -0.55, p.y);

    vec3 col = vec3(0.0, 0.018, 0.07);
    col += uTintA * glow * (0.25 + 0.5 * n) * 0.55;
    col += uTintB * pow(glow, 3.0) * n * 0.25;
    col += uTintA * bottom * 0.12;

    col = pow(col, vec3(2.2));   // perceptual -> linear buffer
    col += 0.003;
    gl_FragColor = vec4(col, 1.0);
  }
`

/** Soft nebula glow behind the particles. Its colour drifts from sector to sector. */
export default function Nebula() {
  const mat = useRef()
  const pos = useRef(0)
  const cx = useRef(0)
  const tmp = useMemo(() => [[0, 0, 0], [0, 0, 0]], [])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPos: { value: 0 },
      uAspect: { value: 1 },
      uCenter: { value: new Vector2(0, 0) },
      uTintA: { value: new Vector3(0.05, 0.22, 0.75) },
      uTintB: { value: new Vector3(0.0, 0.6, 0.9) },
    }),
    []
  )

  useFrame(({ size, camera }, dt) => {
    pos.current = MathUtils.damp(pos.current, scrollState.pos, 3, dt)
    const u = mat.current.uniforms

    // follow the particle shape (it sits 2.3 units right of centre on desktop)
    const halfH = Math.tan(MathUtils.degToRad(45 / 2)) * camera.position.z
    cx.current = MathUtils.damp(cx.current, size.width > 1024 ? 2.3 / (2 * halfH) : 0, 4, dt)

    const [a, b] = tintAt(pos.current, tmp)
    u.uTintA.value.set(a[0], a[1], a[2])
    u.uTintB.value.set(b[0], b[1], b[2])

    u.uTime.value += dt
    u.uPos.value = pos.current
    u.uAspect.value = size.width / size.height
    u.uCenter.value.set(cx.current, 0)
  })

  return (
    <mesh frustumCulled={false} renderOrder={-10}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}
