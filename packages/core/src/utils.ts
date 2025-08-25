import type { ColorRepresentation, Group, Object3D, Vector3 } from 'three'
import { Box3, Mesh, MeshBasicMaterial, SphereGeometry } from 'three'

export function getBounds(obj: Object3D) {
  const box = new Box3().setFromObject(obj)
  return box
}

export function drawPoint(position: Vector3, opts?: { group?: Group, size?: number, color?: ColorRepresentation }) {
  const geometry = new SphereGeometry(opts?.size ?? 1, 10, 10)
  const material = new MeshBasicMaterial({ color: opts?.color ?? 0x0000FF })
  const mesh = new Mesh(geometry, material)
  mesh.position.copy(position)
  opts?.group?.add(mesh)
  return mesh
}
