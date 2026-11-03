import { PHONE } from '../../store/device'

// Where the black hole sits at the very end (shared by BlackHole.jsx and the star pull in StarField.jsx).
// It rises from the middle of the screen to the upper part, leaving room for IO and the closing words. On a phone it is
// smaller and higher, because everything else is stacked under it.
export const HOLE_RISE = PHONE ? 2.7 : 1.4 // world units above the start position (0.15)
export const HOLE_SCALE = PHONE ? 0.62 : 1
