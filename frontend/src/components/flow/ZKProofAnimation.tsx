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
      bg: 0x050507,
      prover: 0xd4a853,
      proverLight: 0xf0d78c,
      verifier: 0x00e5cc,
      verifierLight: 0x80fff0,
      veil: 0x8888cc,
      veilEdge: 0xaaaaff,
      witness: 0xff9944,
      proof: 0x00ffcc,
      reject: 0xff3344,
    }

    // ==================== SCENE ====================
    const scene = new THREE.Scene()
    scene.background = null

    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100)
    camera.position.set(0, 0.5, 13)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setSize(W, H)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    container.appendChild(renderer.domElement)

    // ==================== LIGHTING ====================
    scene.add(new THREE.AmbientLight(0x0a0a15, 0.5))

    const proverAreaLight = new THREE.PointLight(COL.prover, 0.3, 15)
    proverAreaLight.position.set(-4, 2, 2)
    scene.add(proverAreaLight)

    const verifierAreaLight = new THREE.PointLight(COL.verifier, 0.3, 15)
    verifierAreaLight.position.set(4, 2, 2)
    scene.add(verifierAreaLight)

    const topLight = new THREE.DirectionalLight(0xffffff, 0.2)
    topLight.position.set(0, 5, 3)
    scene.add(topLight)

    // ==================== THE VEIL (barrier) ====================
    const veilGroup = new THREE.Group()
    scene.add(veilGroup)

    const veilGeo = new THREE.PlaneGeometry(0.08, 8, 1, 60)
    const veilMat = new THREE.MeshPhysicalMaterial({
      color: COL.veil,
      metalness: 0.3,
      roughness: 0.1,
      transparent: true,
      opacity: 0.12,
      emissive: COL.veil,
      emissiveIntensity: 0.15,
      side: THREE.DoubleSide,
      clearcoat: 1.0,
    })
    const veilPlane = new THREE.Mesh(veilGeo, veilMat)
    veilPlane.position.set(0, 0, 0)
    veilGroup.add(veilPlane)

    // Veil glow layers
    for (let i = 0; i < 3; i++) {
      const glowGeo = new THREE.PlaneGeometry(0.5 + i * 0.4, 8, 1, 1)
      const glowMat = new THREE.MeshBasicMaterial({
        color: COL.veilEdge,
        transparent: true,
        opacity: 0.03 - i * 0.008,
        side: THREE.DoubleSide,
      })
      const glow = new THREE.Mesh(glowGeo, glowMat)
      glow.position.set(0, 0, 0)
      veilGroup.add(glow)
    }

    // Veil edge lines
    const veilLines: { line: THREE.Line; baseY: number }[] = []
    for (let i = 0; i < 12; i++) {
      const y = (i / 11 - 0.5) * 7.5
      const pts = [new THREE.Vector3(0, y, -0.2), new THREE.Vector3(0, y, 0.2)]
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts)
      const lineMat = new THREE.LineBasicMaterial({
        color: COL.veilEdge,
        transparent: true,
        opacity: 0.08,
      })
      const line = new THREE.Line(lineGeo, lineMat)
      veilGroup.add(line)
      veilLines.push({ line, baseY: y })
    }

    // Horizontal scan lines on veil
    for (let i = 0; i < 40; i++) {
      const y = (i / 39 - 0.5) * 7.5
      const pts = [new THREE.Vector3(-0.04, y, 0), new THREE.Vector3(0.04, y, 0)]
      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts)
      const lineMat = new THREE.LineBasicMaterial({
        color: COL.veil,
        transparent: true,
        opacity: 0.05,
      })
      const line = new THREE.Line(lineGeo, lineMat)
      veilGroup.add(line)
    }

    // ==================== PROVER SIDE (left) ====================
    const proverMat = new THREE.MeshPhysicalMaterial({
      color: COL.prover,
      metalness: 0.2,
      roughness: 0.1,
      emissive: COL.prover,
      emissiveIntensity: 0.3,
      clearcoat: 0.8,
      transparent: true,
      opacity: 0.9,
    })
    const proverNode = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), proverMat)
    proverNode.position.set(-3.8, 0, 0)
    scene.add(proverNode)

    const proverGlowMat = new THREE.MeshBasicMaterial({ color: COL.prover, transparent: true, opacity: 0.06 })
    const proverGlow = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 16), proverGlowMat)
    proverGlow.position.copy(proverNode.position)
    scene.add(proverGlow)

    // Prover particles
    const PROVER_PARTICLE_COUNT = 120
    const proverParticles: {
      mesh: THREE.Mesh
      baseAngle: number
      radius: number
      baseY: number
      speed: number
      phase: number
      active: boolean
    }[] = []
    const proverParticleGroup = new THREE.Group()
    scene.add(proverParticleGroup)

    for (let i = 0; i < PROVER_PARTICLE_COUNT; i++) {
      const size = 0.02 + Math.random() * 0.05
      const geo = new THREE.SphereGeometry(size, 8, 8)
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? COL.proverLight : COL.witness,
        transparent: true,
        opacity: 0.0,
      })
      const mesh = new THREE.Mesh(geo, mat)

      const angle = Math.random() * Math.PI * 2
      const radius = 0.8 + Math.random() * 2.0
      const yy = (Math.random() - 0.5) * 4

      mesh.position.set(-3.8 + Math.cos(angle) * radius * 0.6, yy, Math.sin(angle) * radius * 0.3)
      proverParticleGroup.add(mesh)

      proverParticles.push({
        mesh,
        baseAngle: angle,
        radius,
        baseY: yy,
        speed: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        active: false,
      })
    }

    // ==================== VERIFIER SIDE (right) ====================
    const verifierMat = new THREE.MeshPhysicalMaterial({
      color: COL.verifier,
      metalness: 0.15,
      roughness: 0.1,
      emissive: COL.verifier,
      emissiveIntensity: 0.2,
      clearcoat: 0.9,
      transparent: true,
      opacity: 0.85,
    })
    const verifierNode = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), verifierMat)
    verifierNode.position.set(3.8, 0, 0)
    scene.add(verifierNode)

    const verifierGlowMat = new THREE.MeshBasicMaterial({ color: COL.verifier, transparent: true, opacity: 0.0 })
    const verifierGlow = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), verifierGlowMat)
    verifierGlow.position.copy(verifierNode.position)
    scene.add(verifierGlow)

    const verifyRingMat = new THREE.MeshBasicMaterial({ color: COL.verifier, transparent: true, opacity: 0.0 })
    const verifyRing = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.015, 8, 48), verifyRingMat)
    verifyRing.position.copy(verifierNode.position)
    scene.add(verifyRing)

    // ==================== WITNESS ORB ====================
    const witnessGroup = new THREE.Group()
    witnessGroup.visible = false

    const witnessCoreMat = new THREE.MeshPhysicalMaterial({
      color: COL.witness,
      metalness: 0.3,
      roughness: 0.05,
      emissive: COL.witness,
      emissiveIntensity: 0.7,
      clearcoat: 1.0,
      transparent: true,
      opacity: 1,
    })
    const witnessCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), witnessCoreMat)
    witnessGroup.add(witnessCore)

    const witnessGlowMat = new THREE.MeshBasicMaterial({ color: COL.witness, transparent: true, opacity: 0.15 })
    const witnessGlow = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), witnessGlowMat)
    witnessGroup.add(witnessGlow)

    const witnessLight = new THREE.PointLight(COL.witness, 0, 5)
    witnessGroup.add(witnessLight)
    scene.add(witnessGroup)

    // ==================== PROOF ORB ====================
    const proofGroup = new THREE.Group()
    proofGroup.visible = false

    const proofCoreMat = new THREE.MeshPhysicalMaterial({
      color: COL.proof,
      metalness: 0.1,
      roughness: 0.0,
      emissive: COL.proof,
      emissiveIntensity: 0.8,
      clearcoat: 1.0,
      transparent: true,
      opacity: 1,
    })
    const proofCore = new THREE.Mesh(new THREE.SphereGeometry(0.12, 32, 32), proofCoreMat)
    proofGroup.add(proofCore)

    const proofGlowMat = new THREE.MeshBasicMaterial({ color: COL.proof, transparent: true, opacity: 0.2 })
    const proofGlow = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), proofGlowMat)
    proofGroup.add(proofGlow)

    const proofLight = new THREE.PointLight(COL.proof, 0, 6)
    proofGroup.add(proofLight)
    scene.add(proofGroup)

    // ==================== VEIL RIPPLE EFFECT ====================
    const rippleRings: { mesh: THREE.Mesh; active: boolean; scale: number; opacity: number }[] = []
    for (let i = 0; i < 5; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.1, 0.005, 8, 32),
        new THREE.MeshBasicMaterial({ color: COL.veilEdge, transparent: true, opacity: 0 })
      )
      ring.rotation.y = Math.PI / 2
      scene.add(ring)
      rippleRings.push({ mesh: ring, active: false, scale: 1, opacity: 0 })
    }
    let rippleIdx = 0

    function spawnRipple(pos: THREE.Vector3) {
      const r = rippleRings[rippleIdx % rippleRings.length]
      r.active = true
      r.scale = 0.5
      r.opacity = 0.4
      r.mesh.position.copy(pos)
      rippleIdx++
    }

    // ==================== WAVE RINGS ====================
    const waveRings: { mesh: THREE.Mesh; active: boolean; scale: number; opacity: number }[] = []
    for (let i = 0; i < 6; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.1, 0.008, 8, 32),
        new THREE.MeshBasicMaterial({ color: COL.verifier, transparent: true, opacity: 0 })
      )
      scene.add(ring)
      waveRings.push({ mesh: ring, active: false, scale: 1, opacity: 0 })
    }
    let waveIdx = 0

    function spawnWave(pos: THREE.Vector3, color?: number) {
      const w = waveRings[waveIdx % waveRings.length]
      w.active = true
      w.scale = 0.5
      w.opacity = 0.35
      w.mesh.position.copy(pos)
      ;(w.mesh.material as THREE.MeshBasicMaterial).color.set(color || COL.verifier)
      w.mesh.rotation.set(Math.random() * 0.3, Math.random() * 0.3, 0)
      waveIdx++
    }

    // ==================== ANIMATION STATE ====================
    const PH_IDLE = 0
    const PH_WITNESS_ENTER = 1
    const PH_COMPUTE = 2
    const PH_PROOF_FORM = 3
    const PH_CROSS_VEIL = 4
    const PH_VERIFY = 5
    const PH_ACCEPT = 6
    const PH_FADE = 7

    let phase = PH_IDLE
    let phaseTime = 0
    let time = 0

    const IDLE_DUR = 80
    const WITNESS_ENTER_DUR = 90
    const COMPUTE_DUR = 160
    const PROOF_FORM_DUR = 70
    const CROSS_VEIL_DUR = 80
    const VERIFY_DUR = 60
    const ACCEPT_DUR = 100
    const FADE_DUR = 80

    let animId: number

    function animate() {
      animId = requestAnimationFrame(animate)
      time += 0.01
      phaseTime++

      // ==================== IDLE ====================
      if (phase === PH_IDLE) {
        witnessGroup.visible = false
        proofGroup.visible = false

        proverParticles.forEach(p => {
          ;(p.mesh.material as THREE.MeshBasicMaterial).opacity *= 0.95
        })

        if (phaseTime >= IDLE_DUR) {
          phase = PH_WITNESS_ENTER
          phaseTime = 0
          witnessGroup.visible = true
          witnessGroup.position.set(-7, 0, 0)
        }
      }

      // ==================== WITNESS ENTERS PROVER ====================
      else if (phase === PH_WITNESS_ENTER) {
        const prog = Math.min(phaseTime / WITNESS_ENTER_DUR, 1)
        const ease = 1 - Math.pow(1 - prog, 3)

        witnessGroup.position.x = -7 + (-3.8 - -7) * ease
        witnessGroup.position.y = Math.sin(prog * Math.PI) * 0.5

        witnessCore.rotation.y = time * 3
        witnessCore.rotation.x = time * 1.8
        witnessLight.intensity = 1.0 + Math.sin(time * 4) * 0.3

        proverMat.emissiveIntensity = 0.3 + prog * 0.3

        if (prog >= 1) {
          phase = PH_COMPUTE
          phaseTime = 0
          witnessGroup.visible = false
          spawnWave(proverNode.position, COL.witness)
        }
      }

      // ==================== PROVER COMPUTES ====================
      else if (phase === PH_COMPUTE) {
        const prog = Math.min(phaseTime / COMPUTE_DUR, 1)

        proverMat.emissiveIntensity = 0.5 + Math.sin(time * 6) * 0.3
        proverNode.rotation.y = time * 1.5
        proverNode.rotation.x = time * 0.8
        proverGlowMat.opacity = 0.08 + Math.sin(time * 4) * 0.04

        const activeFraction = Math.min(prog * 2, 1)
        proverParticles.forEach((p, i) => {
          if (i / PROVER_PARTICLE_COUNT < activeFraction) {
            p.active = true
            const t = time * p.speed + p.phase
            const angle = p.baseAngle + t * 1.5
            const r = p.radius * (0.5 + 0.5 * Math.sin(t * 0.7))

            p.mesh.position.x = -3.8 + Math.cos(angle) * r * 0.7
            p.mesh.position.y = p.baseY + Math.sin(t * 1.3) * 0.8
            p.mesh.position.z = Math.sin(angle) * r * 0.35

            p.mesh.position.x = Math.min(p.mesh.position.x, -0.4)

            const targetOpacity = 0.3 + 0.4 * Math.sin(t * 2)
            const mat = p.mesh.material as THREE.MeshBasicMaterial
            mat.opacity += (targetOpacity - mat.opacity) * 0.1
          }
        })

        proverAreaLight.intensity = 0.3 + prog * 0.5

        if (prog > 0.7) {
          const convergeProg = (prog - 0.7) / 0.3
          proverParticles.forEach(p => {
            if (p.active) {
              const targetX = -1.2
              const targetY = 0
              p.mesh.position.x += (targetX - p.mesh.position.x) * convergeProg * 0.03
              p.mesh.position.y += (targetY - p.mesh.position.y) * convergeProg * 0.03
              p.mesh.position.z *= 1 - convergeProg * 0.03
            }
          })
        }

        if (phaseTime >= COMPUTE_DUR) {
          phase = PH_PROOF_FORM
          phaseTime = 0
        }
      }

      // ==================== PROOF FORMS ====================
      else if (phase === PH_PROOF_FORM) {
        const prog = Math.min(phaseTime / PROOF_FORM_DUR, 1)
        const ease = prog * prog * (3 - 2 * prog)

        proverParticles.forEach(p => {
          if (p.active) {
            p.mesh.position.x += (-1.0 - p.mesh.position.x) * 0.08
            p.mesh.position.y *= 0.92
            p.mesh.position.z *= 0.92
            ;(p.mesh.material as THREE.MeshBasicMaterial).opacity *= 0.95
            const s = 1 - ease * 0.8
            p.mesh.scale.setScalar(Math.max(0.1, s))
          }
        })

        if (prog > 0.3) {
          proofGroup.visible = true
          proofGroup.position.set(-1.0, 0, 0)
          const appear = (prog - 0.3) / 0.7
          const scale = appear * appear
          proofCore.scale.setScalar(scale)
          proofGlow.scale.setScalar(scale)
          proofCore.rotation.y = time * 2
          proofLight.intensity = scale * 1.5
        }

        proverMat.emissiveIntensity = 0.5 - prog * 0.2
        proverAreaLight.intensity = 0.8 - prog * 0.4

        if (phaseTime >= PROOF_FORM_DUR) {
          phase = PH_CROSS_VEIL
          phaseTime = 0
          proverParticles.forEach(p => {
            ;(p.mesh.material as THREE.MeshBasicMaterial).opacity = 0
            p.active = false
          })
        }
      }

      // ==================== PROOF CROSSES VEIL ====================
      else if (phase === PH_CROSS_VEIL) {
        const prog = Math.min(phaseTime / CROSS_VEIL_DUR, 1)

        let ease: number
        if (prog < 0.4) {
          ease = (prog / 0.4) * 0.3
          ease = ease * ease * (3 - 2 * ease) * 0.3
        } else if (prog < 0.55) {
          ease = 0.3 + ((prog - 0.4) / 0.15) * 0.2
        } else {
          const afterProg = (prog - 0.55) / 0.45
          ease = 0.5 + afterProg * afterProg * 0.5
        }

        const startX = -1.0
        const endX = 3.8
        proofGroup.position.x = startX + (endX - startX) * ease
        proofGroup.position.y = Math.sin(prog * Math.PI) * 0.15

        proofCore.rotation.y = time * 3
        proofLight.intensity = 1.5 + Math.sin(time * 5) * 0.5

        const distToVeil = Math.abs(proofGroup.position.x)
        if (distToVeil < 1.0) {
          const veilReact = 1 - distToVeil
          veilMat.emissiveIntensity = 0.15 + veilReact * 0.6
          veilMat.opacity = 0.12 + veilReact * 0.15

          if (prog > 0.39 && prog < 0.42 && phaseTime % 3 === 0) {
            spawnRipple(new THREE.Vector3(0, proofGroup.position.y, 0))
          }
        } else {
          veilMat.emissiveIntensity = 0.15
          veilMat.opacity = 0.12
        }

        if (phaseTime >= CROSS_VEIL_DUR) {
          phase = PH_VERIFY
          phaseTime = 0
          proofGroup.position.set(3.8, 0, 0)
          spawnWave(verifierNode.position, COL.proof)
        }
      }

      // ==================== VERIFIER CHECKS ====================
      else if (phase === PH_VERIFY) {
        const prog = Math.min(phaseTime / VERIFY_DUR, 1)

        const shrink = 1 - prog
        proofCore.scale.setScalar(shrink)
        proofGlow.scale.setScalar(shrink)
        proofLight.intensity = 1.5 * shrink

        verifierMat.emissiveIntensity = 0.2 + prog * 0.6
        verifierNode.rotation.y = time * 2
        verifierNode.rotation.x = Math.sin(time * 3) * 0.3

        verifyRingMat.opacity = prog * 0.3
        verifyRing.rotation.x = time * 2
        verifyRing.rotation.z = time * 1.5
        const ringScale = 1 + Math.sin(time * 6) * 0.1
        verifyRing.scale.setScalar(ringScale)

        if (phaseTime >= VERIFY_DUR) {
          phase = PH_ACCEPT
          phaseTime = 0
          proofGroup.visible = false
        }
      }

      // ==================== ACCEPTED ====================
      else if (phase === PH_ACCEPT) {
        const prog = Math.min(phaseTime / ACCEPT_DUR, 1)

        const flash = prog < 0.2 ? prog / 0.2 : 1 - (prog - 0.2) / 0.8
        verifierMat.emissiveIntensity = 0.8 + flash * 1.2
        verifierMat.emissive.set(COL.verifierLight)
        verifierGlowMat.opacity = flash * 0.15

        verifyRingMat.opacity = (1 - prog) * 0.4
        const expandScale = 1 + prog * 3
        verifyRing.scale.setScalar(expandScale)
        verifyRing.rotation.x = time * 1.5

        if (phaseTime % 20 === 0 && prog < 0.6) {
          spawnWave(verifierNode.position, COL.verifier)
        }

        verifierAreaLight.intensity = 0.3 + flash * 0.8

        if (phaseTime >= ACCEPT_DUR) {
          phase = PH_FADE
          phaseTime = 0
        }
      }

      // ==================== FADE / RESET ====================
      else if (phase === PH_FADE) {
        const prog = Math.min(phaseTime / FADE_DUR, 1)

        verifierMat.emissiveIntensity = 0.2 + (1 - prog) * 0.3
        verifierMat.emissive.set(COL.verifier)
        verifierGlowMat.opacity *= 0.93
        verifyRingMat.opacity *= 0.9
        proverMat.emissiveIntensity = 0.3
        proverGlowMat.opacity *= 0.93
        proverAreaLight.intensity = 0.3
        verifierAreaLight.intensity = 0.3

        if (phaseTime >= FADE_DUR) {
          phase = PH_IDLE
          phaseTime = 0
          verifyRingMat.opacity = 0
          verifierGlowMat.opacity = 0
          proverGlowMat.opacity = 0
        }
      }

      // ==================== ALWAYS-ON AMBIENT ====================
      proverNode.rotation.y += 0.003
      proverNode.rotation.x = Math.sin(time * 0.5) * 0.1

      verifierNode.rotation.y += 0.002

      // Veil shimmer
      const positions = veilPlane.geometry.attributes.position
      for (let i = 0; i < positions.count; i++) {
        const y = positions.getY(i)
        const wave = Math.sin(y * 2 + time * 3) * 0.015 + Math.sin(y * 5 + time * 1.7) * 0.008
        positions.setX(i, wave)
      }
      positions.needsUpdate = true

      veilLines.forEach((vl, i) => {
        ;(vl.line.material as THREE.LineBasicMaterial).opacity = 0.06 + Math.sin(time * 2 + i * 0.8) * 0.03
      })

      // Ripple rings
      rippleRings.forEach(r => {
        if (!r.active) return
        r.scale += 0.12
        r.opacity *= 0.92
        r.mesh.scale.setScalar(r.scale)
        ;(r.mesh.material as THREE.MeshBasicMaterial).opacity = r.opacity
        if (r.opacity < 0.005) {
          r.active = false
          ;(r.mesh.material as THREE.MeshBasicMaterial).opacity = 0
        }
      })

      // Wave rings
      waveRings.forEach(w => {
        if (!w.active) return
        w.scale += 0.08
        w.opacity *= 0.91
        w.mesh.scale.setScalar(w.scale)
        ;(w.mesh.material as THREE.MeshBasicMaterial).opacity = w.opacity
        if (w.opacity < 0.005) {
          w.active = false
          ;(w.mesh.material as THREE.MeshBasicMaterial).opacity = 0
        }
      })

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
