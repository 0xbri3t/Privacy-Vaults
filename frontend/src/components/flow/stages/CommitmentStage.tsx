import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface StageProps {
  progress: number
}

function localProgress(progress: number): number {
  return Math.max(0, Math.min(1, (progress - 0.2) / 0.2))
}

const PARTICLE_COUNT = 200

export function CommitmentStage({ progress }: StageProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const commitmentRef = useRef<THREE.Mesh>(null)
  const vortexRef = useRef<THREE.Mesh>(null)
  const lp = localProgress(progress)

  // Pre-compute random seeds for particles
  const seeds = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 2     // random angle seed
      arr[i * 3 + 1] = (Math.random() - 0.5) * 2 // random radius seed
      arr[i * 3 + 2] = Math.random()              // random phase
    }
    return arr
  }, [])

  const positions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), [])

  useFrame(({ clock }) => {
    if (progress < 0.18 || progress > 0.42) {
      if (pointsRef.current) pointsRef.current.visible = false
      if (commitmentRef.current) commitmentRef.current.visible = false
      if (vortexRef.current) vortexRef.current.visible = false
      return
    }

    if (pointsRef.current) pointsRef.current.visible = true
    if (commitmentRef.current) commitmentRef.current.visible = lp > 0.6
    if (vortexRef.current) vortexRef.current.visible = true

    const t = clock.getElapsedTime()

    // Particles: start scattered, converge to center through a vortex
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const seed1 = seeds[i * 3]
      const seed2 = seeds[i * 3 + 1]
      const phase = seeds[i * 3 + 2]

      // Scatter radius shrinks with progress
      const radius = (1 - lp) * 3 * (0.5 + Math.abs(seed2))
      const angle = seed1 * Math.PI * 2 + t * 2 + phase * Math.PI * 2
      const spiralTight = lp * 4

      positions[i * 3] = Math.cos(angle + spiralTight) * radius
      positions[i * 3 + 1] = Math.sin(angle + spiralTight) * radius
      positions[i * 3 + 2] = seed2 * (1 - lp) * 2
    }

    if (pointsRef.current) {
      const geo = pointsRef.current.geometry
      geo.attributes.position.needsUpdate = true
    }

    // Vortex rotation
    if (vortexRef.current) {
      vortexRef.current.rotation.x = t * 1.5
      vortexRef.current.rotation.y = t * 0.8
      const vortexScale = Math.max(0, 1 - lp * 0.8)
      vortexRef.current.scale.setScalar(vortexScale)
    }

    // Commitment sphere grows
    if (commitmentRef.current) {
      const scale = Math.max(0, (lp - 0.6) / 0.4)
      commitmentRef.current.scale.setScalar(scale * 0.5)
    }
  })

  if (progress < 0.18 || progress > 0.42) return null

  const opacity = progress > 0.38 ? Math.max(0, 1 - (progress - 0.38) / 0.04) : 1

  return (
    <group>
      {/* Swirling particles */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.04}
          color="#a78bfa"
          transparent
          opacity={opacity * 0.8}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Poseidon hash vortex */}
      <mesh ref={vortexRef}>
        <torusKnotGeometry args={[1.2, 0.15, 128, 16, 2, 3]} />
        <meshStandardMaterial
          color="#8b5cf6"
          emissive="#8b5cf6"
          emissiveIntensity={0.4}
          transparent
          opacity={opacity * 0.3}
          wireframe
        />
      </mesh>

      {/* Commitment output node */}
      <mesh ref={commitmentRef} position={[0, 0, 0]}>
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#22d3ee"
          emissiveIntensity={0.8}
          transparent
          opacity={opacity}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>
    </group>
  )
}
