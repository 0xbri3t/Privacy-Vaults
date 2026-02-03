import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DepositStage } from './stages/DepositStage.tsx'
import { CommitmentStage } from './stages/CommitmentStage.tsx'
import { MerkleTreeStage } from './stages/MerkleTreeStage.tsx'
import { ProofStage } from './stages/ProofStage.tsx'
import { WithdrawStage } from './stages/WithdrawStage.tsx'

interface FlowSceneProps {
  progress: number
}

// Camera positions for each stage
const cameraPositions: [number, number, number][] = [
  [0, 0, 8],     // idle / deposit
  [0, 0, 7],     // commitment
  [0, 0.5, 10],  // merkle tree (pull back)
  [0, 0, 7],     // proof
  [0, 0, 8],     // withdraw
]

const cameraTargets: [number, number, number][] = [
  [0, 0, 0],
  [0, 0, 0],
  [0, 1, 0],
  [0, 0, 0],
  [0, 0, 0],
]

function lerpVec3(a: number[], b: number[], t: number): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]
}

function CameraRig({ progress }: { progress: number }) {
  const lookAtTarget = useRef(new THREE.Vector3())

  useFrame(({ camera }) => {
    const stageIdx = Math.min(Math.floor(progress / 0.2), 4)
    const nextIdx = Math.min(stageIdx + 1, 4)
    const t = (progress - stageIdx * 0.2) / 0.2

    const pos = lerpVec3(cameraPositions[stageIdx], cameraPositions[nextIdx], t)
    const target = lerpVec3(cameraTargets[stageIdx], cameraTargets[nextIdx], t)

    camera.position.lerp(new THREE.Vector3(...pos), 0.05)
    lookAtTarget.current.lerp(new THREE.Vector3(...target), 0.05)
    camera.lookAt(lookAtTarget.current)
  })

  return null
}

// Ambient floating particles in the background
function BackgroundParticles() {
  const ref = useRef<THREE.Points>(null)
  const count = 300

  const positions = useRef(
    Float32Array.from({ length: count * 3 }, () => (Math.random() - 0.5) * 20)
  ).current

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime() * 0.05
    ref.current.rotation.y = t
    ref.current.rotation.x = t * 0.3
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#8b5cf6"
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  )
}

export function FlowScene({ progress }: FlowSceneProps) {
  return (
    <>
      <CameraRig progress={progress} />

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={0.8} color="#8b5cf6" />
      <pointLight position={[-5, -3, 3]} intensity={0.5} color="#22d3ee" />

      <BackgroundParticles />

      {/* Stages */}
      <DepositStage progress={progress} />
      <CommitmentStage progress={progress} />
      <MerkleTreeStage progress={progress} />
      <ProofStage progress={progress} />
      <WithdrawStage progress={progress} />
    </>
  )
}
