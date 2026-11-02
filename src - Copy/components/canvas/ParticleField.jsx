import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, MathUtils, Vector2 } from 'three'
import { scrollState } from '../../store/scroll'
import { slotAt } from '../../data/scenes'
import { buildShapes } from './shapes'

const { damp } = MathUtils
const COUNT = 36000 // lower this (e.g. 24000) if your GPU struggles

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uPos;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uMobile;
  uniform float uSpin;     // accumulated rotation (speeds up while you scroll)
  uniform float uVel;      // smoothed scroll speed
  uniform float uClickT;   // time of the last click
  uniform vec2 uClick;     // where the last click happened (local space)
  uniform vec2 uMouse;
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  attribute vec3 aP1;
  attribute vec3 aP2;
  attribute vec3 aP3;
  attribute vec3 aP4;
  attribute vec4 aRand;

  varying vec3 vColor;
  varying float vAlpha;

  // weight of shape k (smooth); the five weights always sum to 1
  float wgt(float k) {
    float e = clamp(1.0 - abs(uPos - k), 0.0, 1.0);
    return e * e * (3.0 - 2.0 * e);
  }
  mat2 rot(float a) { float c = cos(a); float s = sin(a); return mat2(c, -s, s, c); }

  void main() {
    float w0 = wgt(0.0);
    float w1 = wgt(1.0);
    float w2 = wgt(2.0);
    float w3 = wgt(3.0);
    float w4 = wgt(4.0);

    // morph: blend the target shapes by scroll
    vec3 p = position * w0 + aP1 * w1 + aP2 * w2 + aP3 * w3 + aP4 * w4;

    float m = max(max(max(w0, w1), max(w2, w3)), w4);
    float travel = clamp((1.0 - m) * 2.0, 0.0, 1.0);   // 0 on a shape, 1 half-way between two

    // flow noise: gentle idle drift, big swirl while travelling
    float t = uTime;
    vec3 flow = vec3(
      sin(p.y * 1.7 + t * 0.9 + aRand.x * 6.2831),
      sin(p.z * 1.9 + t * 0.8 + aRand.y * 6.2831),
      sin(p.x * 1.6 + t * 0.7 + aRand.z * 6.2831)
    );
    p += flow * (0.025 + uVel * 0.06 + travel * (0.35 + aRand.w * 0.5));
    p += normalize(p + vec3(0.001)) * travel * aRand.w * 0.45;  // small burst outward

    // while morphing, the whole cloud twists like a whirlpool (keeps it cohesive)
    p.xy = rot(travel * (1.4 + aRand.w * 1.6)) * p.xy;

    // vortex: inner particles orbit faster than outer ones
    float r2 = length(p.xy);
    p.xy = rot(w0 * uSpin * (1.6 / (0.6 + r2))) * p.xy;

    // slow turns: the knot spins like a wheel (stays readable), the lattice turns around Y
    p.xy = rot(uSpin * 0.5 * w2) * p.xy;
    p.xz = rot(uSpin * 0.63 * w3) * p.xz;

    // gentle breathing
    p *= 1.0 + 0.018 * sin(t * 0.8 + length(p) * 1.2);

    // click shockwave: a ring that expands and fades, shoving particles outward
    float age = uTime - uClickT;
    float rd = length(p.xy - uClick);
    float x = (rd - age * 4.0) * 1.6;
    float wave = exp(-x * x) * exp(-age * 1.4);
    p.xy += ((p.xy - uClick) / (rd + 0.0001)) * wave * 0.7;
    p.z += wave * 0.6;

    // pointer repels nearby particles
    vec2 dm = p.xy - uMouse;
    float d = length(dm);
    float push = smoothstep(1.3, 0.0, d);
    p.xy += (dm / (d + 0.0001)) * push * push * 0.8;
    p.z += (aRand.x - 0.5) * push * 1.2;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    // colour: cyan <-> blue, bright core in the vortex, a few white sparkles
    float core = smoothstep(1.4, 0.0, length(position.xy)) * w0;
    vec3 col = mix(uColorB, uColorA, aRand.x);
    col *= 0.7 + 1.0 * aRand.z + core * 2.4;
    col = mix(col, vec3(1.4), step(0.985, aRand.y) * 0.9 + core * 0.25);
    vColor = col;

    // fade the lattice a bit (it sits behind the skill cards)
    vAlpha = (w0 + w1 + w2 + 0.45 * w3 + w4) * uMobile * (0.55 + 0.45 * aRand.w) * (1.5 + travel * 0.6);

    float twinkle = 0.75 + 0.25 * sin(t * 2.0 + aRand.y * 40.0);
    gl_PointSize = max(1.0, uSize * uPixelRatio * (0.55 + 1.3 * aRand.z * aRand.z) * twinkle * (7.0 / -mv.z));
  }
