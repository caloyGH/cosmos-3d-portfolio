import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Vector2, Vector3 } from 'three'
import { scrollState } from '../../store/scroll'
import { PHONE } from '../../store/device'
import { HOLE_RISE } from './holeLayout'
import { buildStars } from './shapes'

const HOLE = new Vector3()
const COUNT = PHONE ? 900 : 1500
const DEPTH = 70

const vertex = /* glsl */ `
  uniform float uTravel;
  uniform float uStreak;
  uniform float uMode;        // 0 = streak lines, 1 = dots
  uniform float uPixelRatio;
  uniform float uPull;        // finale: 0..1, the stars are swallowed by the black hole
  uniform vec2 uHole;         // where the hole is on screen (-1..1)
  uniform float uAspect;
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

    float pk = 1.0;
    if (uPull > 0.001) {
      // finale: every star spirals into the hole, the nearest ones first, shrinking and fading as they go
      vec2 ndc = gl_Position.xy / gl_Position.w;
      vec2 d = ndc - uHole;
      d.x *= uAspect;
      float r = length(d);
      float pl = clamp(uPull * 3.0 - r * 0.6 - rand * 0.25, 0.0, 1.0);
      float ang = pl * pl * 7.0;
      float cs = cos(ang);
      float sn = sin(ang);
      d = mat2(cs, -sn, sn, cs) * d * (1.0 - pl * pl);   // negative turn = clockwise on screen
      d.x /= uAspect;
      gl_Position.xy = (uHole + d) * gl_Position.w;
      vA *= 1.0 - smoothstep(0.55, 0.95, pl);
      pk = 1.0 - 0.6 * pl;
    }
    gl_PointSize = pk * uMode * clamp((1.0 + 1.8 * rand) * uPixelRatio * (9.0 / -mv.z), 1.0, 5.0);
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
  const mLines = useRef()
  const mDots = useRef()
  const { shared, lines, dots } = useMemo(() => {
    const shared = {
      uTravel: { value: 0 },
      uStreak: { value: 0 },
      uPixelRatio: { value: 1 },
      uPull: { value: 0 },
      uHole: { value: new Vector2() },
      uAspect: { value: 1 },
    }
    return {
      shared,
      lines: { ...shared, uMode: { value: 0 } },
      dots: { ...shared, uMode: { value: 1 } },
    }
  }, [])

  useFrame(({ camera, size }) => {
    // finale: where the black hole is (it rises once everything has been swallowed, see BlackHole.jsx) and how far along we are
    const fin = scrollState.fin
    const sst = (a, b, v) => { const t = Math.min(Math.max((v - a) / (b - a), 0), 1); return t * t * (3 - 2 * t) }
    shared.uPull.value = fin > 0 ? sst(0.08, 0.62, fin) : 0
    if (fin > 0) {
      HOLE.set(0, 0.15 + HOLE_RISE * sst(0.72, 0.95, fin), -5).project(camera)
      shared.uHole.value.set(HOLE.x, HOLE.y)
      shared.uAspect.value = size.width / size.height
    }
    shared.uTravel.value = scrollState.travel
    shared.uStreak.value = Math.min(scrollState.vel, 3) * 2.0
    shared.uPixelRatio.value = dpr
    // write into the uniforms the GPU really uses (the materials' own), so this works even if the prop objects were copied
    for (const m of [mLines.current, mDots.current]) {
      const u = m?.uniforms
      if (!u) continue
      for (const k in shared) if (u[k]) u[k].value = shared[k].value
    }
  })

  return (
    <>
      <lineSegments geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          vertexShader={vertex}
          fragmentShader={fragment}
          ref={mLines}
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
          ref={mDots}
          uniforms={dots}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
    </>
  )
}
