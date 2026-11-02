import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils } from 'three'
import { scrollState } from '../../store/scroll'
import { GUIDE } from '../../data/profile'

const { damp, degToRad } = MathUtils
const sstep = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}

// ---------------------------------------------------------------------------------------------
// The guide: a black cat, drawn as a signed-distance field in a fragment shader (no model file).
// Dark body + cyan rim light so it reads on the dark page, glowing slit eyes, swaying tail,
// head that follows the cursor, and it falls asleep at the end of the page.
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
  uniform vec2  uLook;   // where the head turns to (-1..1, in screen space)
  uniform float uSleep;  // 0 awake, 1 asleep
  uniform float uFlip;   // +1 faces right, -1 faces left (passes through 0 while turning round)
  uniform float uMove;   // 0..1 how much the cat is travelling (tail + bob)
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

  // ---- the cat ----------------------------------------------------------------------------
  // modelled facing +x, sitting on y = 0
  vec3 gHead;     // head centre
  float gEyeOpen; // 0..1
  float gEye;     // distance to the eyes (filled by map)
  vec3  gEyeP;    // point in the eye's local frame (for the slit pupil)

  float map(vec3 p) {
    float t = uTime;
    float sleep = uSleep;

    // chest + torso + haunches
    float d = sdEllipsoid(p - vec3(-0.06, 0.60 - sleep * 0.03, 0.0), vec3(0.34, 0.56, 0.32));
    d = smin(d, sdEllipsoid(p - vec3(0.10, 0.76, 0.0), vec3(0.20, 0.30, 0.25)), 0.16);
    for (int s = 0; s < 2; s++) {
      float z = s == 0 ? 0.20 : -0.20;
      d = smin(d, sdEllipsoid(p - vec3(-0.16, 0.27, z), vec3(0.30, 0.27, 0.19)), 0.12);
      // front legs + paws
      float lz = s == 0 ? 0.11 : -0.11;
      d = smin(d, sdCapsule(p, vec3(0.12, 0.74, lz), vec3(0.20, 0.07, lz * 1.15), 0.075), 0.06);
      d = smin(d, sdEllipsoid(p - vec3(0.25, 0.045, lz * 1.15), vec3(0.12, 0.055, 0.075)), 0.04);
    }

    // head (turns towards uLook)
    float lean = sleep * 0.30;
    vec3 hc = vec3(0.13, 1.26 - sleep * 0.10, 0.0);
    gHead = hc;
    vec3 hp = p - hc;
    float yaw = uLook.x * 0.55 * (1.0 - sleep * 0.8);
    float pit = (uLook.y * 0.28 - lean) ;
    hp.xz = rot(yaw) * hp.xz;
    hp.xy = rot(pit) * hp.xy;
    float head = sdEllipsoid(hp, vec3(0.27, 0.235, 0.25));
    head = smin(head, sdEllipsoid(hp - vec3(0.20, -0.07, 0.0), vec3(0.11, 0.08, 0.10)), 0.08);   // muzzle
    // ears (tips twitch now and then)
    float tw = smoothstep(0.92, 1.0, sin(t * 0.9 + 1.0)) * 0.05;
    for (int s = 0; s < 2; s++) {
      float z = s == 0 ? 0.135 : -0.135;
      float tz = s == 0 ? 1.0 : -1.0;
      vec3 a = vec3(-0.02, 0.15, z);
      vec3 b = vec3(-0.07 - sleep * 0.03, 0.42 - sleep * 0.05, z * 1.2 + tz * tw);
      head = smin(head, sdRoundCone(hp, a, b, 0.105, 0.022), 0.05);
    }
    d = smin(d, head, 0.10);

    // eyes
    float open = (1.0 - sleep) * gEyeOpen;
    float eh = mix(0.008, 0.052, open);
    float e = 1e5;
    for (int s = 0; s < 2; s++) {
      float z = s == 0 ? 0.115 : -0.115;
      vec3 ep = hp - vec3(0.205, 0.045, z);
      float ed = sdEllipsoid(ep, vec3(0.034, eh, 0.05));
      if (ed < e) { e = ed; gEyeP = ep; }
    }
    gEye = e;

    // tail: a tapering chain of capsules that curls up behind and sways
    vec3 prev = vec3(-0.40, 0.12, -0.04);
    float sway = 0.10 + uMove * 0.12;
    float spd = 1.5 + uMove * 2.5;
    float tail = 1e5;
    for (int i = 1; i <= 7; i++) {
      float u = float(i) / 7.0;
      vec3 q = vec3(
        -0.40 - 0.42 * sin(u * 2.3) + sin(t * spd + u * 3.2) * sway * u,
         0.10 + 0.95 * pow(u, 1.25) - sleep * 0.55 * u,
        -0.04 + 0.12 * u + cos(t * spd * 0.8 + u * 2.6) * sway * 0.8 * u + sleep * 0.34 * u
      );
      tail = min(tail, sdRoundCone(p, prev, q, mix(0.078, 0.042, (u - 1.0 / 7.0)), mix(0.078, 0.042, u)));
      prev = q;
    }
    d = smin(d, tail, 0.07);
    return min(d, 1e5);
  }

  vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.003, -0.003);
    return normalize(
      e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) + e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx)
    );
  }

  void main() {
    // orthographic view of the cat, turned ~30 degrees towards the viewer
    vec2 q = (vUv - 0.5) * vec2(2.6, 2.6) + vec2(0.0, 0.84);
    vec3 ro = vec3(q.x * uFlip, q.y, 3.0);
    vec3 rd = vec3(0.0, 0.0, -1.0);
    float th = 0.55;
    mat2 R = rot(th);
    ro.xz = R * ro.xz;
    rd.xz = R * rd.xz;

    // blink every few seconds
    gEyeOpen = 1.0 - smoothstep(0.96, 0.985, sin(uTime * 0.7)) * 1.0;

    float t = 0.0;
    float minD = 1e5;
    bool hit = false;
    for (int i = 0; i < 72; i++) {
      vec3 p = ro + rd * t;
      float d = map(p);
      minD = min(minD, d);
      if (d < 0.0015) { hit = true; break; }
      t += d * 0.9;
      if (t > 6.0) break;
    }

    vec3 col = vec3(0.0);
    float a = 0.0;
    vec3 cyan = vec3(0.0, 0.90, 1.0);

    if (hit) {
      vec3 p = ro + rd * t;
      vec3 n = calcNormal(p);
      map(p); // refresh the eye globals for this exact point
      float eyeD = gEye;
      float v = max(dot(n, -rd), 0.0);
      float fres = pow(1.0 - v, 2.4);

      // fur-ish speckle on the lit edge
      float fur = 0.75 + 0.5 * hash(floor(p * 90.0));
      vec3 L = normalize(vec3(-0.5, 0.8, 0.6));
      float diff = max(dot(n, L), 0.0);
      float up = 0.5 + 0.5 * n.y;

      vec3 base = vec3(0.012, 0.014, 0.020);
      col = base + vec3(0.10, 0.14, 0.20) * diff * 0.55;
      col += cyan * fres * (0.55 + 0.9 * up) * fur * 1.25;           // rim light
      col += vec3(0.35, 0.55, 0.8) * pow(max(dot(reflect(-L, n), -rd), 0.0), 18.0) * 0.12;
      // soft ambient occlusion
      float ao = clamp(map(p + n * 0.12) / 0.12, 0.35, 1.0);
      col *= ao;

      // eyes: emissive cyan with a slit pupil
      if (eyeD < 0.012) {
        float slit = 1.0 - smoothstep(0.010, 0.022, abs(gEyeP.z));
        vec3 ec = mix(cyan * 1.6 + vec3(0.25), vec3(0.0), slit * 0.9);
        float sleepy = 1.0 - uSleep * 0.7;
        col = mix(col, ec * sleepy, smoothstep(0.012, 0.0, eyeD));
      }
      a = 1.0;
    }

    // anti-aliased edge + soft cyan halo around the silhouette
    float edge = 1.0 - smoothstep(0.0, 0.012, minD);
    float halo = exp(-minD * 12.0) * 0.16;
    if (!hit) {
      col = cyan * halo * 0.9;
      a = max(edge * 0.0, halo * 0.9);
    }
    gl_FragColor = vec4(col, a * uAlpha);
  }