`

const fragment = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a *= a;
    gl_FragColor = vec4(vColor, a * vAlpha);
  }
`

function buildGeometry() {
  const { shapes, rand } = buildShapes(COUNT)
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(shapes[0], 3))
  for (let k = 1; k < 5; k++) g.setAttribute(`aP${k}`, new BufferAttribute(shapes[k], 3))
  g.setAttribute('aRand', new BufferAttribute(rand, 4))
  return g
}

export default function ParticleField() {
  const mat = useRef()
  const group = useRef()
  const pos = useRef(0)
  const moved = useRef(false)
  const clicked = useRef(false)
  const spin = useRef(0)
  const vel = useRef(0)
  const lastPos = useRef(0)
  const size = useThree((s) => s.size)
  const dpr = useThree((s) => s.viewport.dpr)

  const geometry = useMemo(buildGeometry, [])
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPos: { value: 0 },
      uSize: { value: 3.0 },
      uPixelRatio: { value: 1 },
      uMobile: { value: 1 },
      uSpin: { value: 0 },
      uVel: { value: 0 },
      uClickT: { value: -100 },
      uClick: { value: new Vector2(999, 999) },
      uMouse: { value: new Vector2(999, 999) },
      uColorA: { value: new Color('#00f0ff') },
      uColorB: { value: new Color('#2f4cff') },
    }),
    []
  )

  // ignore R3F's initial (0,0) pointer until the mouse actually moves
  useEffect(() => {
    const f = () => (moved.current = true)
    window.addEventListener('pointermove', f, { once: true })
    return () => window.removeEventListener('pointermove', f)
  }, [])

  // clicking the background sends a shockwave through the particles (not on buttons / links)
  useEffect(() => {
    const f = (e) => {
      if (e.target.closest?.('a, button, input, textarea')) return
      moved.current = true
      clicked.current = true
    }
    window.addEventListener('pointerdown', f)
    return () => window.removeEventListener('pointerdown', f)
  }, [])

  useFrame(({ pointer, camera, clock }, dt) => {
    pos.current = damp(pos.current, slotAt(scrollState.pos), 3, dt)

    const u = mat.current.uniforms
    u.uTime.value = clock.elapsedTime
    u.uPos.value = pos.current
    u.uPixelRatio.value = dpr

    // scroll speed (sections per second) -> faster spin + a little extra turbulence
    const v = Math.min(Math.abs(scrollState.pos - lastPos.current) / Math.max(dt, 0.001), 2)
    lastPos.current = scrollState.pos
    vel.current = damp(vel.current, v, 4, dt)
    spin.current += dt * (0.35 + vel.current * 1.2)
    u.uSpin.value = spin.current
    u.uVel.value = vel.current

    const desktop = size.width > 1024
    const g = group.current
    // the vortex sits centred behind IO in the hero, then slides to the right (text on the left) as you scroll
    const sp = Math.min(Math.max((scrollState.pos - 0.04) / 0.21, 0), 1)
    g.position.x = damp(g.position.x, desktop ? 2.3 * sp * sp * (3 - 2 * sp) : 0, 4, dt)
    // between two shapes the cloud dips away, like you're flying past it
    const frac = pos.current - Math.floor(pos.current)
    g.position.z = damp(g.position.z, -Math.sin(Math.PI * frac) * 2.2, 6, dt)
    g.scale.setScalar(damp(g.scale.x, desktop ? 1 : 0.7, 4, dt))
    g.rotation.y = damp(g.rotation.y, pointer.x * 0.12, 3, dt)
    g.rotation.x = damp(g.rotation.x, -pointer.y * 0.08, 3, dt)
    u.uMobile.value = desktop ? 1 : 0.55

    // pointer -> local space of the particle plane
    if (moved.current) {
      const halfH = Math.tan(MathUtils.degToRad(camera.fov / 2)) * camera.position.z
      const halfW = (halfH * size.width) / size.height
      u.uMouse.value.set((pointer.x * halfW - g.position.x) / g.scale.x, (pointer.y * halfH) / g.scale.x)
    }

    if (clicked.current) {
      clicked.current = false
      u.uClick.value.copy(u.uMouse.value)
      u.uClickT.value = clock.elapsedTime
    }
  })

  return (
    <group ref={group}>
      <points geometry={geometry} frustumCulled={false}>
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
    </group>
  )
}
