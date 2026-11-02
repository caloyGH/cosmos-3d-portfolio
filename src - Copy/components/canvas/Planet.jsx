import { useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry } from 'three'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BackSide, DoubleSide, MathUtils, Vector3 } from 'three'
import { scrollState } from '../../store/scroll'
import { PLANETS } from '../../data/planets'
import { planetVertex, planetFragment, haloVertex, haloFragment, ringVertex, ringFragment } from './planetShaders'

const { damp, clamp, smoothstep } = MathUtils
const CAM_Z = 7.5 // the camera never moves along z (see TravelFx)
const Z0 = -8 // depth where a planet sits while you are on its section
const D0 = CAM_Z - Z0
const phone = (aspect) => aspect < 0.9 // on a portrait phone the planet sits nearer the middle
const REF_FOV = 45 // positions are fixed in the world, so the planets zoom naturally when the fov widens at speed

/**
 * Planet carousel: every section has its OWN planet, shown whole (never bigger than the screen). While you read a section its
 * planet rests where data/planets.js says. Scroll on and it slides out to the left while the next one slides in from the right,
 * smaller while it is away from the centre (now: one at a time, arriving from deep space). Edit the planets in data/planets.js.
 */
export default function Planet() {
  const pos = useRef(0)
  useFrame((_, dt) => {
    pos.current = damp(pos.current, scrollState.pos, 3, dt)
  })
  return (
    <>
      {PLANETS.map((p, i) => (
        <World key={p.name} data={p} index={i} posRef={pos} />
      ))}
      {PLANETS.map((p, i) => (p.dust ? <Dust key={`dust-${p.name}`} color={p.dust} index={i} posRef={pos} /> : null))}
    </>
  )
}

/** Uniforms for a small grey rocky moon lit from the same direction as its planet. */
const moonCache = new Map()
function MU(sun) {
  const key = sun.join(',')
  if (!moonCache.has(key)) {
    moonCache.set(key, {
      uTime: { value: 40 }, uGas: { value: 0 }, uOcean: { value: 0 }, uCloud: { value: 0 }, uAtmoK: { value: 0 }, uRing: { value: 0 },
      uPolar: { value: 0 }, uSpot: { value: 0 }, uDim: { value: 0.8 },
      uC0: { value: new Vector3(0.42, 0.41, 0.4) }, uC1: { value: new Vector3(0.78, 0.76, 0.72) }, uC2: { value: new Vector3(0.97, 0.95, 0.9) },
      uAtmo: { value: new Vector3(0, 0, 0) }, uSun: { value: new Vector3(...sun) },
    })
  }
  return moonCache.get(key)
}

/**
 * A few specks of dust that drift across the screen while you are on a dusty world (Mars). Only 140 points, no glow:
 * it just makes the air feel like it has something in it.
 */
function Dust({ color, index, posRef }) {
  const mat = useRef()
  const pts = useRef()
  const N = 140
  const { geo, seed } = useMemo(() => {
    const g = new BufferGeometry()
    const arr = new Float32Array(N * 3)
    const sd = new Float32Array(N * 4)
    for (let i = 0; i < N; i++) { sd[i * 4] = Math.random(); sd[i * 4 + 1] = Math.random(); sd[i * 4 + 2] = 0.4 + Math.random() * 0.9; sd[i * 4 + 3] = -2 - Math.random() * 3 }
    g.setAttribute('position', new BufferAttribute(arr, 3))
    return { geo: g, seed: sd }
  }, [])

  useFrame(({ size, clock }) => {
    const d = Math.abs(posRef.current - index)
    const on = d < 0.95
    pts.current.visible = on
    if (!on) return
    const fade = 1 - smoothstep(d, 0.35, 0.95)
    mat.current.opacity = 0.55 * fade
    const aspect = size.width / size.height
    const halfH = Math.tan(MathUtils.degToRad(REF_FOV / 2)) * (CAM_Z + 3)
    const halfW = halfH * aspect
    const t = clock.elapsedTime
    const a = geo.attributes.position.array
    for (let i = 0; i < N; i++) {
      const u = seed[i * 4], v = seed[i * 4 + 1], sp = seed[i * 4 + 2]
      const x = (((u + t * 0.018 * sp) % 1) + 1) % 1 // 0..1, wraps left to right
      a[i * 3] = (x * 2.2 - 1.1) * halfW
      a[i * 3 + 1] = (v * 2 - 1) * halfH + Math.sin(t * 0.4 * sp + i) * 0.25 - x * halfH * 0.25
      a[i * 3 + 2] = seed[i * 4 + 3]
    }
    geo.attributes.position.needsUpdate = true
  })

  return (
    <points ref={pts} geometry={geo} frustumCulled={false} visible={false}>
      <pointsMaterial ref={mat} color={`rgb(${color.map((c) => Math.round(c * 255)).join(',')})`} size={2.4} sizeAttenuation={false} transparent opacity={0} depthWrite={false} />
    </points>
  )
}

