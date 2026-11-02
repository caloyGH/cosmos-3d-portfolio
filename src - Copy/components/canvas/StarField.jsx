import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry } from 'three'
import { scrollState } from '../../store/scroll'
import { buildStars } from './shapes'

const COUNT = 1500
const DEPTH = 70

const vertex = /* glsl */ `
  uniform float uTravel;
  uniform float uStreak;
  uniform float uMode;        // 0 = streak lines, 1 = dots
  uniform float uPixelRatio;
  attribute float side;   // 0 = head, 1 = tail
  attribute float rand;
  varying float vA;
  varying vec3 vC;

  void main() {
    // stars live in a 70-unit tunnel in front of the camera and flow toward it as you travel
    float wz = mod(position.z + uTravel, 70.0) - 62.5;   // -62.5 (far) .. 7.5 (at the camera)
    float head = wz;
    wz -= side * uStreak;                                // the tail trails behind the head

    vec4 mv = modelViewMatrix * vec4(position.xy, wz, 1.0);
    gl_Position = projectionMatrix * mv;

    float dist = 7.5 - head;                             // head distance from the camera
    float fade = smoothstep(0.0, 4.0, dist) * (1.0 - smoothstep(30.0, 70.0, dist));
    vA = fade * (0.35 + 0.65 * rand) * (1.0 - side);    // lines fade toward the tail; dots hide it
    vC = mix(vec3(0.75, 0.92, 1.0), vec3(0.0, 0.9, 1.0), rand * rand);

    gl_PointSize = uMode * clamp((1.0 + 1.8 * rand) * uPixelRatio * (9.0 / -mv.z), 1.0, 5.0);
  }
`

const fragment = /* glsl */ `
  uniform float uMode;
  varying float vA;
  varying vec3 vC;

  void main() {
    float a = 1.0;
    if (uMode > 0.5) {
      float d = length(gl_PointCoord - 0.5);
      a = smoothstep(0.5, 0.0, d);
    }
    gl_FragColor = vec4(vC, vA * a);
  }
`

/**
 * Starfield you fly through: still = twinkling dots, scrolling = stars stream past and
 * stretch into streaks (longer the faster you scroll). Scrolling back reverses the flow.
 */
export default function StarField() {
  const dpr = useThree((s) => s.viewport.dpr)

  const geometry = useMemo(() => {
    const { pos, side, rand } = buildStars(COUNT, DEPTH)
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('side', new BufferAttribute(side, 1))
    g.setAttribute('rand', new BufferAttribute(rand, 1))
    return g
  }, [])

  // both materials share the same uniform objects, only uMode differs
  const { shared, lines, dots } = useMemo(() => {
    const shared = {
      uTravel: { value: 0 },
      uStreak: { value: 0 },
      uPixelRatio: { value: 1 },
    }
    return {
      shared,
      lines: { ...shared, uMode: { value: 0 } },
      dots: { ...shared, uMode: { value: 1 } },
    }
  }, [])

  useFrame(() => {
    shared.uTravel.value = scrollState.travel
    shared.uStreak.value = Math.min(scrollState.vel, 3) * 2.0
    shared.uPixelRatio.value = dpr
  })

  return (
    <>
      <lineSegments geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          vertexShader={vertex}
          fragmentShader={fragment}
          uniforms={lines}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </lineSegments>
      <points geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          vertexShader={vertex}
          fragmentShader={fragment}
          uniforms={dots}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
    </>
  )
}
