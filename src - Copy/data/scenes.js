// Order matters: matches the <section id="..."> order in App.jsx
export const SECTIONS = ['hero', 'about', 'projects', 'stack', 'contact']

// Which particle shape (0 vortex, 1 eclipse, 2 knot, 3 lattice, 4 mark) each section lands on.
export const SHAPE_SLOT = [0, 1, 2, 3, 4]

/** float section position -> float particle-shape position */
export function slotAt(pos) {
  const last = SHAPE_SLOT.length - 1
  const p = Math.min(Math.max(pos, 0), last)
  const i = Math.min(Math.floor(p), last - 1)
  return SHAPE_SLOT[i] + (SHAPE_SLOT[i + 1] - SHAPE_SLOT[i]) * (p - i)
}

// `name` + `shape` feed the bottom timeline.
export const SCENES = [
  { id: 'vortex', section: 'hero', name: 'Intro', shape: 'Vortex' },
  { id: 'eclipse', section: 'about', name: 'About', shape: 'Eclipse' },
  { id: 'knot', section: 'projects', name: 'Work', shape: 'Knot' },
  { id: 'lattice', section: 'stack', name: 'Stack', shape: 'Lattice' },
  { id: 'mark', section: 'contact', name: 'Contact', shape: 'Mark' },
]
