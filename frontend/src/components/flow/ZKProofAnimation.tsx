import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface ZKProofAnimationProps {
  visible: boolean
}

export function ZKProofAnimation({ visible }: ZKProofAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!visible || !containerRef.current) return

    const container = containerRef.current
    const W = container.clientWidth
    const H = container.clientHeight

    const COL = {
      gold: 0xd4a853,
      goldBright: 0xf0d78c,
      teal: 0x00e5cc,
      tealBright: 0x80fff0,
      veil: 0x3a3a5c,
    }

    const scene = new THREE.Scene()
    scene.background = null

    const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100)
    camera.position.set(0, 0, 14)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setSize(W, H)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    container.appendChild(renderer.domElement)

    // ==================== LIGHTING ====================
    scene.add(new THREE.AmbientLight(0x0a0a18, 0.4))
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.15)
    keyLight.position.set(2, 4, 5)
    scene.add(keyLight)

    // ==================== BARRIER ====================
    const barrierGroup = new THREE.Group()
    scene.add(barrierGroup)

    const barrierLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -4.5, 0), new THREE.Vector3(0, 4.5, 0)]),
      new THREE.LineBasicMaterial({ color: COL.veil, transparent: true, opacity: 0.25 })
    )
    barrierGroup.add(barrierLine)

    const barrierGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 9),
      new THREE.MeshBasicMaterial({ color: COL.veil, transparent: true, opacity: 0.04, side: THREE.DoubleSide })
    )
    barrierGroup.add(barrierGlow)

    const barrierGlow2 = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 9),
      new THREE.MeshBasicMaterial({ color: COL.veil, transparent: true, opacity: 0.015, side: THREE.DoubleSide })
    )
    barrierGroup.add(barrierGlow2)

    for (let i = 0; i < 20; i++) {
      const y = (i / 19 - 0.5) * 8
      barrierGroup.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.08, y, 0), new THREE.Vector3(0.08, y, 0)]),
        new THREE.LineBasicMaterial({ color: COL.veil, transparent: true, opacity: 0.1 })
      ))
    }

    // ==================== PROVER (left) ====================
    const proverGroup = new THREE.Group()
    proverGroup.position.set(-3.5, 0, 0)
    scene.add(proverGroup)

    const knowledgeWire = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.1, 1)),
      new THREE.LineBasicMaterial({ color: COL.gold, transparent: true, opacity: 0.35 })
    )
    proverGroup.add(knowledgeWire)

    const knowledgeCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.4, 1),
      new THREE.MeshPhysicalMaterial({
        color: COL.gold, metalness: 0.2, roughness: 0.1,
        emissive: COL.gold, emissiveIntensity: 0.3,
        transparent: true, opacity: 0.6, clearcoat: 0.8,
      })
    )
    proverGroup.add(knowledgeCore)

    const outerShell = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.6, 0)),
      new THREE.LineBasicMaterial({ color: COL.gold, transparent: true, opacity: 0.08 })
    )
    proverGroup.add(outerShell)

    const proverLight = new THREE.PointLight(COL.gold, 0.2, 8)
    proverGroup.add(proverLight)

    // ==================== VERIFIER (right) ====================
    const verifierGroup = new THREE.Group()
    verifierGroup.position.set(3.5, 0, 0)
    scene.add(verifierGroup)

    function makeCircle(r: number, segments: number) {
      return Array.from({ length: segments + 1 }, (_, i) => {
        const a = (i / segments) * Math.PI * 2
        return new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0)
      })
    }

    const verifierRing = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(makeCircle(0.7, 64)),
      new THREE.LineBasicMaterial({ color: COL.teal, transparent: true, opacity: 0.3 })
    )
    verifierGroup.add(verifierRing)

    const verifierDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      new THREE.MeshBasicMaterial({ color: COL.teal, transparent: true, opacity: 0.5 })
    )
    verifierGroup.add(verifierDot)

    const verifierOuterRing = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(makeCircle(1.1, 64)),
      new THREE.LineBasicMaterial({ color: COL.teal, transparent: true, opacity: 0.07 })
    )
    verifierGroup.add(verifierOuterRing)

    const verifierLight = new THREE.PointLight(COL.teal, 0.1, 8)
    verifierGroup.add(verifierLight)

    // ==================== PROOF PULSE ====================
    const proofDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 16, 16),
      new THREE.MeshBasicMaterial({ color: COL.goldBright, transparent: true, opacity: 0 })
    )
    scene.add(proofDot)

    const proofGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 16),
      new THREE.MeshBasicMaterial({ color: COL.gold, transparent: true, opacity: 0 })
    )
    scene.add(proofGlow)

    const TRAIL_COUNT = 18
    const proofTrail: { mesh: THREE.Mesh }[] = []
    for (let i = 0; i < TRAIL_COUNT; i++) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 8, 8),
        new THREE.MeshBasicMaterial({ color: COL.goldBright, transparent: true, opacity: 0 })
      )
      scene.add(dot)
      proofTrail.push({ mesh: dot })
    }
    const trailHistory: THREE.Vector3[] = []

    // ==================== RIPPLES ====================
    const ripples: { mesh: THREE.Line; active: boolean; scale: number; opacity: number }[] = []
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(makeCircle(0.1, 48)),
        new THREE.LineBasicMaterial({ color: COL.veil, transparent: true, opacity: 0 })
      )
      ring.rotation.y = Math.PI / 2
      scene.add(ring)
      ripples.push({ mesh: ring, active: false, scale: 1, opacity: 0 })
    }
    let rippleIdx = 0
    function spawnRipple(y: number) {
      const r = ripples[rippleIdx++ % ripples.length]
      r.active = true
      r.scale = 0.3
      r.opacity = 0.35
      r.mesh.position.set(0, y, 0)
    }

    // ==================== CONFIRM RING ====================
    const confirmRing = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(makeCircle(1, 64)),
      new THREE.LineBasicMaterial({ color: COL.tealBright, transparent: true, opacity: 0 })
    )
    confirmRing.position.copy(verifierGroup.position)
    scene.add(confirmRing)

    // ==================== ANIMATION ====================
    const PH = { IDLE: 0, COMPUTE: 1, EMIT: 2, TRAVEL: 3, CROSS: 4, ARRIVE: 5, CONFIRM: 6, FADE: 7 }
    const DUR: Record<number, number> = { 0: 10, 1: 60, 2: 25, 3: 40, 4: 35, 5: 35, 6: 50, 7: 40 }

    let phase = PH.COMPUTE // Start immediately at compute
    let pt = 0
    let time = 0
    let proofX = -3.5
    let animId: number

    function animate() {
      animId = requestAnimationFrame(animate)
      time += 0.01
      pt++
      const p = Math.min(pt / DUR[phase], 1)
      const next = () => {
        phase = (phase + 1) % 8
        pt = 0
      }

      if (phase === PH.IDLE) {
        ;(proofDot.material as THREE.MeshBasicMaterial).opacity = 0
        ;(proofGlow.material as THREE.MeshBasicMaterial).opacity = 0
        proofTrail.forEach(t => ((t.mesh.material as THREE.MeshBasicMaterial).opacity = 0))
        ;(confirmRing.material as THREE.LineBasicMaterial).opacity = 0
        trailHistory.length = 0
        if (p >= 1) next()
      }

      else if (phase === PH.COMPUTE) {
        ;(knowledgeWire.material as THREE.LineBasicMaterial).opacity = 0.35 + p * 0.35
        ;(knowledgeCore.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.3 + p * 0.6
        ;(knowledgeCore.material as THREE.MeshPhysicalMaterial).opacity = 0.6 + p * 0.3
        ;(outerShell.material as THREE.LineBasicMaterial).opacity = 0.08 + p * 0.12
        proverLight.intensity = 0.2 + p * 0.6
        const spd = 1 + p * 2
        knowledgeWire.rotation.y += 0.008 * spd
        knowledgeWire.rotation.x += 0.005 * spd
        knowledgeCore.rotation.y += 0.012 * spd
        outerShell.rotation.y -= 0.004 * spd
        outerShell.rotation.z += 0.003 * spd
        if (p >= 1) next()
      }

      else if (phase === PH.EMIT) {
        const ease = p * p
        proofX = -3.5 + ease * 1.5
        proofDot.position.set(proofX, 0, 0)
        proofGlow.position.set(proofX, 0, 0)
        ;(proofDot.material as THREE.MeshBasicMaterial).opacity = ease * 0.9
        ;(proofGlow.material as THREE.MeshBasicMaterial).opacity = ease * 0.12
        ;(knowledgeWire.material as THREE.LineBasicMaterial).opacity = 0.7 - p * 0.15
        ;(knowledgeCore.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.9 - p * 0.2
        trailHistory.unshift(new THREE.Vector3(proofX, 0, 0))
        if (trailHistory.length > TRAIL_COUNT) trailHistory.pop()
        if (p >= 1) next()
      }

      else if (phase === PH.TRAVEL) {
        const ease = p * p * (3 - 2 * p)
        proofX = -2.0 + ease * 1.8
        const py = Math.sin(p * Math.PI) * 0.12
        proofDot.position.set(proofX, py, 0)
        proofGlow.position.set(proofX, py, 0)
        ;(proofDot.material as THREE.MeshBasicMaterial).opacity = 0.9
        ;(proofGlow.material as THREE.MeshBasicMaterial).opacity = 0.12
        ;(knowledgeWire.material as THREE.LineBasicMaterial).opacity = 0.55 - p * 0.15
        ;(knowledgeCore.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.7 - p * 0.2
        proverLight.intensity = 0.8 - p * 0.4
        trailHistory.unshift(new THREE.Vector3(proofX, py, 0))
        if (trailHistory.length > TRAIL_COUNT) trailHistory.pop()
        if (p >= 1) next()
      }

      else if (phase === PH.CROSS) {
        let ease: number
        if (p < 0.5) {
          ease = p * p * 2
        } else {
          const t = (p - 0.5) * 2
          ease = 0.5 + t * t * 0.5
        }
        proofX = -0.2 + ease * 1.2
        proofDot.position.set(proofX, 0, 0)
        proofGlow.position.set(proofX, 0, 0)

        const dist = Math.abs(proofX)
        if (dist < 0.5) {
          const react = 1 - dist * 2
          ;(barrierLine.material as THREE.LineBasicMaterial).opacity = 0.25 + react * 0.4
          ;(barrierGlow.material as THREE.MeshBasicMaterial).opacity = 0.04 + react * 0.08
        }
        if (p > 0.3 && p < 0.35) spawnRipple(0)
        if (p > 0.45 && p < 0.5) spawnRipple(0.08)

        const mix = Math.max(0, (p - 0.4) / 0.6)
        const c = new THREE.Color(COL.goldBright).lerp(new THREE.Color(COL.teal), mix)
        ;(proofDot.material as THREE.MeshBasicMaterial).color.copy(c)
        ;(proofGlow.material as THREE.MeshBasicMaterial).color.copy(c)

        trailHistory.unshift(new THREE.Vector3(proofX, 0, 0))
        if (trailHistory.length > TRAIL_COUNT) trailHistory.pop()

        if (p >= 1) {
          ;(barrierLine.material as THREE.LineBasicMaterial).opacity = 0.25
          ;(barrierGlow.material as THREE.MeshBasicMaterial).opacity = 0.04
          next()
        }
      }

      else if (phase === PH.ARRIVE) {
        const ease = 1 - Math.pow(1 - p, 3)
        proofX = 1.0 + ease * 2.5
        proofDot.position.set(proofX, 0, 0)
        proofGlow.position.set(proofX, 0, 0)
        ;(proofDot.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - ease * 0.9)
        ;(proofGlow.material as THREE.MeshBasicMaterial).opacity = 0.12 * (1 - ease * 0.5)
        ;(proofDot.material as THREE.MeshBasicMaterial).color.set(COL.teal)
        ;(proofGlow.material as THREE.MeshBasicMaterial).color.set(COL.teal)

        ;(verifierRing.material as THREE.LineBasicMaterial).opacity = 0.3 + ease * 0.2
        ;(verifierDot.material as THREE.MeshBasicMaterial).opacity = 0.5 + ease * 0.3
        verifierLight.intensity = 0.1 + ease * 0.3

        trailHistory.unshift(new THREE.Vector3(proofX, 0, 0))
        if (trailHistory.length > TRAIL_COUNT) trailHistory.pop()
        if (p >= 1) {
          ;(proofDot.material as THREE.MeshBasicMaterial).opacity = 0
          ;(proofGlow.material as THREE.MeshBasicMaterial).opacity = 0
          next()
        }
      }

      else if (phase === PH.CONFIRM) {
        const flash = p < 0.15 ? p / 0.15 : Math.max(0, 1 - (p - 0.15) / 0.85)
        ;(verifierDot.material as THREE.MeshBasicMaterial).opacity = 0.5 + flash * 0.5
        ;(verifierDot.material as THREE.MeshBasicMaterial).color.set(COL.tealBright)
        ;(verifierRing.material as THREE.LineBasicMaterial).opacity = 0.3 + flash * 0.4
        ;(verifierRing.material as THREE.LineBasicMaterial).color.set(COL.tealBright)
        ;(verifierOuterRing.material as THREE.LineBasicMaterial).opacity = 0.07 + flash * 0.15
        verifierLight.intensity = 0.1 + flash * 0.8
        ;(confirmRing.material as THREE.LineBasicMaterial).opacity = flash * 0.3
        confirmRing.scale.setScalar(0.7 + p * 2.5)

        ;(knowledgeWire.material as THREE.LineBasicMaterial).opacity = 0.35
        ;(knowledgeCore.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.3
        ;(outerShell.material as THREE.LineBasicMaterial).opacity = 0.08
        proverLight.intensity = 0.2
        proofTrail.forEach(t => {
          ;(t.mesh.material as THREE.MeshBasicMaterial).opacity *= 0.9
        })
        if (p >= 1) next()
      }

      else if (phase === PH.FADE) {
        ;(verifierDot.material as THREE.MeshBasicMaterial).opacity = 0.5
        ;(verifierDot.material as THREE.MeshBasicMaterial).color.set(COL.teal)
        ;(verifierRing.material as THREE.LineBasicMaterial).opacity = 0.3
        ;(verifierRing.material as THREE.LineBasicMaterial).color.set(COL.teal)
        ;(verifierOuterRing.material as THREE.LineBasicMaterial).opacity = 0.07
        verifierLight.intensity = 0.1
        ;(confirmRing.material as THREE.LineBasicMaterial).opacity *= 0.92
        proofTrail.forEach(t => {
          ;(t.mesh.material as THREE.MeshBasicMaterial).opacity = 0
        })
        ;(proofDot.material as THREE.MeshBasicMaterial).color.set(COL.goldBright)
        ;(proofGlow.material as THREE.MeshBasicMaterial).color.set(COL.gold)
        if (p >= 1) next()
      }

      // ==================== ALWAYS-ON ====================
      knowledgeWire.rotation.y += 0.003
      knowledgeWire.rotation.x += 0.002
      knowledgeCore.rotation.y += 0.005
      outerShell.rotation.y -= 0.002
      outerShell.rotation.z += 0.001

      verifierDot.scale.setScalar(1 + Math.sin(time * 2) * 0.03)

      proofTrail.forEach((t, i) => {
        if (i < trailHistory.length) {
          t.mesh.position.copy(trailHistory[i])
          const fade = 1 - i / TRAIL_COUNT
          ;(t.mesh.material as THREE.MeshBasicMaterial).opacity = fade * 0.4 * (proofDot.material as THREE.MeshBasicMaterial).opacity
          ;(t.mesh.material as THREE.MeshBasicMaterial).color.copy((proofDot.material as THREE.MeshBasicMaterial).color)
          t.mesh.scale.setScalar(fade * 0.8)
        }
      })

      ripples.forEach(r => {
        if (!r.active) return
        r.scale += 0.06
        r.opacity *= 0.94
        r.mesh.scale.setScalar(r.scale)
        ;(r.mesh.material as THREE.LineBasicMaterial).opacity = r.opacity
        if (r.opacity < 0.005) {
          r.active = false
          ;(r.mesh.material as THREE.LineBasicMaterial).opacity = 0
        }
      })

      ;(barrierLine.material as THREE.LineBasicMaterial).opacity = 0.25 + Math.sin(time * 1.5) * 0.02

      renderer.render(scene, camera)
    }

    animate()

    // Cleanup
    cleanupRef.current = () => {
      cancelAnimationFrame(animId)
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [visible])

  if (!visible) return null

  return (
    <div
      ref={containerRef}
      className="absolute inset-x-0 top-0 bottom-32"
      style={{ background: 'transparent' }}
    />
  )
}
