/* eslint-disable @typescript-eslint/no-explicit-any */
// Global JSX augmentation for @react-three/fiber
// Needed because R3F v8's declare global doesn't resolve with jsx:"react-jsx" + moduleResolution:"bundler"
import 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      group: any
      mesh: any
      instancedMesh: any
      scene: any
      sprite: any
      line: any
      lineLoop: any
      lineSegments: any
      points: any

      bufferGeometry: any
      boxGeometry: any
      sphereGeometry: any
      cylinderGeometry: any
      coneGeometry: any
      torusGeometry: any
      torusKnotGeometry: any
      planeGeometry: any
      ringGeometry: any
      icosahedronGeometry: any
      octahedronGeometry: any
      dodecahedronGeometry: any
      circleGeometry: any
      tubeGeometry: any
      extrudeGeometry: any
      shapeGeometry: any
      latheGeometry: any

      meshStandardMaterial: any
      meshBasicMaterial: any
      meshPhongMaterial: any
      meshLambertMaterial: any
      meshPhysicalMaterial: any
      meshNormalMaterial: any
      meshToonMaterial: any
      meshDepthMaterial: any
      meshDistanceMaterial: any
      meshMatcapMaterial: any
      pointsMaterial: any
      lineBasicMaterial: any
      lineDashedMaterial: any
      shaderMaterial: any
      rawShaderMaterial: any
      spriteMaterial: any
      shadowMaterial: any

      ambientLight: any
      directionalLight: any
      pointLight: any
      spotLight: any
      hemisphereLight: any
      rectAreaLight: any

      bufferAttribute: any
      instancedBufferAttribute: any
      float16BufferAttribute: any
      float32BufferAttribute: any
      int8BufferAttribute: any
      int16BufferAttribute: any
      int32BufferAttribute: any
      uint8BufferAttribute: any
      uint16BufferAttribute: any
      uint32BufferAttribute: any

      color: any
      fog: any
      fogExp2: any
      primitive: any
    }
  }
}
