import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, MathUtils } from 'three'
import { scrollState } from '../../store/scroll'

// Hyperspace streaks: thin lines that shoot outward from the centre of the screen while you scroll fast.
// Scrolling back up reverses them (they rush inward). Invisible when you are still.
export const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0); // full-screen quad in clip space
  }
`

export const fragment = /* glsl */ `
  uniform float uTime;
  uniform float uAmt;     // 0..1 how hard you are travelling
  uniform float uDir;     // +1 outward (scrolling down), -1 inward
  uniform float uAspect;
  uniform vec3 uColor;
  varying vec2 vUv;

  float hash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }

  void main() {
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    float r = length(p);
    float a = atan(p.y, p.x) / 6.2831853;       // -0.5 .. 0.5
    float acc = 0.0;

    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float N = 110.0 + fi * 80.0;                // number of angular slots in this layer
      float s = a * N;
      float id = floor(s);
      float f = fract(s);
      float h = hash(id + fi * 31.7);
      float h2 = hash(id * 1.37 + fi * 7.1);
      // each slot has one streak that travels along the radius
      float spd = 0.45 + h * 1.1;
      float ph = fract(h2 * 9.0 - uTime * spd * uDir * (0.4 + uAmt * 1.4));
      float head = ph * ph * 1.35;               // accelerates toward the edge
      float len = 0.06 + (0.12 + 0.55 * h) * uAmt;
      float tail = clamp((head - r) / len, 0.0, 1.0);
      float body = (1.0 - tail) * step(r, head);  // bright at the head, fades toward the centre
      float d = abs(f - 0.5) * 6.2831853 * r / N;     // distance from the streak's centre line, in screen units
      float th = 0.0017 + 0.0018 * h2 * uAmt;
      float w = smoothstep(th, th * 0.25, d);
      float on = step(0.35, h);                      // only some slots are active
      acc += w * body * on * (0.45 + 0.55 * h2);
    }
    float fade = smoothstep(0.12, 0.45, r);       // keep the middle of the screen clear
    float k = acc * fade * uAmt;
    gl_FragColor = vec4(uColor * k * 2.2, k);
  }
`

export default function SpeedLines() {
  const size = useThree((s) => s.size)
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uAmt: { value: 0 }, uDir: { value: 1 }, uAspect: { value: 1.6 }, uColor: { value: { r: 0.55, g: 0.85, b: 1.0 } } }),
    []
  )
  const state = useMemo(() => ({ amt: 0, dir: 1 }), [])
  const mesh = useMemo(() => ({ current: null }), [])

  useFrame(({ clock }, dt) => {
    const target = MathUtils.smoothstep(Math.min(scrollState.vel, 3), 0.12, 1.6)
    state.amt = MathUtils.damp(state.amt, target, target > state.amt ? 7 : 3, dt)
    if (Math.abs(scrollState.svel) > 0.05) state.dir = MathUtils.damp(state.dir, Math.sign(scrollState.svel), 8, dt)
    const u = uniforms
    u.uTime.value = clock.elapsedTime
    u.uAmt.value = state.amt
    u.uDir.value = state.dir
    u.uAspect.value = size.width / size.height
    if (mesh.current) mesh.current.visible = state.amt > 0.01
  })

  return (
    <mesh ref={(m) => (mesh.current = m)} frustumCulled={false} renderOrder={4}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  )
}
