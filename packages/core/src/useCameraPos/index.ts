import type { Object3D } from 'three'
import * as THREE from 'three'
import { getBounds } from '../utils'

export function useCameraPos(camera: THREE.PerspectiveCamera) {
  /**
   * Position camera to view object centered in viewport, occupying 80% of the view
   * @param obj - the Object3D to focus on
   * @returns camera position and look-at target
   */
  const gazeObject3D = (obj: Object3D) => {
    const box = getBounds(obj)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())

    // Calculate distance needed to fit object in 80% of viewport
    const fovRad = (camera.fov * Math.PI) / 180
    const targetFillRatio = 0.8

    // Get max dimension to ensure entire object fits
    const maxDim = Math.max(size.x, size.y, size.z)

    // Calculate required distance
    const distance = maxDim / (targetFillRatio * 2 * Math.tan(fovRad / 2))

    // Position camera at object center, moved down along Z-axis
    const position = new THREE.Vector3(
      center.x,
      center.y,
      center.z + distance,
    )

    return {
      position,
      center,
    }
  }

  return {
    gazeObject3D,
  }
}
