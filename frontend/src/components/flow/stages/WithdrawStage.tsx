import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, Text } from '@react-three/drei'
import * as THREE from 'three'

interface StageProps {
  progress: number
}

function localProgress(progress: number): number {
  return Math.max(0, Math.min(1, (progress - 0.8) / 0.2))
}

const RELEASE_PARTICLES = 60

export function WithdrawStage({ progress }: StageProps) {
  const groupRef = useRef<THREE.Group>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const coinRef = useRef<THREE.Group>(null)
  const trailRef = useRef<THREE.Points>(null)
  const lp = localProgress(progress)

  const trailPositions = useMemo(() => new Float32Array(RELEASE_PARTICLES * 3), [])
  const trailSeeds = useMemo(() => {
    return Array.from({ length: RELEASE_PARTICLES }, () => ({
      angle: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.7,
      radius: Math.random() * 0.5,
    }))
  }, [])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    groupRef.current.visible = progress >= 0.78

    if (ringRef.current) {
      ringRef.current.rotation.z = -clock.getElapsedTime() * 0.5
    }

    // Trail particles spread from center to right
    if (trailRef.current && lp > 0.3) {
      const t = clock.getElapsedTime()
      for (let i = 0; i < RELEASE_PARTICLES; i++) {
        const seed = trailSeeds[i]
        const spread = (lp - 0.3) / 0.7
        const x = spread * seed.speed * 4 + Math.sin(t * 2 + seed.angle) * seed.radius * 0.3
        const y = Math.sin(seed.angle + t * seed.speed) * seed.radius * spread
        const z = Math.cos(seed.angle) * seed.radius * 0.5
        trailPositions[i * 3] = x
        trailPositions[i * 3 + 1] = y
        trailPositions[i * 3 + 2] = z
      }
      trailRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  if (progress < 0.78) return null

  const fadeIn = Math.min(1, (progress - 0.78) / 0.04)

  // Coin moves from center to right
  const coinX = lp > 0.3 ? (lp - 0.3) / 0.7 * 4 : 0
  const coinOpacity = fadeIn * (lp > 0.3 ? 1 : 0)

  return (
    <group ref={groupRef}>
      {/* Vault ring (left side) */}
      <mesh ref={ringRef} position={[-3, 0, 0]}>
        <torusGeometry args={[1, 0.04, 16, 64]} />
        <meshStandardMaterial
          color="#8b5cf6"
          emissive="#8b5cf6"
          emissiveIntensity={0.5}
          transparent
          opacity={fadeIn * 0.6}
        />
      </mesh>

      {/* Depositor dot (left, faded) */}
      <mesh position={[-3, -2, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color="#52525b"
          emissive="#52525b"
          emissiveIntensity={0.2}
          transparent
          opacity={fadeIn * 0.5}
        />
      </mesh>

      {/* "No link" dashed line placeholder — just absence of connection */}

      {/* Recipient dot (right) */}
      <mesh position={[4, -2, 0]} scale={lp > 0.5 ? 1 : 0}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#22d3ee"
          emissiveIntensity={0.6}
          transparent
          opacity={fadeIn}
        />
      </mesh>

      {/* Label: "?" between the two dots */}
      {lp > 0.5 && (
        <Text
          position={[0.5, -2, 0]}
          fontSize={0.4}
          color="#ef4444"
          anchorX="center"
          anchorY="middle"
          font={undefined}
        >
          ?
        </Text>
      )}

      {/* Release particles */}
      <points ref={trailRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[trailPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          color="#22d3ee"
          transparent
          opacity={fadeIn * 0.6}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* USDC coin exiting to recipient */}
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
        <group ref={coinRef} position={[coinX, 0, 1]}>
          <mesh>
            <cylinderGeometry args={[0.5, 0.5, 0.07, 32]} />
            <meshStandardMaterial
              color="#2775ca"
              emissive="#2775ca"
              emissiveIntensity={0.3}
              metalness={0.8}
              roughness={0.2}
              transparent
              opacity={coinOpacity}
            />
          </mesh>
          <Text
            position={[0, 0, 0.045]}
            rotation={[Math.PI / 2, 0, 0]}
            fontSize={0.35}
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
