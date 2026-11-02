// GLSL for the background planet (kept in its own file so it can be tested without React).
export const planetVertex = /* glsl */ `
  varying vec3 vObj;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vObj = position;
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
  uniform float uTime;
  uniform float uGas;
  uniform float uOcean;
  uniform float uCloud;
  uniform float uAtmoK;
  uniform float uDim;
  uniform float uPolar;
  uniform float uSpot;
  uniform vec3 uC0;
  uniform vec3 uC1;
  uniform vec3 uC2;
  uniform vec3 uAtmo;
  uniform vec3 uSun;

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

  void main() {
    vec3 p = normalize(vObj);
    float ang = uTime * 0.035;                       // slow planetary spin
    vec3 q = vec3(cos(ang) * p.x + sin(ang) * p.z, p.y, -sin(ang) * p.x + cos(ang) * p.z);

    // Everything below is skipped (uniform branch, so it is free) for the kind of planet that does not need it.
    // This shader runs on a huge part of the screen: keep it cheap.
    vec3 rockyCol = vec3(0.0);
    float land = 0.0;
    float ice = 0.0;
    float bump = 0.0;
    if (uGas < 0.999) {
      float h = fbm(q * 2.6);
      float h2 = fbm3(q * 12.0 + 3.0);
      // cheap bump shading from the height map's screen-space slope (free: uses derivatives, no extra noise)
      vec2 hg = vec2(dFdx(h), dFdy(h)) / (length(vec2(fwidth(q.x), fwidth(q.y))) + 1e-4);
      bump = clamp(dot(hg, vec2(-0.7, 0.7)) * 0.05, -0.35, 0.35) * (1.0 - uOcean * 0.7);
      vec3 rock = mix(uC0, uC1, smoothstep(0.34, 0.62, h));
      rock = mix(rock, uC2, smoothstep(0.6, 0.82, h) * 0.85);
      rock *= 0.78 + 0.45 * h2;
      rockyCol = rock;
      if (uOcean > 0.001) {
        // earth-like: oceans and continents
        land = smoothstep(0.5, 0.53, h);
        vec3 landCol = mix(uC1, uC2, smoothstep(0.56, 0.78, h)) * (0.8 + 0.4 * h2);
        vec3 earth = mix(uC0 * (0.7 + 0.5 * h2), landCol, land);
        rockyCol = mix(rock, earth, uOcean);
      }
      ice = smoothstep(0.82, 0.94, abs(q.y) + (h - 0.5) * 0.25);
      rockyCol = mix(rockyCol, vec3(0.93, 0.95, 1.0), ice * uPolar);   // polar caps
    }

    vec3 col = rockyCol;
    if (uGas > 0.001) {
      float turb = fbm3(vec3(q.x * 1.6, q.y * 3.0, q.z * 1.6) + uTime * 0.02);
      float band = sin((q.y + (turb - 0.5) * 0.16) * 15.0) * 0.5 + 0.5;
      float band2 = fbm3(vec3(q.x * 0.9, q.y * 14.0, q.z * 0.9) + turb);
      band += (fbm3(vec3(q.x * 3.0, q.y * 40.0, q.z * 3.0)) - 0.5) * 0.18; // fine streaks
      vec3 gas = mix(uC0, uC1, band);
      gas = mix(gas, uC2, smoothstep(0.5, 0.9, band2) * 0.7);
      gas *= 0.85 + 0.3 * band2;
      if (uSpot > 0.001) {
        // a long-lived storm (Jupiter's red spot)
        float lon = atan(q.z, q.x);
        float dl = mod(lon - 0.7 + 3.14159, 6.28318) - 3.14159;
        float spot = smoothstep(1.0, 0.25, length(vec2(dl * 1.5, (q.y + 0.28) * 4.2)));
        gas = mix(gas, mix(uC2, vec3(0.85, 0.3, 0.18), 0.5) * (0.85 + 0.3 * band2), spot * 0.85 * uSpot);
      }
      col = mix(rockyCol, gas, uGas);
    }

    // clouds
    if (uCloud > 0.001) {
      float cl = smoothstep(0.52, 0.78, fbm3(q * 3.4 + vec3(uTime * 0.02, 0.0, 9.0)));
      col = mix(col, vec3(1.0), cl * uCloud);
    }

    // lighting: sun side lit, night side nearly black
    vec3 N = normalize(vN);
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
    float night = 1.0 - smoothstep(-0.25, 0.1, ndl);
    if (uOcean > 0.001 && night > 0.01) {
      float c1 = smoothstep(0.38, 0.52, fbm3(q * 9.0 + 4.0));           // regions with towns
      float c2 = smoothstep(0.47, 0.6, fbm3(q * 30.0));                // individual lights
      float cities = c1 * c2 * land * uOcean * (1.0 - ice * uPolar);
      lc += vec3(1.0, 0.74, 0.4) * cities * night * 1.4;
    }

    // atmosphere rim, strongest on the sunlit limb
    float fr = pow(1.0 - max(dot(N, V), 0.0), 3.6);
    lc += uAtmo * fr * (0.1 + 0.7 * smoothstep(-0.5, 0.5, ndl)) * uAtmoK;

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
    float i = pow(max(0.62 - dot(vN, vec3(0.0, 0.0, 1.0)), 0.0), 3.0);
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
    b *= smoothstep(0.0, 0.06, t) * smoothstep(1.0, 0.9, t);
    vec3 c = mix(vec3(0.72, 0.6, 0.42), vec3(0.95, 0.88, 0.7), b) * 0.9;
    gl_FragColor = vec4(pow(c, vec3(2.2)), clamp(b, 0.0, 1.0) * uRing * 0.9);
  }
`
