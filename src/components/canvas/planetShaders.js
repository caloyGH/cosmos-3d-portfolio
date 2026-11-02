// GLSL for the background planet (kept in its own file so it can be tested without React).
const NOISE = /* glsl */ `
  float h3(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float n3(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1.0, 0.0, 0.0)), f.x),
                   mix(h3(i + vec3(0.0, 1.0, 0.0)), h3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
               mix(mix(h3(i + vec3(0.0, 0.0, 1.0)), h3(i + vec3(1.0, 0.0, 1.0)), f.x),
                   mix(h3(i + vec3(0.0, 1.0, 1.0)), h3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
  }
  const mat3 ROT = mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64);
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * n3(p);
      p = ROT * p * 2.03 + 1.7;   // rotate each octave so the value-noise grid never shows
      a *= 0.5;
    }
    return v;
  }

  float fbm3(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * n3(p);
      p = ROT * p * 2.03 + 1.7;
      a *= 0.5;
    }
    return v;
  }

`

// cloud layer shared by the ground (for cloud shadows) and the separate cloud shell: the clouds turn faster than the ground
const CLOUDS = /* glsl */ `
  uniform float uTilt;
  vec3 tiltP(vec3 p) { float c = cos(uTilt), s = sin(uTilt); return vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z); }
  float cloudAt(vec3 p) {
    vec3 t = tiltP(p);
    float a = uTime * 0.04;   // clouds drift slowly relative to the ground (the whole shell already turns with the planet)
    vec3 c = vec3(cos(a) * t.x + sin(a) * t.z, t.y, -sin(a) * t.x + cos(a) * t.z);
    c += (fbm3(c * 2.2 + vec3(5.0, 1.0, 3.0)) - 0.5) * vec3(0.7, 0.35, 0.7);   // swirl: bend the pattern into storm-like whorls
    float cb = fbm3(c * 3.4 + vec3(0.0, 0.0, 9.0));
    float cd = fbm3(c * 9.0 + vec3(0.0, 3.0, 1.0));
    return smoothstep(0.44, 0.7, cb * 0.78 + cd * 0.3);
  }
`
export const planetVertex = /* glsl */ `
  varying vec3 vObj;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vRx;
  varying vec3 vRy;
  varying vec3 vRz;
  void main() {
    vObj = position;
    vRx = normalMatrix * vec3(1.0, 0.0, 0.0);   // how the mesh's own axes point on screen (the mesh really turns)
    vRy = normalMatrix * vec3(0.0, 1.0, 0.0);
    vRz = normalMatrix * vec3(0.0, 0.0, 1.0);
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`

