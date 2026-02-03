import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, Text } from '@react-three/drei'
import * as THREE from 'three'

interface StageProps {
  progress: number
}

// Map progress 0-0.2 → local 0-1
function localProgress(progress: number): number {
  return Math.max(0, Math.min(1, progress / 0.2))
}

export function DepositStage({ progress }: StageProps) {
  const groupRef = useRef<THREE.Group>(null)
  const coinRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const lp = localProgress(progress)

  // Coin enters from left, moves toward center ring
  const coinX = useMemo(() => {
    if (lp < 0.5) return -5 + lp * 2 * 5 // -5 to 0
    return 0
  }, [lp])

  // Coin scale shrinks as it enters the ring
  const coinScale = lp > 0.7 ? 1 - (lp - 0.7) / 0.3 : 1

  // Fade out the whole stage after it's done
  const opacity = progress > 0.2 ? Math.max(0, 1 - (progress - 0.2) / 0.05) : 1

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    groupRef.current.visible = progress < 0.26

    if (ringRef.current) {
      ringRef.current.rotation.z = clock.getElapsedTime() * 0.5
    }
  })

  if (progress > 0.26) return null

  return (
    <group ref={groupRef}>
      {/* Vault portal ring */}
      <mesh ref={ringRef} position={[0, 0, 0]}>
        <torusGeometry args={[1.8, 0.06, 16, 64]} />
        <meshStandardMaterial
          color="#8b5cf6"
          emissive="#8b5cf6"
          emissiveIntensity={0.5}
          transparent
          opacity={opacity * 0.8}
        />
      </mesh>

      {/* Inner glow ring */}
      <mesh position={[0, 0, 0]}>
        <torusGeometry args={[1.6, 0.03, 16, 64]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#22d3ee"
          emissiveIntensity={0.6}
          transparent
          opacity={opacity * 0.4}
        />
      </mesh>

      {/* USDC coin */}
      <Float speed={2} rotationIntensity={0.3} floatIntensity={0.3}>
        <group
          ref={coinRef}
          position={[coinX, 0, 1]}
          scale={coinScale}
        >
          <mesh>
            <cylinderGeometry args={[0.6, 0.6, 0.08, 32]} />
            <meshStandardMaterial
              color="#2775ca"
              emissive="#2775ca"
              emissiveIntensity={0.3}
              metalness={0.8}
              roughness={0.2}
              transparent
              opacity={opacity}
            />
          </mesh>
          <Text
            position={[0, 0, 0.05]}
            rotation={[Math.PI / 2, 0, 0]}
            fontSize={0.4}
            color="white"
            anchorX="center"
            anchorY="middle"
            font={undefined}
          >
            $
          </Text>
        </group>
      </Float>
    </group>
  )
}
