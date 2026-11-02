import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  AmbientLight,
  CylinderGeometry,
  DirectionalLight,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from 'three'
import { scrollState } from '../../store/scroll'
import { GUIDE } from '../../data/profile'

const { damp, degToRad, clamp } = MathUtils
const sstep = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}

// ---------------------------------------------------------------------------------------------
// The running black cat built from ordinary meshes (spheres + tapered cylinders), animated in JS:
// 2-bone leg IK with a gallop cycle, arching spine, streaming tail. No custom shader, so it
// works on any GPU. Cyan rim lights + glowing eyes keep it readable on the dark page.
// ---------------------------------------------------------------------------------------------
const UP = new Vector3(0, 1, 0)
const SPHERE = new SphereGeometry(1, 20, 14)

// where the cat stops on each section: [scroll pos, x (screen fraction), height (screen fraction)]
const PATH = [
  [0.0, 0.30, 0.30],
  [0.3, 0.30, 0.30],
  [0.4, 0.82, 0.30],
  [0.62, 0.82, 0.30],
  [0.85, 0.58, 0.30],
  [1.0, 0.56, 0.30],
  [2.0, 0.86, 0.30],
  [3.0, 0.92, 0.26],
  [3.7, 0.86, 0.30],
  [4.0, 0.84, 0.32],
]
const at = (p) => {
  if (p <= PATH[0][0]) return [PATH[0][1], PATH[0][2]]
  for (let i = 1; i < PATH.length; i++) {
    if (p <= PATH[i][0]) {
      const a = PATH[i - 1]
      const b = PATH[i]
      const t = sstep(a[0], b[0], p)
      return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
    }
  }
  const l = PATH[PATH.length - 1]
  return [l[1], l[2]]
}

const IDLE_R = 0.55 // 3/4 view towards the viewer when standing
const RUN_R = 0.18 // nearly side-on when running
const TAIL_N = 7

function buildCat() {
  const root = new Group()
  const fur = new MeshStandardMaterial({ color: '#0a0d13', roughness: 0.55, metalness: 0.0, emissive: '#02060d', transparent: true, opacity: 0 })
  const eyeMat = new MeshBasicMaterial({ color: '#7ffcff', toneMapped: false, transparent: true, opacity: 0 })
  const parts = {}

  const ball = (name, r, mat = fur) => {
    const m = new Mesh(SPHERE, mat)
    m.scale.set(r[0], r[1], r[2])
    m.renderOrder = 9
    root.add(m)
    parts[name] = m
    return m
  }
  const seg = (name, r1, r2) => {
    // unit-height tapered cylinder, +y points from a (radius r1) to b (radius r2)
    const m = new Mesh(new CylinderGeometry(r2, r1, 1, 12, 1), fur)
    m.renderOrder = 9
    root.add(m)
    parts[name] = m
    return m
  }

  ball('hips', [0.3, 0.26, 0.23])
  ball('chest', [0.29, 0.28, 0.23])
  seg('belly', 0.215, 0.215)
  seg('neck', 0.15, 0.12)
  ball('head', [0.225, 0.195, 0.195])
  ball('muzzle', [0.1, 0.072, 0.095])
  for (let i = 0; i < 4; i++) {
    seg('up' + i, 0.105, 0.062)
    seg('low' + i, 0.062, 0.046)
    ball('knee' + i, [0.075, 0.075, 0.075])
    ball('paw' + i, [0.105, 0.048, 0.066])
  }
  for (let s = 0; s < 2; s++) {
    const ear = new Mesh(new CylinderGeometry(0.012, 0.085, 1, 10, 1), fur)
    ear.renderOrder = 9
    root.add(ear)
    parts['ear' + s] = ear
    ball('eye' + s, [0.03, 0.04, 0.04], eyeMat)
  }
  for (let i = 0; i < TAIL_N; i++) {
    const u = (i + 1) / TAIL_N
    const r1 = 0.075 + (0.045 - 0.075) * (u - 1 / TAIL_N)
    const r2 = 0.075 + (0.045 - 0.075) * u
    seg('tail' + i, r1, r2)
    ball('tj' + i, [r1, r1, r1])
  }
  return { root, parts, mats: [fur, eyeMat] }
}

const A = new Vector3()
const B = new Vector3()
const D = new Vector3()
// stretch a unit cylinder between a and b
function link(mesh, a, b) {
  D.subVectors(b, a)
  const len = Math.max(D.length(), 1e-4)
  mesh.position.copy(a).addScaledVector(D, 0.5)
  mesh.scale.set(1, len, 1)
  mesh.quaternion.setFromUnitVectors(UP, D.multiplyScalar(1 / len))
}

