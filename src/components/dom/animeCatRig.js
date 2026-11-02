// Pure 2D rig for the anime cat. Cat faces +x, ground is +y. Units ~ px in a 260x150 box.
const TAU = Math.PI * 2
const lerp = (a, b, t) => a + (b - a) * t

// two-bone IK: returns the joint (knee/elbow) between hip H and target T
function ik(H, T, l1, l2, bend) {
  let dx = T[0] - H[0], dy = T[1] - H[1]
  let d = Math.hypot(dx, dy)
  const max = l1 + l2 - 0.01
  if (d > max) { dx *= max / d; dy *= max / d; d = max }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(l1 * l1 - a * a, 0))
  const mx = H[0] + (dx * a) / d, my = H[1] + (dy * a) / d
  return [mx + (-dy / d) * h * bend, my + (dx / d) * h * bend]
}

// one foot: ellipse-ish path, planted when sin<0 (stance), lifted when swinging
function foot(cx, ground, stride, lift, ph) {
  const s = Math.sin(ph), c = Math.cos(ph)
  return [cx + c * stride, ground - (s > 0 ? Math.pow(s, 0.8) * lift : 0)]
}

/**
 * pose(ph, run, t) -> { shapes:[{k:'cap',a:[x,y],ra,b:[x,y],rb}|{k:'tri'...}], eyes, ... }
 * ph = gait phase (radians), run 0..1 (0 = standing/breathing), t = seconds
 */
export function pose(ph, run, t) {
  const S = []
  const cap = (a, ra, b, rb) => S.push({ k: 'cap', a, ra, b, rb })
  const bob = Math.sin(ph * 2 + 0.6) * 5 * run + Math.sin(t * 1.8) * 0.8 * (1 - run)
  const ground = 140
  const stride = 34 * run
  const lift = 30 * run

  // spine flex: hips low / chest high when gathering, stretched when airborne
  const flex = Math.sin(ph * 2 - 0.4) * 6 * run
  const hip = [92, 74 + bob + flex * 0.6]
  const chest = [160, 70 + bob - flex]
  const crouch = (1 - run) * 6
  hip[1] += crouch * 0
  cap(hip, 13.5, chest, 16)
  // belly tuck / chest bulge for volume
  cap([116, 76 + bob], 12.5, [136, 74 + bob - flex * 0.5], 13.5)

  // neck + head (head bobs against body)
  const neckTop = [182, 55 + bob - flex * 1.2 - 2 * run]
  cap(chest, 12, neckTop, 9.5)
  const head = [196, 47 + bob - flex * 1.2 - 2 * run + Math.sin(ph * 2 + 2.2) * 1.5 * run]
  cap(neckTop, 9.5, head, 15)
  // muzzle
  cap([head[0] + 9, head[1] + 4], 6.5, [head[0] + 16, head[1] + 6.5], 5)
  // ears (triangles), flatten a bit when running
  const earBack = run * 7
  const ears = [
    [[head[0] - 13, head[1] - 7], [head[0] - 10 - earBack, head[1] - 34 + run * 5], [head[0] + 3, head[1] - 13]],
    [[head[0] - 1, head[1] - 14], [head[0] + 9 - earBack * 0.6, head[1] - 35 + run * 5], [head[0] + 14, head[1] - 6]]
  ]

  // legs: hind pair drives, fore pair reaches. rotary gallop offsets
  const phs = [ph, ph + 0.5, ph + 1.9 + 0.25, ph + 1.9 + 0.75] // hindL, hindR, foreL, foreR (offsets give the 4-beat feel)
  const legs = []
  const mk = (i, H, l1, l2, bend, cx, back) => {
    const f = foot(cx, ground + bob * 0 , stride, lift, phs[i] * 1)
    // standing: neutral planted legs
    const stand = [cx + (i % 2 ? 6 : -4), ground]
    const T = [lerp(stand[0], f[0], run), lerp(stand[1], f[1], run)]
    const K = ik(H, T, l1, l2, bend)
    cap(H, i < 2 ? 12.5 : 9, K, i < 2 ? 7 : 5.6)
    cap(K, i < 2 ? 7 : 5.6, T, 4)
    // paw
    cap(T, 4.2, [T[0] + 8, T[1] + 0.5 - (T[1] < ground - 3 ? 2 : 0)], 3.4)
    legs.push({ H, K, T })
  }
  // far side legs first (drawn darker later by caller via index), near side after
  mk(1, [hip[0] + 2, hip[1] + 6], 36, 40, 1, 84, 1)
  mk(3, [chest[0] - 2, chest[1] + 6], 32, 38, -1, 164, 1)
  mk(0, [hip[0] - 5, hip[1] + 8], 36, 40, 1, 76, 1)
  mk(2, [chest[0] - 8, chest[1] + 8], 32, 38, -1, 154, 1)

  // tail: chain with travelling wave, raised when running
  const tail = []
  let p = [hip[0] - 9, hip[1] - 3]
  let ang = Math.PI + lerp(0.7, 0.25, run) // pointing back, curve upward at rest
  const N = 9
  for (let i = 0; i < N; i++) {
    const r = lerp(5.5, 2.4, i / (N - 1))
    const wave = Math.sin(ph * 1.0 - i * 0.7) * 0.22 * run + Math.sin(t * 2.2 - i * 0.55) * 0.18 * (1 - run)
    ang += wave * 0.5 - lerp(0.16, 0.05, run) * (i / N) * 1.4
    const q = [p[0] + Math.cos(ang) * 10, p[1] + Math.sin(ang) * 10]
    tail.push({ a: p, ra: r, b: q, rb: lerp(5.5, 2.4, (i + 1) / (N - 1)) })
    p = q
  }
  for (const s of tail) cap(s.a, s.ra, s.b, s.rb)

  return { shapes: S, ears, head, legs, bob, flex, run }
}

// capsule path between two circles (tangent hull)
export function capPath(a, ra, b, rb) {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const d = Math.hypot(dx, dy) || 1e-6
  const base = Math.atan2(dy, dx)
  const k = Math.acos(Math.max(-1, Math.min(1, (ra - rb) / d)))
  const a1 = base + k, a2 = base - k
  const P = (c, r, an) => [c[0] + Math.cos(an) * r, c[1] + Math.sin(an) * r]
  const p1 = P(a, ra, a1), p2 = P(b, rb, a1), p3 = P(b, rb, a2), p4 = P(a, ra, a2)
  const f = (n) => n.toFixed(1)
  return `M${f(p1[0])} ${f(p1[1])}L${f(p2[0])} ${f(p2[1])}A${f(rb)} ${f(rb)} 0 1 0 ${f(p3[0])} ${f(p3[1])}L${f(p4[0])} ${f(p4[1])}A${f(ra)} ${f(ra)} 0 1 0 ${f(p1[0])} ${f(p1[1])}Z`
}

export function shapesToPath(shapes) {
  let d = ''
  for (const s of shapes) d += capPath(s.a, s.ra, s.b, s.rb)
  return d
}
export function earsPath(ears) {
  return ears.map((e) => `M${e[0][0].toFixed(1)} ${e[0][1].toFixed(1)}L${e[1][0].toFixed(1)} ${e[1][1].toFixed(1)}L${e[2][0].toFixed(1)} ${e[2][1].toFixed(1)}Z`).join('')
}
