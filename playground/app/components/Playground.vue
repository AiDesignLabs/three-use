<script setup lang="ts">
import { useCameraPos } from '@three-use/core'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'

const { modelUrl } = defineProps<{
  modelUrl: string
}>()

const containerRef = useTemplateRef<HTMLDivElement>('container')

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)

const { gazeObject3D } = useCameraPos(camera)

onMounted(() => {
  if (!containerRef.value)
    return

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  camera.aspect = window.innerWidth / window.innerHeight
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  containerRef.value?.appendChild(renderer.domElement)

  camera.position.z = 1
  renderer.render(scene, camera)

  const light = new THREE.AmbientLight(0xFFFFFF, 1)
  scene.add(light)
  const light2 = new THREE.DirectionalLight(0xFFFFFF, 1)
  light2.position.set(10, 10, 10)
  scene.add(light2)

  const controls = new OrbitControls(camera, renderer.domElement)
  // controls.enableDamping = true
  // controls.dampingFactor = 0.25
  // controls.enableZoom = true
  // controls.enablePan = true
  // controls.enableRotate = true

  // instantiate a loader
  const loader = new OBJLoader()

  // load a resource
  loader.load(
    // resource URL
    modelUrl,
    // called when resource is loaded
    (object) => {
      scene.add(object)
      const group = new THREE.Group()
      scene.add(group)
      const { position, center } = gazeObject3D(object)
      camera.position.copy(position)
      camera.lookAt(center)
      object.position.sub(center)
    },
  )

  function animate() {
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
    controls.update()
  }
  animate()
})
</script>

<template>
  <div ref="container" h-full w-full />
</template>