function World({ data, index, posRef }) {
  const group = useRef()
  const ring = data.ring > 0
  const moon = useRef()

  const U = useMemo(
    () => ({
      uTime: { value: index * 13 },
      uGas: { value: data.gas },
      uOcean: { value: data.ocean },
      uCloud: { value: data.cloud },
      uAtmoK: { value: data.atmoK },
      uRing: { value: data.ring },
      uPolar: { value: data.polar || 0 },
      uSpot: { value: data.spot || 0 },
      uDim: { value: 0.8 },
      uC0: { value: new Vector3(...data.c0) },
      uC1: { value: new Vector3(...data.c1) },
      uC2: { value: new Vector3(...data.c2) },
      uAtmo: { value: new Vector3(...data.atmo) },
      uSun: { value: new Vector3(...data.sun) },
    }),
    [data, index]
  )

  useFrame(({ size }, dt) => {
    const g = group.current
    const dd = index - posRef.current // > 0: ahead of you (to the right), < 0: already passed (to the left)
    const away = Math.abs(dd)
    const show = dd > 0 ? dd < 0.72 : away < 0.5 // one at a time: the next one only appears once the old one has left
    g.visible = show
    if (!show) return
    U.uTime.value += dt * (1 + Math.min(away * 2, 1) * 2.5) // spins a little faster while it slides

    if (moon.current) {
      // a small moon on a tilted, slow orbit above the planet
      const a = U.uTime.value * 0.11 + 1.2
      moon.current.position.set(Math.cos(a) * 2.5, 1.25 + Math.sin(a) * 0.3, Math.sin(a) * 2.5)
      moon.current.rotation.y += dt * 0.05
    }

    const aspect = size.width / size.height
    const halfH = Math.tan(MathUtils.degToRad(REF_FOV / 2)) * D0
    const halfW = halfH * aspect
    const fit = clamp(aspect / 1.25, 0.6, 1) // smaller on phones
    const sm = (t) => t * t * (3 - 2 * t)
    const homeX = phone(aspect) ? data.x * 0.35 : data.x
    let x = homeX, z = Z0, k = 1
    if (dd > 0) {
      // arriving: emerges from deep space at its resting spot and swells as you "reach" it
      const e = sm(1 - dd / 0.72)
      k = e
      z = Z0 - (1 - e) * 14
    } else if (away > 0) {
      // leaving: swings past you toward its own side of the screen and out of view
      const v = away / 0.5
      x = homeX + Math.sign(data.x || 1) * Math.pow(v, 1.6) * 1.9
      k = 1 + v * 0.5
    }
    g.position.set(x * halfW, data.y * halfH, z)
    g.scale.setScalar(Math.max(data.r * halfH * fit * k, 0.0001))
  })

  return (
    <group ref={group} visible={false}>
      <mesh renderOrder={-5} frustumCulled={false}>
        <sphereGeometry args={[1, 96, 64]} />
        <shaderMaterial vertexShader={planetVertex} fragmentShader={planetFragment} uniforms={U} />
      </mesh>
      {/* atmosphere glow around the limb */}
      <mesh scale={1.16} frustumCulled={false}>
        <sphereGeometry args={[1, 48, 32]} />
        <shaderMaterial vertexShader={haloVertex} fragmentShader={haloFragment} uniforms={U} side={BackSide} blending={AdditiveBlending} transparent depthWrite={false} />
      </mesh>
      {data.moon && (
        <mesh ref={moon} scale={0.2} frustumCulled={false}>
          <sphereGeometry args={[1, 48, 32]} />
          <shaderMaterial vertexShader={planetVertex} fragmentShader={planetFragment} uniforms={MU(data.sun)} />
        </mesh>
      )}
      {/* Saturn-style rings */}
      {ring && (
        <mesh rotation={[1.2, 0, -0.35]} frustumCulled={false}>
          <ringGeometry args={[1.32, 2.32, 160, 1]} />
          <shaderMaterial vertexShader={ringVertex} fragmentShader={ringFragment} uniforms={U} side={DoubleSide} transparent depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}
