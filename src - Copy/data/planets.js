// One entry per page section (same order as data/scenes.js SECTIONS). Each section has its OWN planet, shown WHOLE like a carousel:
// scroll and the current planet slides out to the left while the next one slides in from the right.
//   c0/c1/c2  surface palette (low / mid / high)      gas   0 rocky .. 1 banded gas giant      ocean 1 = water + continents (Earth)
//   cloud     white cloud cover                        atmo  atmosphere glow colour + atmoK strength      ring 1 = Saturn-style rings
//   moon      true = a small moon circles the planet     dust   [r, g, b] = drifting dust across the screen while you are here
//   polar     polar ice caps 0..1      spot   1 = a big storm spot (Jupiter)
//   sun       light direction (view space)             x, y, r  where it rests: x in half-widths, y and r (radius) in half-heights of the screen. r 0.5 = the planet is half as tall as the screen
//   tint      [body, hot centre] colour of the space nebula behind it
export const PLANETS = [
  { name: 'Earth', tag: 'Home orbit', fact: 'Where this journey starts', c0: [0.03, 0.15, 0.52], c1: [0.16, 0.48, 0.2], c2: [0.62, 0.5, 0.32], gas: 0, ocean: 1, cloud: 0.95, atmo: [0.3, 0.62, 1.0], atmoK: 0.85, ring: 0, polar: 1, spot: 0, moon: true, sun: [0.7, 0.4, 0.75], x: 0.52, y: 0.04, r: 0.5, tint: [[0.05, 0.22, 0.75], [0.0, 0.6, 0.9]] },
  { name: 'Mars', tag: 'The red planet', fact: 'Rust, dust and silence', c0: [0.5, 0.21, 0.1], c1: [0.88, 0.45, 0.21], c2: [0.98, 0.76, 0.52], gas: 0, ocean: 0, cloud: 0.06, atmo: [1.0, 0.5, 0.28], atmoK: 0.55, ring: 0, polar: 0.55, spot: 0, dust: [0.88, 0.62, 0.42], sun: [-0.6, 0.35, 0.8], x: -0.52, y: 0.02, r: 0.48, tint: [[0.62, 0.16, 0.05], [0.95, 0.42, 0.1]] },
  { name: 'Jupiter', tag: 'The giant', fact: 'Storms bigger than worlds', c0: [0.5, 0.3, 0.18], c1: [0.9, 0.74, 0.55], c2: [0.72, 0.3, 0.18], gas: 1, ocean: 0, cloud: 0, atmo: [1.0, 0.75, 0.5], atmoK: 0.45, ring: 0, polar: 0, spot: 1, sun: [0.6, 0.0, 0.85], x: 0.52, y: 0.0, r: 0.56, tint: [[0.5, 0.26, 0.08], [0.9, 0.58, 0.25]] },
  { name: 'Saturn', tag: 'Lord of the rings', fact: 'A world that floats', c0: [0.62, 0.5, 0.3], c1: [0.95, 0.84, 0.6], c2: [0.7, 0.58, 0.38], gas: 1, ocean: 0, cloud: 0, atmo: [1.0, 0.88, 0.55], atmoK: 0.45, ring: 1, polar: 0, spot: 0, sun: [-0.5, 0.45, 0.8], x: -0.5, y: 0.0, r: 0.36, tint: [[0.48, 0.38, 0.12], [0.85, 0.7, 0.3]] },
  { name: 'Neptune', tag: 'The deep blue', fact: 'The edge of the map. You made it.', c0: [0.03, 0.1, 0.52], c1: [0.12, 0.38, 0.92], c2: [0.55, 0.85, 1.0], gas: 1, ocean: 0, cloud: 0, atmo: [0.3, 0.65, 1.0], atmoK: 0.8, ring: 0, polar: 0, spot: 0, sun: [0.1, 0.6, 0.8], x: 0.52, y: 0.02, r: 0.5, tint: [[0.03, 0.2, 0.8], [0.1, 0.7, 1.0]] },
]