export const planetFragment = /* glsl */ `
  precision highp float;
  varying vec3 vObj;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vRx;
  varying vec3 vRy;
  varying vec3 vRz;
  uniform float uTime;
  uniform float uGas;
  uniform float uOcean;
  uniform float uCloud;
  uniform float uShell;   // > 0: this planet has a separate cloud shell (its clouds + their shadows come from that)
  uniform float uAtmoK;
  uniform float uDim;
  uniform float uPolar;
  uniform float uSpot;
  uniform vec3 uFlash;   // colour of the little sparks (storms / dust) on planets without city lights
  uniform vec3 uC0;
  uniform vec3 uC1;
  uniform vec3 uC2;
  uniform vec3 uAtmo;
  uniform vec3 uSun;

  ${NOISE}
  ${CLOUDS}
  void main() {
    vec3 p = normalize(vObj);
    vec3 pt = tiltP(p);                              // axial tilt: the spin axis leans like the real planet's
    vec3 q = pt;                                     // the spin and the tilt are done by the mesh itself (Planet.jsx), so q is just the point on the ball

    // Everything below is skipped (uniform branch, so it is free) for the kind of planet that does not need it.
    // This shader runs on a huge part of the screen: keep it cheap.
    vec3 rockyCol = vec3(0.0);
    float land = 0.0;
    float ice = 0.0;
    float bump = 0.0;
    vec3 rel = vec3(0.0);
    if (uGas < 0.999) {
      float h = fbm(q * 2.6);
      float h2 = fbm3(q * 12.0 + 3.0);
      float h3 = fbm3(q * 34.0 + 7.0);                 // fine detail: rough coasts, craters, grain
      // relief: tilt the surface normal by the slope of a height field (3 samples), so mountains and craters catch the light and cast
      // shade near the terminator. Sampled in the mesh's own space, so the shading stays put while the ground turns beneath it.
      vec3 ax = abs(q.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
      vec3 t1 = normalize(cross(q, ax));
      vec3 t2 = cross(q, t1);
      float e = 0.014;
      float r0 = fbm3(q * 7.0 + 13.0) + 0.5 * h2;
      float r1 = fbm3((q + t1 * e) * 7.0 + 13.0) + 0.5 * fbm3((q + t1 * e) * 12.0 + 3.0);
      float r2 = fbm3((q + t2 * e) * 7.0 + 13.0) + 0.5 * fbm3((q + t2 * e) * 12.0 + 3.0);
      float k = 0.075 * (1.0 - uOcean * 0.85);
      rel = -k * ((r1 - r0) / e * 0.06 * t1 + (r2 - r0) / e * 0.06 * t2) * 14.0;
      vec3 rock = mix(uC0, uC1, smoothstep(0.34, 0.62, h));
      rock = mix(rock, uC2, smoothstep(0.6, 0.82, h) * 0.85);
      rock *= (0.78 + 0.45 * h2) * (0.82 + 0.36 * h3);
      rockyCol = rock;
      if (uOcean > 0.001) {
        // earth-like: oceans and continents
        land = smoothstep(0.5, 0.53, h);
        vec3 landCol = mix(uC1, uC2, smoothstep(0.56, 0.78, h)) * (0.8 + 0.4 * h2) * (0.84 + 0.32 * h3);
        vec3 seaCol = mix(uC0 * (0.7 + 0.5 * h2), vec3(0.05, 0.4, 0.5), smoothstep(0.36, 0.5, h) * 0.7); // shallow turquoise near the coast
        float desert = smoothstep(0.55, 0.7, fbm3(q * 4.5 + 30.0)) * (1.0 - smoothstep(0.3, 0.6, abs(q.y)));
        landCol = mix(landCol, vec3(0.72, 0.58, 0.34) * (0.85 + 0.3 * h3), desert * 0.8);   // dry belts
        landCol = mix(landCol, vec3(0.95), smoothstep(0.76, 0.86, h) * (1.0 - desert));      // snowy peaks
        vec3 earth = mix(seaCol, landCol, land);
        rockyCol = mix(rock, earth, uOcean);
      }
      ice = smoothstep(0.82, 0.94, abs(q.y) + (h - 0.5) * 0.25);
      rockyCol = mix(rockyCol, vec3(0.93, 0.95, 1.0), ice * uPolar);   // polar caps
    }

    vec3 col = rockyCol;
    if (uGas > 0.001) {
      // bands turn at slightly different speeds (like the real thing), so the rotation is visible even though the bands are horizontal
      float sh = uTime * 0.03 * sin(p.y * 7.0);
      vec3 qg = vec3(cos(sh) * q.x + sin(sh) * q.z, q.y, -sin(sh) * q.x + cos(sh) * q.z);
      float turb = fbm3(vec3(qg.x * 1.6, qg.y * 3.0, qg.z * 1.6) + uTime * 0.02);
      float band = sin((q.y + (turb - 0.5) * 0.16) * 15.0) * 0.5 + 0.5;
      float band2 = fbm3(vec3(qg.x * 0.9, qg.y * 14.0, qg.z * 0.9) + turb);
      band += (fbm3(vec3(qg.x * 3.0, qg.y * 40.0, qg.z * 3.0)) - 0.5) * 0.18; // fine streaks
      vec3 gas = mix(uC0, uC1, band);
      gas = mix(gas, uC2, smoothstep(0.5, 0.9, band2) * 0.7);
      gas *= 0.85 + 0.3 * band2;
      if (abs(uSpot) > 0.001) {
        // a long-lived storm: Jupiter's red spot (uSpot > 0) or Neptune's dark spot (uSpot < 0)
        float lon = atan(q.z, q.x);
        float dl = mod(lon - 0.7 + 3.14159, 6.28318) - 3.14159;
        float spot = 1.0 - smoothstep(0.25, 1.0, length(vec2(dl * 1.5, (q.y + 0.28) * 4.2)));
        vec3 spotCol = uSpot > 0.0 ? mix(uC2, vec3(0.85, 0.3, 0.18), 0.5) * (0.85 + 0.3 * band2) : vec3(0.01, 0.04, 0.2);
        gas = mix(gas, spotCol, spot * 0.85 * abs(uSpot));
      }
      col = mix(rockyCol, gas, uGas);
    }

    // clouds
    if (uCloud > 0.001) {
      float cb = fbm3(q * 3.4 + vec3(uTime * 0.02, 0.0, 9.0));
      float cd = fbm3(q * 9.0 + vec3(uTime * 0.03, 3.0, 1.0));
      float cl = smoothstep(0.5, 0.74, cb * 0.78 + cd * 0.3);
      col = mix(col, vec3(1.0), cl * uCloud);
    }

    // shadows of the shell clouds on the ground (they sit above it, so the shadow slips away from the sun)
    if (uShell > 0.001) {
      vec3 Lw = normalize(uSun);
      col *= 1.0 - 0.38 * cloudAt(normalize(p + Lw * 0.035)) * uShell;
    }

    // lighting: sun side lit, night side nearly black
    vec3 N = normalize(vN + rel.x * vRx + rel.y * vRy + rel.z * vRz);
    vec3 V = normalize(vV);
    float ndl = dot(N, normalize(uSun));
    float lit = smoothstep(-0.35, 0.65, ndl) * (1.0 + bump);
    vec3 lc = col * (0.12 + 0.88 * lit);

    // sun glint on the oceans
    if (uOcean > 0.001) {
      vec3 Ls = normalize(uSun);
      float glint = pow(max(dot(reflect(-Ls, N), V), 0.0), 36.0) * (1.0 - land) * uOcean * smoothstep(0.0, 0.3, ndl);
      lc += vec3(0.75, 0.88, 1.0) * glint * 0.55;
    }

    // city lights on Earth's night side
    float night = 1.0 - smoothstep(-0.2, 0.16, ndl);
    if (uOcean > 0.001 && night > 0.01) {
      float c1 = smoothstep(0.37, 0.5, fbm3(q * 9.0 + 4.0));           // regions with towns
      float c2 = smoothstep(0.44, 0.58, fbm3(q * 34.0));               // individual lights
      float c3 = smoothstep(0.5, 0.65, fbm3(q * 70.0 + 2.0));          // tiny villages
      float tw = 0.88 + 0.12 * sin(uTime * 2.3 + q.x * 90.0 + q.z * 70.0);
      float on = land * uOcean * (1.0 - ice * uPolar) * night;
      lc += vec3(1.0, 0.74, 0.4) * (c1 * c2 * 1.5 * tw + c1 * c3 * 0.8) * on;
      lc += vec3(1.0, 0.6, 0.25) * c1 * 0.1 * on;                       // faint glow over big urban regions
    }

    // little sparks on the other worlds: lightning in the gas giants, glinting dust on Mars (colour from data/planets.js)
    if (uFlash.x + uFlash.y + uFlash.z > 0.001) {
      float sp = smoothstep(0.63, 0.7, fbm3(q * 24.0 + 11.0));
      float ph = fbm3(q * 5.0 + 21.0) * 60.0;
      float fl = pow(max(sin(uTime * 1.6 + ph), 0.0), 14.0);
      float dark = 0.4 + 0.6 * (1.0 - smoothstep(-0.2, 0.35, ndl));
      lc += uFlash * sp * fl * dark * 1.5;
    }

    // aurora around the poles on the night side (stays put while the ground turns beneath it)
    if (uOcean > 0.001) {
      float pole = abs(pt.y);
      float band = smoothstep(0.7, 0.8, pole) * (1.0 - smoothstep(0.86, 0.96, pole));
      float wav = 0.55 + 0.45 * sin(uTime * 0.9 + pt.x * 14.0 + sin(pt.z * 9.0 + uTime * 0.4) * 2.0);
      float dk = 1.0 - smoothstep(-0.15, 0.2, ndl);
      lc += mix(vec3(0.15, 1.0, 0.55), vec3(0.45, 0.5, 1.0), smoothstep(0.78, 0.9, pole)) * band * wav * dk * 0.5;
    }

    // atmosphere rim, strongest on the sunlit limb
    float fr = pow(1.0 - max(dot(N, V), 0.0), 3.6);
    lc += uAtmo * fr * (0.1 + 0.7 * smoothstep(-0.5, 0.5, ndl)) * uAtmoK;
    // blue haze of scattered sunlight over the whole day side of a world with oceans
    lc += uAtmo * 0.2 * smoothstep(-0.05, 0.8, ndl) * (0.4 + 0.6 * fr) * uAtmoK * uOcean;

    // sunset colours where the atmosphere meets the terminator (light scattering at dusk/dawn)
    float dq = (ndl - 0.04) / 0.16;
    float dusk = exp(-(dq * dq));
    lc += mix(vec3(1.0, 0.5, 0.25), uAtmo, 0.25) * fr * dusk * 0.9 * uAtmoK;

    lc = pow(lc * uDim, vec3(2.2));   // same perceptual -> linear conversion as Nebula
    gl_FragColor = vec4(lc, 1.0);
  }
`

