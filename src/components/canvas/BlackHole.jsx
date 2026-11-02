import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, DoubleSide, MathUtils } from 'three'
import { scrollState } from '../../store/scroll'
import { holeVertex, diskFragment, lensFragment, infallVertex, infallFragment } from './blackHoleShaders'

const R = 1.25      // event horizon radius (world units, at the hole's depth)
const TILT = 1.2    // how far the disk leans toward us
const sst = (a, b, v) => { const t = MathUtils.clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }

/**
 * The finale: after Contact, the scene is pulled into a black hole. A tilted accretion disk (two halves, so the black
 * disc can sit between them), a lensed ring, and a swarm of points spiralling in. Driven only by scrollState.fin.
 */
export default function BlackHole() {
  const dpr = useThree((s) => s.viewport.dpr)
  const root = useRef()
  const horizon = useRef()
  const mBack = useRef()
  const mPts = useRef()
  const mLens = useRef()
  const mDisk = useRef()

  const { U, geo } = useMemo(() => {
    let s = 5
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    const N = 800
    const seed = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      seed[i * 3] = rnd() * Math.PI * 2
      seed[i * 3 + 1] = 2.2 + rnd() * rnd() * 9
      seed[i * 3 + 2] = rnd()
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(N * 3), 3))
    g.setAttribute('aSeed', new BufferAttribute(seed, 3))
    const shared = () => ({ uTime: { value: 0 }, uFin: { value: 0 } })
    return {
      geo: g,
      U: {
        disk: { ...shared(), uHalf: { value: 1 }, uIn: { value: R * 1.18 }, uOut: { value: R * 3.6 } },
        diskBack: { ...shared(), uHalf: { value: -1 }, uIn: { value: R * 1.18 }, uOut: { value: R * 3.6 } },
        lens: { ...shared(), uIn: { value: R * 1.0 }, uOut: { value: R * 2.0 } },
        pts: { ...shared(), uPixelRatio: { value: 1 }, uHoleR: { value: R } },
      },
    }
  }, [])

  useFrame(({ clock }, dt) => {
    const f = scrollState.fin
    const g = root.current
    g.visible = f > 0.01
    if (!g.visible) return
    const t = clock.elapsedTime
    const vis = sst(0.06, 0.5, f)                       // the hole opens
    const grow = MathUtils.lerp(0.15, 1, sst(0.05, 0.6, f))
    for (const k of ['disk', 'diskBack', 'lens']) { U[k].uTime.value = t; U[k].uFin.value = vis }
    U.pts.uTime.value = t
    U.pts.uFin.value = f
    U.pts.uPixelRatio.value = dpr
    g.scale.setScalar(grow * (1 - 0.15 * sst(0.74, 0.95, f)))
    g.position.y = 0.15 + 1.9 * sst(0.72, 0.95, f) // once everything is swallowed the hole rises, leaving room for the closing words
    g.rotation.z = Math.sin(t * 0.1) * 0.05 - 0.18       // the disk is slightly canted
    horizon.current.scale.setScalar(R * 1.0)
    // write into the uniforms the GPU really uses (the materials' own), so this works even if the prop objects were copied
    for (const [m, key] of [[mBack, 'diskBack'], [mPts, 'pts'], [mLens, 'lens'], [mDisk, 'disk']]) {
      const u = m.current?.uniforms
      if (!u) continue
      for (const k in U[key]) if (u[k]) u[k].value = U[key][k].value
    }
  })

  return (
    <group ref={root} position={[0, 0.15, -5]} visible={false}>
      {/* far half of the disk, then the black horizon, then the near half in front of it */}
      <group rotation-x={TILT}>
        <mesh renderOrder={20} frustumCulled={false}>
          <ringGeometry args={[R * 1.1, R * 3.7, 128, 1]} />
          <shaderMaterial ref={mBack} vertexShader={holeVertex} fragmentShader={diskFragment} uniforms={U.diskBack} transparent depthTest={false} depthWrite={false} blending={AdditiveBlending} side={DoubleSide} />
        </mesh>
      </group>
      <points geometry={geo} renderOrder={21} frustumCulled={false}>
        <shaderMaterial ref={mPts} vertexShader={infallVertex} fragmentShader={infallFragment} uniforms={U.pts} transparent depthTest={false} depthWrite={false} blending={AdditiveBlending} />
      </points>
      <mesh ref={horizon} renderOrder={22} frustumCulled={false}>
        <circleGeometry args={[1, 96]} />
        <meshBasicMaterial color="#000000" transparent opacity={1} depthTest={false} depthWrite={false} />
      </mesh>
      <mesh renderOrder={23} frustumCulled={false}>
        <ringGeometry args={[R * 0.98, R * 2.1, 128, 1]} />
        <shaderMaterial ref={mLens} vertexShader={holeVertex} fragmentShader={lensFragment} uniforms={U.lens} transparent depthTest={false} depthWrite={false} blending={AdditiveBlending} side={DoubleSide} />
      </mesh>
      <group rotation-x={TILT}>
        <mesh renderOrder={24} frustumCulled={false}>
          <ringGeometry args={[R * 1.1, R * 3.7, 128, 1]} />
          <shaderMaterial ref={mDisk} vertexShader={holeVertex} fragmentShader={diskFragment} uniforms={U.disk} transparent depthTest={false} depthWrite={false} blending={AdditiveBlending} side={DoubleSide} />
        </mesh>
      </group>
    </group>
  )
}