`

// ---- where the cat sits on each section: [pos, x, feetY, heightFrac, flip, sleep] (x / y as screen fractions)
const PATH = [
  [0.0, 0.34, 0.97, 0.30, 1, 0],
  [0.3, 0.34, 0.97, 0.30, 1, 0],
  [0.4, 0.80, 0.97, 0.30, -1, 0],
  [0.62, 0.80, 0.97, 0.30, -1, 0],
  [0.9, 0.62, 0.97, 0.30, -1, 0],
  [1.0, 0.60, 0.97, 0.30, -1, 0],
  [2.0, 0.86, 0.97, 0.30, -1, 0],
  [3.0, 0.93, 0.97, 0.22, -1, 0],
  [3.7, 0.86, 0.97, 0.30, -1, 0],
  [4.0, 0.84, 0.97, 0.34, -1, 1],
]
const lerpPath = (p, out) => {
  if (p <= PATH[0][0]) return PATH[0].slice(1).forEach((v, i) => (out[i] = v))
  for (let i = 1; i < PATH.length; i++) {
    if (p <= PATH[i][0]) {
      const a = PATH[i - 1]
      const b = PATH[i]
      const t = sstep(a[0], b[0], p)
      for (let k = 1; k < 6; k++) out[k - 1] = a[k] + (b[k] - a[k]) * t
      return
    }
  }
  PATH[PATH.length - 1].slice(1).forEach((v, i) => (out[i] = v))
}

export default function Cat() {
  if (!GUIDE.enabled) return null
  return <CatMesh />
}

function CatMesh() {
  const mesh = useRef()
  const camera = useThree((s) => s.camera)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uLook: { value: [0.6, 0] },
      uSleep: { value: 0 },
      uFlip: { value: 1 },
      uMove: { value: 0 },
      uAlpha: { value: 0 },
    }),
    []
  )
  const st = useMemo(() => ({ v: [0.34, 0.97, 0.3, 1, 0], x: 0, y: 0, look: [0.6, 0], tx: 0 }), [])

  useFrame(({ clock, pointer, viewport, size }, dt) => {
    const m = mesh.current
    if (!m) return
    const desktop = size.width > 900
    const tmp = [0, 0, 0, 0, 0]
    lerpPath(scrollState.pos, tmp)
    const [fx, fy, hf, flip, sleep] = tmp

    const halfH = Math.tan(degToRad(camera.fov / 2)) * camera.position.z
    const halfW = halfH * (size.width / size.height)
    const hFrac = hf * (desktop ? 1 : 0.8)
    const sc = (hFrac * 2 * halfH) / 1.7 // world scale: the cat is ~1.7 units tall

    const wx = (fx - 0.5) * 2 * halfW
    const feet = (0.5 - fy) * 2 * halfH
    const bob = Math.sin(clock.elapsedTime * 1.4) * 0.02 * sc * (1 + scrollState.vel * 2)
    st.x = damp(st.x, wx, 4, dt)
    st.y = damp(st.y, feet, 4, dt)
    const move = Math.min(Math.abs(wx - st.x) * 0.8 + scrollState.vel * 0.6, 1)

    m.position.set(st.x, st.y + 0.84 * sc + bob, 0.2)
    m.rotation.z = damp(m.rotation.z, (wx - st.x) * -0.04, 4, dt)
    m.scale.set(2.6 * sc, 2.6 * sc, 1)

    // head follows the cursor (mirrored when the cat faces left)
    const f = uniforms.uFlip.value
    const lx = pointer.x * 1.0 * Math.sign(f || 1)
    st.look[0] = damp(st.look[0], MathUtils.clamp(lx, -1, 1), 3, dt)
    st.look[1] = damp(st.look[1], pointer.y, 3, dt)
    uniforms.uLook.value = [st.look[0], st.look[1]]
    uniforms.uFlip.value = damp(f, flip, 6, dt)
    uniforms.uSleep.value = damp(uniforms.uSleep.value, sleep, 2, dt)
    uniforms.uMove.value = damp(uniforms.uMove.value, move, 3, dt)
    uniforms.uTime.value = clock.elapsedTime
    // fades in with the page, a little transparent on small screens so it never fights the text
    uniforms.uAlpha.value = damp(uniforms.uAlpha.value, desktop ? 1 : 0.55, 2, dt)
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
