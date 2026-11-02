import { useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils } from 'three'
import { scrollState } from '../../store/scroll'
import { GUIDE } from '../../data/profile'

const { damp, degToRad, clamp } = MathUtils
const sstep = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}

// ---------------------------------------------------------------------------------------------
// A black cat that RUNS through the page, like the fish in the reference. It is drawn as a signed-
// distance field in a fragment shader (no model file): articulated legs with a real gallop cycle,
// arching spine, streaming tail, cyan rim light + glowing eyes. It trots between the sections as you
// scroll, turns round in 3D when it changes direction, and stands still (breathing, tail swaying)
// when it arrives.
// ---------------------------------------------------------------------------------------------
const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragment = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uPhase;  // gallop phase (radians), advanced on the CPU by how fast the cat is moving
  uniform float uRun;    // 0 = standing still, 1 = full gallop
  uniform float uYaw;    // heading: ~0.4 faces right, ~PI-0.4 faces left (anything between = turning round)
  uniform float uAlpha;
  varying vec2 vUv;

  float smin(float a, float b, float k) {
    float h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h * h * k * 0.25;
  }
  float sdEllipsoid(vec3 p, vec3 r) {
    float k0 = length(p / r);
    float k1 = length(p / (r * r));
    return k0 * (k0 - 1.0) / max(k1, 1e-4);
  }
  float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
    vec3 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
  }
  float sdRoundCone(vec3 p, vec3 a, vec3 b, float r1, float r2) {
    vec3 ba = b - a;
    float l2 = dot(ba, ba);
    float rr = r1 - r2;
    float a2 = l2 - rr * rr;
    float il2 = 1.0 / l2;
    vec3 pa = p - a;
    float y = dot(pa, ba);
    float z = y - l2;
    vec3 xv = pa * l2 - ba * y;
    float x2 = dot(xv, xv);
    float y2 = y * y * l2;
    float z2 = z * z * l2;
    float k = sign(rr) * rr * rr * x2;
    if (sign(z) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;
    if (sign(y) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;
    return (sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
  }
  mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
  float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }

  // ---- pose: everything that depends only on the uniforms is computed ONCE per pixel (not per distance
  // evaluation), which keeps the ray-march cheap enough for integrated GPUs ----------------------
  vec3 gH, gS, gHc;
  mat2 gHR;
  vec3 gRt[4], gKn[4], gFt[4];
  vec3 gTail[8];
  float gFlick;

  void leg(vec3 root, float th, float bendSign, out vec3 knee, out vec3 foot3) {
    float run = uRun;
    float stride = 0.30 * run;
    float lift = 0.20 * run;
    float sw = sin(th);
    vec3 foot = vec3(root.x + 0.02 + stride * cos(th), 0.035 + lift * max(sw, 0.0), root.z);
    vec3 d3 = foot - root;
    float len = max(length(d3.xy), 1e-4);
    float dist = min(len, 0.545);
    vec2 dir = d3.xy / len;
    float L = 0.28;
    float hh = sqrt(max(L * L - dist * dist * 0.25, 0.0));
    vec2 mid = root.xy + dir * dist * 0.5;
    knee = vec3(mid + vec2(-dir.y, dir.x) * hh * bendSign, root.z);
    foot3 = vec3(root.xy + dir * dist, root.z);
  }

  void setupPose() {
    float t = uTime;
    float ph = uPhase;
    float run = uRun;
    float bob = run * 0.055 * sin(2.0 * ph + 0.6) + (1.0 - run) * 0.006 * sin(t * 1.8);
    float arch = run * 0.10 * sin(ph + 0.4);
    gH = vec3(-0.34, 0.60 + bob - arch * 0.7, 0.0);
    gS = vec3( 0.30, 0.62 + bob + arch * 0.7, 0.0);

    gRt[0] = gS + vec3( 0.06, -0.12,  0.115);
    gRt[1] = gS + vec3( 0.06, -0.12, -0.115);
    gRt[2] = gH + vec3(-0.02, -0.10,  0.125);
    gRt[3] = gH + vec3(-0.02, -0.10, -0.125);
    leg(gRt[0], ph,        -1.0, gKn[0], gFt[0]);
    leg(gRt[1], ph + 0.55, -1.0, gKn[1], gFt[1]);
    leg(gRt[2], ph + 3.3,   1.0, gKn[2], gFt[2]);
    leg(gRt[3], ph + 3.85,  1.0, gKn[3], gFt[3]);

    float nod = run * 0.04 * sin(2.0 * ph + 1.4);
    gHc = gS + vec3(0.30, 0.17 - run * 0.07 + nod, 0.0);
    gHR = rot(-run * 0.12);
    gFlick = smoothstep(0.93, 1.0, sin(t * 1.1 + 2.0)) * 0.04;

    // tail: curls up when standing, streams out behind when running
    vec3 prev = gH + vec3(-0.22, 0.04, 0.0);
    gTail[0] = prev;
    float spd = 1.6 + run * 4.5;
    for (int i = 1; i < 8; i++) {
      float u = float(i) / 7.0;
      float angStand = 0.5 + u * 1.55;
      float angRun = 0.12 + u * 0.1 + sin(ph - u * 2.4) * 0.22 * u;
      float ang = mix(angStand, angRun, run) + sin(t * spd * 0.5 + u * 3.0) * 0.12 * u * (1.0 - run);
      prev += vec3(-cos(ang) * 0.115, sin(ang) * 0.115, sin(t * spd * 0.4 + u * 2.2) * 0.03 * u + run * sin(ph * 0.5 - u * 2.0) * 0.05 * u);
      gTail[i] = prev;
    }
  }

  // head-local point (the head turns a little with the stride)
  vec3 headLocal(vec3 p) {
    vec3 hp = p - gHc;
    hp.xy = gHR * hp.xy;
    return hp;
  }

  float map(vec3 p) {
    float d = sdEllipsoid(p - gH, vec3(0.30, 0.26, 0.23));
    d = smin(d, sdEllipsoid(p - gS, vec3(0.29, 0.28, 0.23)), 0.12);
    d = smin(d, sdCapsule(p, gH + vec3(0.05, 0.0, 0.0), gS - vec3(0.05, 0.0, 0.0), 0.215), 0.10);

    for (int i = 0; i < 4; i++) {
      float l = sdRoundCone(p, gRt[i], gKn[i], 0.105, 0.062);
      l = smin(l, sdRoundCone(p, gKn[i], gFt[i], 0.062, 0.046), 0.03);
      l = smin(l, sdEllipsoid(p - gFt[i] - vec3(0.05, 0.0, 0.0), vec3(0.105, 0.048, 0.066)), 0.03);
      d = smin(d, l, 0.05);
    }

    d = smin(d, sdCapsule(p, gS + vec3(0.1, 0.05, 0.0), gHc - vec3(0.08, 0.0, 0.0), 0.14), 0.08);
    vec3 hp = headLocal(p);
    float head = sdEllipsoid(hp, vec3(0.225, 0.195, 0.195));
    head = smin(head, sdEllipsoid(hp - vec3(0.15, -0.05, 0.0), vec3(0.10, 0.072, 0.095)), 0.06);
    head = smin(head, sdRoundCone(hp, vec3(-0.02, 0.12,  0.095), vec3(-0.07 - uRun * 0.05, 0.31,  0.114 + gFlick), 0.085, 0.018), 0.04);
    head = smin(head, sdRoundCone(hp, vec3(-0.02, 0.12, -0.095), vec3(-0.07 - uRun * 0.05, 0.31, -0.114 - gFlick), 0.085, 0.018), 0.04);
    d = smin(d, head, 0.07);

    float tail = 1e5;
    for (int i = 1; i < 8; i++) {
      float u = float(i) / 7.0;
      tail = min(tail, sdRoundCone(p, gTail[i - 1], gTail[i], mix(0.075, 0.045, u - 1.0 / 7.0), mix(0.075, 0.045, u)));
    }
    return smin(d, tail, 0.06);
  }

  // eyes: only evaluated for pixels that already hit the cat
  float eyes(vec3 p, out vec3 ep) {
    vec3 hp = headLocal(p);
    float blink = 1.0 - smoothstep(0.965, 0.985, sin(uTime * 0.7));
    vec3 r = vec3(0.03, 0.04 * blink, 0.04);
    vec3 e1 = hp - vec3(0.155, 0.04,  0.095);
    vec3 e2 = hp - vec3(0.155, 0.04, -0.095);
    float d1 = sdEllipsoid(e1, r), d2 = sdEllipsoid(e2, r);
    ep = d1 < d2 ? e1 : e2;
    return min(d1, d2);
  }

  vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.004, -0.004);
    return normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) + e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
  }

  void main() {
    vec2 q = (vUv - 0.5) * 3.2 + vec2(0.0, 0.56);
    vec3 cyan = vec3(0.0, 0.90, 1.0);

    // faint holographic pad under the paws when standing still
    float pad = exp(-(pow(q.x / 0.75, 2.0) + pow((q.y + 0.01) / 0.07, 2.0))) * (1.0 - uRun) * 0.55;

    // outside the cat's bounding box there is nothing to march
    if (abs(q.x) > 1.55 || q.y < -0.15 || q.y > 1.5) {
      gl_FragColor = vec4(cyan, pad * uAlpha);
      return;
    }

    setupPose();
    vec3 ro = vec3(q.x, q.y, 1.6);
    vec3 rd = vec3(0.0, 0.0, -1.0);
    mat2 R = rot(uYaw);
    ro.xz = R * ro.xz;
    rd.xz = R * rd.xz;

    float t = 0.0;
    float minD = 1e5;
    bool hit = false;
    for (int i = 0; i < 56; i++) {
      float d = map(ro + rd * t);
      minD = min(minD, d);
      if (d < 0.002) { hit = true; break; }
      t += d * 0.9;
      if (t > 3.2) break;
    }

    vec3 col = vec3(0.0);
    float a = 0.0;
    if (hit) {
      vec3 p = ro + rd * t;
      vec3 n = calcNormal(p);
      float v = max(dot(n, -rd), 0.0);
      float fres = pow(1.0 - v, 2.4);
      float fur = 0.75 + 0.5 * hash(floor(p * 90.0));
      vec3 L = normalize(vec3(-0.5, 0.8, 0.6));
      float diff = max(dot(n, L), 0.0);
      float up = 0.5 + 0.5 * n.y;
      col = vec3(0.012, 0.014, 0.020) + vec3(0.10, 0.14, 0.20) * diff * 0.55;
      col += cyan * fres * (0.55 + 0.9 * up) * fur * 1.25;
      col += vec3(0.35, 0.55, 0.8) * pow(max(dot(reflect(-L, n), -rd), 0.0), 18.0) * 0.12;
      col *= 0.8 + 0.2 * smoothstep(0.0, 0.35, p.y);

      vec3 ep;
      float eyeD = eyes(p, ep);
      if (eyeD < 0.012) {
        float slit = 1.0 - smoothstep(0.008, 0.02, abs(ep.z));
        col = mix(col, mix(cyan * 1.6 + vec3(0.25), vec3(0.0), slit * 0.9), smoothstep(0.012, 0.0, eyeD));
      }
      a = 1.0;
    } else {
      float halo = exp(-minD * 12.0) * 0.14;
      col = cyan * halo * 0.9;
      a = halo * 0.9;
    }
    col = mix(col, cyan, pad * (1.0 - a));
    a = max(a, pad);
    gl_FragColor = vec4(col, a * uAlpha);
  }