function leg(root, th, bend, run, knee, foot) {
  const stride = 0.3 * run
  const lift = 0.2 * run
  const fx = root.x + 0.02 + stride * Math.cos(th)
  const fy = 0.035 + lift * Math.max(Math.sin(th), 0)
  const dx = fx - root.x
  const dy = fy - root.y
  const len = Math.max(Math.hypot(dx, dy), 1e-4)
  const dist = Math.min(len, 0.545)
  const ux = dx / len
  const uy = dy / len
  const hh = Math.sqrt(Math.max(0.28 * 0.28 - dist * dist * 0.25, 0))
  const mx = root.x + ux * dist * 0.5
  const my = root.y + uy * dist * 0.5
  knee.set(mx - uy * hh * bend, my + ux * hh * bend, root.z)
  foot.set(root.x + ux * dist, root.y + uy * dist, root.z)
}

const H = new Vector3()
const S = new Vector3()
const roots = [new Vector3(), new Vector3(), new Vector3(), new Vector3()]
const knees = [new Vector3(), new Vector3(), new Vector3(), new Vector3()]
const feet = [new Vector3(), new Vector3(), new Vector3(), new Vector3()]
const tail = Array.from({ length: TAIL_N + 1 }, () => new Vector3())
const HC = new Vector3()

function pose(parts, t, ph, run) {
  const bob = run * 0.055 * Math.sin(2 * ph + 0.6) + (1 - run) * 0.006 * Math.sin(t * 1.8)
  const arch = run * 0.1 * Math.sin(ph + 0.4)
  H.set(-0.34, 0.6 + bob - arch * 0.7, 0)
  S.set(0.3, 0.62 + bob + arch * 0.7, 0)
  parts.hips.position.copy(H)
  parts.chest.position.copy(S)
  A.set(H.x + 0.05, H.y, 0)
  B.set(S.x - 0.05, S.y, 0)
  link(parts.belly, A, B)

  roots[0].copy(S).add(A.set(0.06, -0.12, 0.115))
  roots[1].copy(S).add(A.set(0.06, -0.12, -0.115))
  roots[2].copy(H).add(A.set(-0.02, -0.1, 0.125))
  roots[3].copy(H).add(A.set(-0.02, -0.1, -0.125))
  const offs = [0, 0.55, 3.3, 3.85]
  const bends = [-1, -1, 1, 1]
  for (let i = 0; i < 4; i++) {
    leg(roots[i], ph + offs[i], bends[i], run, knees[i], feet[i])
    link(parts['up' + i], roots[i], knees[i])
    link(parts['low' + i], knees[i], feet[i])
    parts['knee' + i].position.copy(knees[i])
    parts['paw' + i].position.copy(feet[i]).add(A.set(0.05, 0, 0))
  }

  // neck + head
  const nod = run * 0.04 * Math.sin(2 * ph + 1.4)
  HC.copy(S).add(A.set(0.3, 0.17 - run * 0.07 + nod, 0))
  A.copy(S).add(B.set(0.1, 0.05, 0))
  B.copy(HC).add(D.set(-0.08, 0, 0))
  link(parts.neck, A, B)
  parts.head.position.copy(HC)
  parts.head.rotation.z = -run * 0.12
  parts.muzzle.position.copy(HC).add(A.set(0.15, -0.05, 0))
  parts.muzzle.rotation.z = -run * 0.12
  const flick = Math.max(Math.sin(t * 1.1 + 2) - 0.93, 0) * 0.5
  for (let s = 0; s < 2; s++) {
    const z = s === 0 ? 1 : -1
    A.copy(HC).add(B.set(-0.02, 0.12, 0.095 * z))
    B.copy(HC).add(D.set(-0.07 - run * 0.05, 0.31, (0.114 + flick) * z))
    link(parts['ear' + s], A, B)
    const blink = 1 - Math.min(Math.max((Math.sin(t * 0.7) - 0.965) / 0.02, 0), 1)
    parts['eye' + s].position.copy(HC).add(A.set(0.19, 0.04 - run * 0.01, 0.095 * z))
    parts['eye' + s].scale.set(0.03, 0.04 * Math.max(blink, 0.08), 0.04)
  }

  // tail: curls up when standing, streams out behind when running
  tail[0].copy(H).add(A.set(-0.22, 0.04, 0))
  const spd = 1.6 + run * 4.5
  for (let i = 1; i <= TAIL_N; i++) {
    const u = i / TAIL_N
    const angStand = 0.5 + u * 1.55
    const angRun = 0.12 + u * 0.1 + Math.sin(ph - u * 2.4) * 0.22 * u
    const ang = angStand + (angRun - angStand) * run + Math.sin(t * spd * 0.5 + u * 3) * 0.12 * u * (1 - run)
    tail[i].copy(tail[i - 1])
    tail[i].x += -Math.cos(ang) * 0.115
    tail[i].y += Math.sin(ang) * 0.115
    tail[i].z += Math.sin(t * spd * 0.4 + u * 2.2) * 0.03 * u + run * Math.sin(ph * 0.5 - u * 2) * 0.05 * u
    link(parts['tail' + (i - 1)], tail[i - 1], tail[i])
    parts['tj' + (i - 1)].position.copy(tail[i])
  }
}

