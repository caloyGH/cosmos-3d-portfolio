import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils } from 'three'
import { scrollState } from '../../store/scroll'

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
  uniform float uIntensity;

  mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

  void main() {
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);

    // scroll morph: vertical arc on the right -> horizontal waves at the top
    float sweep = smoothstep(0.0, 2.5, uPos);
    float lift = smoothstep(1.0, 3.0, uPos);
    vec2 q = p - vec2(mix(0.55, -0.05, sweep), mix(0.0, 0.3, lift));
    q = rot(mix(1.35, 0.08, sweep) + sin(uPos * 1.7) * 0.12) * q;

    vec3 cyan = vec3(0.0, 0.94, 1.0);
    vec3 blue = vec3(0.22, 0.42, 1.0);
    vec3 mint = vec3(0.25, 1.0, 0.72);

    vec3 col = vec3(0.0);
    for (int i = 0; i < 12; i++) {
      float t = float(i) / 11.0;
      float k = t - 0.5;

      // thin strands that converge and fan out along the bundle
      float fan = 0.03 + 0.26 * (0.5 + 0.5 * sin(q.x * 1.3 + uTime * 0.12));
      float y = sin(q.x * 2.0 + uTime * 0.3 + k * 2.4) * 0.2
              + sin(q.x * 0.8 - uTime * 0.2 + k) * 0.17
              + k * fan;

      float d = abs(q.y - y);
      float core = smoothstep(0.0035, 0.0, d);
      float halo = exp(-d * 60.0) * 0.18;

      // light pulses travelling along each strand
      float pulse = 0.65 + 0.35 * sin(q.x * 3.0 - uTime * 0.8 + t * 12.0);

      vec3 c = mix(mix(cyan, blue, smoothstep(0.0, 0.5, t)), mint, smoothstep(0.55, 1.0, t));
      col += c * (core + halo) * pulse;
    }

    float mask = smoothstep(1.5, 0.2, abs(q.x));
    float side = mix(0.3, 1.0, smoothstep(-0.8, 0.5, p.x)); // keep the left readable
    side = mix(0.6, side, step(1.0, uAspect));              // mobile: dim everywhere

    col *= mask * side * uIntensity;
    col = 1.0 - exp(-col * 2.0);        // soft shoulder: no blown-out white where strands overlap
    col = pow(col, vec3(1.8));          // sRGB look -> linear buffer
    col += vec3(0.003);                 // ~#0a0a0a base

    gl_FragColor = vec4(col, 1.0);
  }
`

export default function Ribbons() {
  const mat = useRef()
  const pos = useRef(0)
  const { size } = useThree()

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPos: { value: 0 },
      uAspect: { value: 1 },
      uIntensity: { value: 0.6 },
    }),
    []
  )

  useFrame((_, dt) => {
    pos.current = MathUtils.damp(pos.current, scrollState.pos, 3, dt)
    const u = mat.current.uniforms
    u.uTime.value += dt
    u.uPos.value = pos.current
    u.uAspect.value = size.width / size.height
    // subtle in the hero, stronger the deeper you scroll
    u.uIntensity.value = 0.55 + 0.6 * MathUtils.smoothstep(pos.current, 0.3, 3)
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