`

// where the cat stops on each section: [scroll pos, x (screen fraction), height (screen fraction)]
const PATH = [
  [0.0, 0.30, 0.30],
  [0.3, 0.30, 0.30],
  [0.4, 0.82, 0.30],
  [0.62, 0.82, 0.30],
  [0.85, 0.58, 0.30],
  [1.0, 0.56, 0.30],
  [2.0, 0.86, 0.30],
  [3.0, 0.92, 0.24],
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
const RUN_R = 0.18 // nearly side-on when running (so the legs read)
const FACE_R = 0 // heading right
const FACE_L = Math.PI // heading left

export default function RunCat() {
  const [failed, setFailed] = useState(false)
  if (!GUIDE.enabled || GUIDE.mode !== 'sdf' || failed) return null
  return <RunCatMesh onFail={() => setFailed(true)} />
}

function RunCatMesh({ onFail }) {
  const mesh = useRef()
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const checks = useRef(0)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPhase: { value: 0 },
      uRun: { value: 0 },
      uYaw: { value: IDLE_R },
      uAlpha: { value: 0 },
    }),
    []
  )
  const st = useMemo(() => ({ x: null, vx: 0, heading: 1, yaw: IDLE_R, phase: 0, run: 0, lastX: 0 }), [])

  useFrame(({ clock, size }, dt) => {
    const m = mesh.current
    if (!m) return
    dt = Math.min(dt, 0.05)

    // if this GPU/driver cannot build the cat shader, say so in the console and fall back to the photo cat
    if (checks.current < 240) {
      checks.current++
      if (checks.current % 20 === 0) {
        const prog = gl.properties.get(m.material)?.currentProgram
        if (prog?.diagnostics && prog.diagnostics.runnable === false) {
          console.warn('[RunCat] shader failed to compile on this GPU, falling back to the photo cat.', prog.diagnostics)
          scrollState.catFallback = true
          onFail()
          return
        }
        if (checks.current === 240) console.info('[RunCat] shader OK')
      }
    }
    const desktop = size.width > 900
    const [fx, hf] = at(scrollState.pos)
    const halfH = Math.tan(degToRad(camera.fov / 2)) * camera.position.z
    const halfW = halfH * (size.width / size.height)
    const hFrac = hf * (desktop ? 1 : 0.75)
    const sc = (hFrac * 2 * halfH) / 1.15 // model is ~1.15 tall

    const wx = (fx - 0.5) * 2 * halfW
    if (st.x === null) st.x = wx
    // run after the target (a spring-ish chase: it trots, then eases to a stop)
    const prev = st.x
    st.x = damp(st.x, wx, 2.6, dt)
    const vx = (st.x - prev) / Math.max(dt, 1e-3) // world units / s
    st.vx = damp(st.vx, vx, 10, dt)
    const speed = Math.abs(st.vx) / sc // model units / s
    const target = sstep(0.1, 1.2, speed)
    st.run = damp(st.run, target, 6, dt)

    // heading: face the way it runs; when standing, face the content (towards screen centre)
    if (speed > 0.15) st.heading = Math.sign(st.vx) || st.heading
    else st.heading = wx > 0 ? -1 : 1
    const faceYaw = st.heading > 0 ? FACE_R : FACE_L
    const view = MathUtils.lerp(IDLE_R, RUN_R, st.run)
    const yawT = st.heading > 0 ? faceYaw + view : faceYaw - view
    st.yaw = damp(st.yaw, yawT, 7, dt)

    // gait phase advances with distance covered
    st.phase += clamp(speed * 2.3, 0, 17) * dt

    const feet = (0.5 - 0.965) * 2 * halfH // feet sit near the bottom of the screen
    const bounce = Math.abs(Math.sin(st.phase * 2.0)) * 0 // (the body already bounces in the shader)
    m.position.set(st.x, feet + 0.56 * sc + bounce, 0.2)
    m.scale.set(3.2 * sc, 3.2 * sc, 1)

    uniforms.uTime.value = clock.elapsedTime
    uniforms.uPhase.value = st.phase
    uniforms.uRun.value = st.run
    uniforms.uYaw.value = st.yaw
    uniforms.uAlpha.value = damp(uniforms.uAlpha.value, clock.elapsedTime > 2.4 ? (desktop ? 1 : 0.7) : 0, 2.5, dt)
  })

  return (
    <mesh ref={mesh} renderOrder={9} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
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
