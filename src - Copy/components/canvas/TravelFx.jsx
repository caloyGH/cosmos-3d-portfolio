import { useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'
import { scrollState, tickScroll } from '../../store/scroll'

const { damp } = MathUtils

/**
 * Updates the shared scroll velocity once per frame (mount this FIRST), then adds a "flight" feel to
 * the camera: the field of view widens, the camera banks, sways along the tunnel and leans toward the mouse.
 */
export default function TravelFx() {
  useFrame(({ camera, pointer }, dt) => {
    tickScroll(dt)
    const v = Math.min(scrollState.vel, 2)
    camera.fov = damp(camera.fov, 45 + v * 11, 5, dt) // widens a lot at speed: the warp feel
    camera.rotation.z = damp(camera.rotation.z, -scrollState.svel * 0.018, 4, dt)
    // gentle S-curve sway while travelling + mouse parallax (z is left alone: other props rely on it)
    const sway = Math.sin(scrollState.odo * 0.35) * 0.35 * Math.min(v, 1)
    camera.position.x = damp(camera.position.x, pointer.x * 0.45 + sway, 3, dt)
    camera.position.y = damp(camera.position.y, pointer.y * 0.28 + Math.cos(scrollState.odo * 0.27) * 0.2 * Math.min(v, 1), 3, dt)
    camera.rotation.y = damp(camera.rotation.y, -pointer.x * 0.035, 3, dt)
    camera.rotation.x = damp(camera.rotation.x, pointer.y * 0.02, 3, dt)
    camera.updateProjectionMatrix()
  })
  return null
}