export const haloVertex = /* glsl */ `
  varying vec3 vN;
  void main() {
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
export const haloFragment = /* glsl */ `
  precision highp float;
  varying vec3 vN;
  uniform vec3 uAtmo;
  uniform float uAtmoK;
  uniform vec3 uSun;
  void main() {
    float i = pow(max(0.64 - dot(vN, vec3(0.0, 0.0, 1.0)), 0.0), 2.6);
    float side = 0.35 + 0.65 * smoothstep(-0.7, 0.7, dot(normalize(vN.xy + 0.0001), normalize(uSun.xy)));
    vec3 c = uAtmo * i * side * uAtmoK * 0.9;
    gl_FragColor = vec4(pow(c, vec3(2.2)), 1.0);
  }
`

export const ringVertex = /* glsl */ `
  varying vec3 vObj;
  void main() {
    vObj = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
export const ringFragment = /* glsl */ `
  precision highp float;
  varying vec3 vObj;
  uniform float uRing;
  uniform vec3 uC1;
  void main() {
    float r = length(vObj.xy);
    float t = (r - 1.32) / 1.0;
    float b = 0.55 + 0.45 * sin(t * 70.0 + sin(t * 19.0) * 2.5);
    b *= 0.6 + 0.4 * sin(t * 140.0);
    b *= smoothstep(0.0, 0.08, abs(t - 0.58)) ;
    b *= smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.9, 1.0, t));
    vec3 c = mix(vec3(0.72, 0.6, 0.42), vec3(0.95, 0.88, 0.7), b) * 0.9;
    gl_FragColor = vec4(pow(c, vec3(2.2)), clamp(b, 0.0, 1.0) * uRing * 0.9);
  }
`

// the Earth's separate cloud shell: a slightly bigger transparent sphere, so the clouds really float above the ground
export const cloudFragment = /* glsl */ `
  precision highp float;
  varying vec3 vObj;
  varying vec3 vN;
  varying vec3 vV;
  uniform float uTime;
  uniform float uShell;
  uniform vec3 uSun;
  uniform vec3 uAtmo;
  uniform float uDim;
  ${NOISE}
  ${CLOUDS}
  void main() {
    vec3 p = normalize(vObj);
    float cl = cloudAt(p) * uShell;
    if (cl < 0.01) discard;
    vec3 N = normalize(vN);
    float ndl = dot(N, normalize(uSun));
    float lit = smoothstep(-0.2, 0.55, ndl);
    float hgx = dFdx(cl), hgy = dFdy(cl);
    float relief = clamp((hgx * -0.7 + hgy * 0.7) * 2.5, -0.12, 0.12);   // puffy look: clouds facing the sun are brighter
    lit *= 1.0 + relief;
    vec3 col = mix(vec3(0.7, 0.8, 1.0) * 0.05, vec3(0.84, 0.92, 1.0), clamp(lit, 0.0, 1.0));   // dark side: faint blue-grey; day side: cool white
    float dq = (ndl - 0.03) / 0.14;
    float dusk = exp(-(dq * dq));
    col = mix(col, vec3(1.0, 0.55, 0.3) * 0.8, dusk * 0.4);          // orange where day turns to night
    col += uAtmo * 0.15 * pow(1.0 - max(dot(N, normalize(vV)), 0.0), 3.0) * lit;
    gl_FragColor = vec4(pow(col * uDim, vec3(2.2)), clamp(cl * 0.92, 0.0, 1.0));
  }
`

// the sun peeking over the limb: a hot core, a soft halo and a faint horizontal streak (additive, drawn over the planet's edge)
export const flareVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv - 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
export const flareFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    float r = length(vUv);
    float core = pow(max(1.0 - r * 2.0, 0.0), 7.0);
    float halo = exp(-r * r * 26.0) * 0.45;
    float streak = exp(-abs(vUv.y) * 90.0) * exp(-abs(vUv.x) * 6.0) * 0.5;
    float pulse = 0.92 + 0.08 * sin(uTime * 1.3);
    vec3 c = mix(vec3(1.0, 0.5, 0.18), vec3(1.0, 0.94, 0.82), clamp(core * 1.4, 0.0, 1.0)) * (core * 1.5 + halo + streak) * pulse;
    gl_FragColor = vec4(c * 0.6, 1.0);
  }
`
