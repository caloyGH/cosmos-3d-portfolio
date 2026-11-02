// GLSL for the finale black hole (own file so it can be tested without React).

// vertex shared by the disk and the lensed ring: passes the local (flat) position along
export const holeVertex = /* glsl */ `
  varying vec3 vP;
  void main() {
    vP = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// accretion disk seen at an angle: hot white-yellow inside, orange, then magenta and blue at the rim; one side brighter (doppler)
export const diskFragment = /* glsl */ `
  precision highp float;
  varying vec3 vP;
  uniform float uTime;
  uniform float uFin;
  uniform float uHalf;     // +1: only the half nearest the camera, -1: only the far half (so the horizon can sit between them)
  uniform float uIn;       // inner radius
  uniform float uOut;      // outer radius
  void main() {
    if (vP.y * uHalf < 0.0) discard;
    float r = length(vP.xy);
    float t = clamp((r - uIn) / (uOut - uIn), 0.0, 1.0);
    float a = atan(vP.y, vP.x);
    float swirl = sin(a * 9.0 + (1.0 / (t + 0.15)) * 5.0 + uTime * (1.6 / (t + 0.25)));   // + : the disk turns clockwise
    float swirl2 = sin(a * 23.0 - (1.0 / (t + 0.2)) * 9.0 + uTime * (2.4 / (t + 0.3)));
    float pat = 0.55 + 0.3 * swirl + 0.15 * swirl2;
    float dop = 1.0 + 0.7 * cos(a - 0.5);                      // the side turning toward us is brighter
    vec3 hot = vec3(1.0, 0.93, 0.75);
    vec3 mid = vec3(1.0, 0.5, 0.14);
    vec3 cold = vec3(0.45, 0.2, 0.85);
    vec3 rim = vec3(0.1, 0.45, 1.0);
    vec3 c = mix(hot, mid, smoothstep(0.0, 0.35, t));
    c = mix(c, cold, smoothstep(0.3, 0.7, t));
    c = mix(c, rim, smoothstep(0.65, 1.0, t));
    float edge = smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.55, 1.0, t));
    float glow = pow(1.0 - t, 2.2) * 1.4 + 0.25;               // much hotter near the hole
    float al = edge * pat * glow * dop * uFin;
    gl_FragColor = vec4(c * al, 1.0);
  }
`

// light bent around the hole: a face-on ring, brightest above and below (the far side of the disk seen over/under the horizon)
export const lensFragment = /* glsl */ `
  precision highp float;
  varying vec3 vP;
  uniform float uTime;
  uniform float uFin;
  uniform float uIn;
  uniform float uOut;
  void main() {
    float r = length(vP.xy);
    float t = clamp((r - uIn) / (uOut - uIn), 0.0, 1.0);
    float a = atan(vP.y, vP.x);
    float topBot = pow(abs(sin(a)), 1.4);
    float shimmer = 0.85 + 0.15 * sin(a * 11.0 - uTime * 1.5);
    vec3 c = mix(vec3(1.0, 0.85, 0.6), vec3(1.0, 0.45, 0.15), smoothstep(0.0, 0.7, t));
    float ring = pow(1.0 - t, 3.0) * smoothstep(0.0, 0.04, t);
    float pq = (t - 0.02) * 28.0;
    float photon = exp(-(pq * pq)) * 1.4;   // (no pow() on a possibly negative number: that is NaN on some GPUs)     // the thin bright photon ring hugging the horizon
    float al = (ring * (0.15 + 0.85 * topBot) * shimmer * 1.15 + photon) * uFin;
    gl_FragColor = vec4(c * al, 1.0);
  }
`

// everything falling in: points on tightening spirals, faster and brighter as they near the hole
export const infallVertex = /* glsl */ `
  uniform float uTime;
  uniform float uFin;
  uniform float uPixelRatio;
  uniform float uHoleR;
  attribute vec3 aSeed;     // x: start angle, y: start radius, z: phase
  varying float vA;
  varying float vLife;
  void main() {
    float life = fract(aSeed.z + uTime * 0.045 * (0.5 + 2.6 * uFin));
    float e = 1.0 - life;
    float r = uHoleR + (aSeed.y - uHoleR) * pow(e, 1.8);
    float ang = aSeed.x - life * life * 11.0 * (0.6 + uFin) - uTime * 0.05;   // spiralling in clockwise
    vec3 p = vec3(cos(ang) * r, sin(ang) * r * 0.72, sin(aSeed.x * 3.0) * 0.7 * e);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vLife = life;
    vA = smoothstep(0.0, 0.08, life) * (1.0 - smoothstep(0.93, 1.0, life)) * smoothstep(0.03, 0.3, uFin);
    gl_PointSize = (2.4 + 5.0 * life) * uPixelRatio * (11.0 / -mv.z);
  }
`
export const infallFragment = /* glsl */ `
  precision highp float;
  varying float vA;
  varying float vLife;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = 1.0 - smoothstep(0.0, 0.5, d);
    vec3 c = mix(vec3(0.0, 0.75, 1.0), vec3(1.0, 0.72, 0.38), vLife * vLife);
    gl_FragColor = vec4(c * core * core, vA * core);
  }
`