export default function MeshCat() {
  if (!GUIDE.enabled || GUIDE.mode !== 'mesh') return null
  return <MeshCatInner />
}

function MeshCatInner() {
  const camera = useThree((s) => s.camera)
  const cat = useMemo(() => buildCat(), [])
  const lights = useMemo(() => {
    const g = new Group()
    const amb = new AmbientLight('#7fa6ff', 0.55)
    const key = new DirectionalLight('#dfeaff', 1.1)
    key.position.set(2, 3, 4)
    const rimA = new DirectionalLight('#00f0ff', 3.4)
    rimA.position.set(-3, 2, -3)
    const rimB = new DirectionalLight('#2f6bff', 2.2)
    rimB.position.set(3, 1, -3)
    g.add(amb, key, rimA, rimB)
    return g
  }, [])
  const st = useMemo(() => ({ x: null, y: null, vx: 0, vy: 0, heading: 1, yaw: IDLE_R, phase: 0, run: 0, a: 0, tilt: 0 }), [])
  // rig wraps the cat so it can be rotated about its body centre (to run down the screen edge)
  const rig = useMemo(() => {
    const g = new Group()
    cat.root.position.set(0, -0.56, 0)
    g.add(cat.root)
    return g
  }, [cat])
  const side = GUIDE.layout !== 'ground'

  useFrame(({ clock, size }, dt) => {
    dt = Math.min(dt, 0.05)
    const desktop = size.width > 900
    const halfH = Math.tan(degToRad(camera.fov / 2)) * camera.position.z
    const halfW = halfH * (size.width / size.height)

    let wx, wy, sc
    if (side) {
      // runs DOWN the right edge of the screen as the page scrolls (and back up when scrolling up)
      const p = clamp(scrollState.pos / 4, 0, 1)
      sc = ((desktop ? 0.17 : 0.13) * 2 * halfH) / 1.15
      wx = halfW * (desktop ? 0.9 : 0.86)
      wy = halfH * (0.8 - 1.6 * p)
    } else {
      const [fx, hf] = at(scrollState.pos)
      sc = ((hf * (desktop ? 1 : 0.75)) * 2 * halfH) / 1.15
      wx = (fx - 0.5) * 2 * halfW
      wy = (0.5 - 0.965) * 2 * halfH + 0.56 * sc
    }
    if (st.x === null) { st.x = wx; st.y = wy }
    const px = st.x
    const py = st.y
    st.x = damp(st.x, wx, 2.6, dt)
    st.y = damp(st.y, wy, side ? 3.2 : 8, dt)
    st.vx = damp(st.vx, (st.x - px) / Math.max(dt, 1e-3), 10, dt)
    st.vy = damp(st.vy, (st.y - py) / Math.max(dt, 1e-3), 10, dt)
    const speed = (side ? Math.abs(st.vy) : Math.abs(st.vx)) / sc
    st.run = damp(st.run, sstep(0.1, 1.2, speed), 6, dt)

    let yawT
    if (side) {
      // head points down while scrolling down, up when scrolling up; feet toward the screen edge
      if (speed > 0.15) st.heading = Math.sign(st.vy) || st.heading
      yawT = st.heading < 0 ? Math.PI - RUN_R : RUN_R
      yawT = MathUtils.lerp(st.heading < 0 ? Math.PI - IDLE_R : IDLE_R, yawT, st.run)
      st.tilt = damp(st.tilt, st.run * Math.PI * 0.5, 6, dt)
    } else {
      if (speed > 0.15) st.heading = Math.sign(st.vx) || st.heading
      else st.heading = wx > 0 ? -1 : 1
      const view = MathUtils.lerp(IDLE_R, RUN_R, st.run)
      yawT = st.heading > 0 ? view : Math.PI - view
    }
    st.yaw = damp(st.yaw, yawT, 7, dt)
    st.phase += clamp(speed * 2.3, 0, 17) * dt

    pose(cat.parts, clock.elapsedTime, st.phase, st.run)

    rig.position.set(st.x, st.y, 0.2)
    rig.scale.setScalar(sc)
    rig.rotation.z = side ? st.tilt : 0
    cat.root.rotation.y = -st.yaw // +yaw turns the cat towards the viewer
    // appear after the loader
    st.a = damp(st.a, clock.elapsedTime > 2.2 ? 1 : 0, 3, dt)
    rig.visible = st.a > 0.02
    for (const m of cat.mats) m.opacity = st.a
  })

  return (
    <>
      <primitive object={lights} />
      <primitive object={rig} />
    </>
  )
}
