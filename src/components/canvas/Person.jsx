import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { MathUtils } from 'three'
import { scrollState } from '../../store/scroll'
import photo from '../../assets/me-cut.webp'

const { damp } = MathUtils
const W = 716, H = 1000
const HEIGHT = 4.3 // world units tall
const sstep = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t) }

// piecewise-linear keyframes over scrollState.pos (0 = hero ... 1 = about)
function track(p, keys) {
  if (p <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    if (p <= keys[i][0]) {
      const [a, va] = keys[i - 1], [b, vb] = keys[i]
      const t = sstep(0, 1, (p - a) / (b - a))
      return va + (vb - va) * t
    }
  }
  return keys[keys.length - 1][1]
}
// x: right -> left (caption B on the right) -> right again;  yaw: slowly "turns" as you scroll
const X = [[0, 2.3], [0.16, 2.3], [0.4, -2.0], [0.62, -2.0], [0.78, 2.1], [1, 2.6]]
const YAW = [[0, -0.12], [0.16, -0.12], [0.4, 0.55], [0.62, 0.45], [0.78, -0.5], [1, -0.2]]

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec2 uTexel;
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    vec4 c = texture2D(uMap, vUv);
    float a = c.a;

    // blurred silhouette -> inner rim light + outer halo (so the dark outfit still reads in the dark)
    float blur = 0.0;
    for (int i = 0; i < 12; i++) {
      float ang = float(i) * 0.5236;
      vec2 o = vec2(cos(ang), sin(ang)) * uTexel * 14.0;
      blur += texture2D(uMap, vUv + o).a + texture2D(uMap, vUv + o * 0.5).a;
    }
    blur /= 24.0;
    float rim = a * (1.0 - blur);
    float halo = blur * (1.0 - a);

    vec3 cyan = vec3(0.0, 0.94, 1.0);
    vec3 col = pow(c.rgb, vec3(0.72)) * 1.25;                      // lift shadows a little
    col += cyan * rim * (1.1 + 0.25 * sin(uTime * 1.6));
    col += cyan * 0.06 * smoothstep(0.0, 1.0, vUv.y);                // faint teal wash from above

    // soft fade at the feet so he floats in the dark
    float feet = smoothstep(0.0, 0.1, vUv.y);
    // faint hologram scanlines
    float scan = 0.94 + 0.06 * sin(vUv.y * 420.0 - uTime * 2.0);

    float alpha = clamp(a + halo * 0.55, 0.0, 1.0) * feet * uOpacity;
    vec3 rgb = (col * a * scan + cyan * halo * 0.55) / max(a + halo * 0.55, 1e-3);
    gl_FragColor = vec4(rgb, alpha);
  }
`

/** Your photo floating in the 3D scene: slides, turns and fades as you scroll the intro. */
export default function Person() {
  const tex = useTexture(photo)
  const mesh = useRef()
  const uniforms = useMemo(
    () => ({
      uMap: { value: tex },
      uTexel: { value: [1 / W, 1 / H] },
      uTime: { value: 0 },
      uOpacity: { value: 0 },
    }),
    [tex]
  )

  useFrame(({ clock, pointer, size }, dt) => {
    const m = mesh.current
    if (!m) return
    const p = scrollState.pos
    const desktop = size.width > 1024
    const t = clock.elapsedTime

    const tx = desktop ? track(p, X) : 0
    m.position.x = damp(m.position.x, tx, 4, dt)
    m.position.y = damp(m.position.y, Math.sin(t * 0.8) * 0.07 - p * 0.4, 4, dt)
    m.position.z = damp(m.position.z, 0.3 + sstep(0.8, 1, p) * -2.5, 4, dt)

    const yaw = desktop ? track(p, YAW) : -0.1 + Math.sin(p * 6) * 0.2
    m.rotation.y = damp(m.rotation.y, yaw + pointer.x * 0.12, 4, dt)
    m.rotation.x = damp(m.rotation.x, -pointer.y * 0.05, 4, dt)

    const s = desktop ? 1 : 0.85
    m.scale.setScalar(damp(m.scale.x, s, 4, dt))

    // fade in with the loader, fade out as the About section takes over
    const target = (1 - sstep(0.82, 0.98, p)) * (desktop ? 1 : 0.4)
    uniforms.uOpacity.value = damp(uniforms.uOpacity.value, target, 3, dt)
    uniforms.uTime.value = t
  })

  return (
    <mesh ref={mesh} renderOrder={10} frustumCulled={false}>
      <planeGeometry args={[(HEIGHT * W) / H, HEIGHT]} />
      <shaderMaterial
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}
