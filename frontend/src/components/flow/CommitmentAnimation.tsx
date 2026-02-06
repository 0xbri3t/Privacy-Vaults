import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface CommitmentAnimationProps {
  visible: boolean
}

export function CommitmentAnimation({ visible }: CommitmentAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rainCanvasRef = useRef<HTMLCanvasElement>(null)
  const threeCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!visible || !containerRef.current || !rainCanvasRef.current) return

    const container = containerRef.current
    const W = container.clientWidth
    const H = container.clientHeight

    // ==================== MATRIX RAIN ====================
    const rainCanvas = rainCanvasRef.current
    const ctx = rainCanvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1

    rainCanvas.width = W * dpr
    rainCanvas.height = H * dpr
    rainCanvas.style.width = `${W}px`
    rainCanvas.style.height = `${H}px`
    ctx.scale(dpr, dpr)

    const chars = '0123456789abcdef'.split('')
    const colW = 18
    const columns = Math.floor(W / colW)
    const drops: {
      x: number
      y: number
      speed: number
      baseSpeed: number
      chars: string[]
      length: number
      opacity: number
      isGold: boolean
      edgeFade: number // fade factor based on horizontal position
    }[] = []

    for (let i = 0; i < columns; i++) {
      const length = 4 + Math.floor(Math.random() * 12)
      const dropChars: string[] = []
      for (let j = 0; j < length; j++) {
        dropChars.push(chars[Math.floor(Math.random() * chars.length)])
      }

      // Calculate edge fade - less opacity on left/right edges
      const normalizedX = i / columns // 0 to 1
      const distFromCenter = Math.abs(normalizedX - 0.5) * 2 // 0 at center, 1 at edges
      const edgeFade = Math.pow(1 - distFromCenter, 1.5) // Fade curve for edges

      drops.push({
        x: i * colW,
        y: Math.random() * H,
        speed: 0.2 + Math.random() * 0.8,
        baseSpeed: 0.2 + Math.random() * 0.8,
        chars: dropChars,
        length,
        opacity: 0.015 + Math.random() * 0.04,
        isGold: Math.random() > 0.85,
        edgeFade,
      })
    }

    // Constant rain speed - not tied to animation
    const rainSpeed = 0.8
    let rainAnimId: number

    function drawRain() {
      ctx.clearRect(0, 0, W, H)

      ctx.font = '13px monospace'

      drops.forEach(drop => {
        drop.chars.forEach((char, idx) => {
          const y = drop.y - idx * 16
          if (y < -20 || y > H + 100) return

          // Tail fade (up the chain)
          const tailFade = 1 - idx / drop.length

          // Bottom fade - gradual fade out in bottom 30% of screen
          const bottomFadeStart = H * 0.7
          let bottomFade = 1
          if (y > bottomFadeStart) {
            bottomFade = 1 - ((y - bottomFadeStart) / (H * 0.3))
            bottomFade = Math.max(0, Math.pow(bottomFade, 2))
          }

          // Combine all fade factors - increased base opacity
          const alpha = drop.opacity * 3 * tailFade * drop.edgeFade * bottomFade

          if (alpha < 0.001) return

          if (idx === 0) {
            if (drop.isGold) {
              ctx.fillStyle = `rgba(212, 168, 83, ${Math.min(alpha * 2.5, 1)})`
            } else {
              ctx.fillStyle = `rgba(0, 229, 204, ${Math.min(alpha * 2.5, 1)})`
            }
          } else {
            if (drop.isGold) {
              ctx.fillStyle = `rgba(212, 168, 83, ${Math.min(alpha, 1)})`
            } else {
              ctx.fillStyle = `rgba(0, 229, 204, ${Math.min(alpha, 1)})`
            }
          }
          ctx.fillText(char, drop.x, y)
        })

        drop.y += drop.baseSpeed * rainSpeed

        if (drop.y - drop.length * 16 > H + 100) {
          drop.y = -drop.length * 16
          for (let j = 0; j < drop.length; j++) {
            drop.chars[j] = chars[Math.floor(Math.random() * chars.length)]
          }
        }

        if (Math.random() > 0.96) {
          const idx = Math.floor(Math.random() * drop.length)
          drop.chars[idx] = chars[Math.floor(Math.random() * chars.length)]
        }
      })

      rainAnimId = requestAnimationFrame(drawRain)
    }

    ctx.clearRect(0, 0, W, H)
    drawRain()

    // ==================== THREE.JS SCENE ====================
    const COL = {
      bgDeep: 0x050507,
      bgBase: 0x0A0A10,
      card: 0x12121C,
      primary: 0x00e5cc,
      secondary: 0xd4a853,
      goldLight: 0xf0d78c,
      text: 0xe0e0e8,
      danger: 0xff5c5c,
    }

    const scene = new THREE.Scene()
    scene.background = null

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100)
    camera.position.set(1, 2.5, 9)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setSize(W, H)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.top = '0'
    renderer.domElement.style.left = '0'
    container.appendChild(renderer.domElement)
    threeCanvasRef.current = renderer.domElement

    // ==================== NULLIFIER ORB (cyan, left) ====================
    const nullGroup = new THREE.Group()

    const nullCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 48, 48),
      new THREE.MeshPhysicalMaterial({
        color: COL.primary, metalness: 0.1, roughness: 0.15,
        clearcoat: 0.8, emissive: COL.primary, emissiveIntensity: 0.3,
      })
    )
    nullGroup.add(nullCore)

    const nullGlow1 = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 32, 32),
      new THREE.MeshBasicMaterial({ color: COL.primary, transparent: true, opacity: 0.08 })
    )
    nullGroup.add(nullGlow1)

    const nullGlow2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 32, 32),
      new THREE.MeshBasicMaterial({ color: COL.primary, transparent: true, opacity: 0.03 })
    )
    nullGroup.add(nullGlow2)

    const nullRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.012, 8, 64),
      new THREE.MeshBasicMaterial({ color: COL.primary, transparent: true, opacity: 0.2 })
    )
    nullGroup.add(nullRing)

    const nullParticles: { mesh: THREE.Mesh; angle: number; radius: number; speed: number; yOff: number; phase: number }[] = []
    const npGeo = new THREE.SphereGeometry(1, 6, 6)
    for (let i = 0; i < 20; i++) {
      const m = new THREE.MeshBasicMaterial({ color: COL.primary, transparent: true, opacity: 0.3 + Math.random() * 0.4 })
      const p = new THREE.Mesh(npGeo, m)
      p.scale.setScalar(0.02 + Math.random() * 0.03)
      nullGroup.add(p)
      nullParticles.push({
        mesh: p,
        angle: Math.random() * Math.PI * 2,
        radius: 0.3 + Math.random() * 0.4,
        speed: 0.5 + Math.random() * 1.5,
        yOff: (Math.random() - 0.5) * 0.5,
        phase: Math.random() * Math.PI * 2,
      })
    }

    const nullLight = new THREE.PointLight(COL.primary, 0.8, 5)
    nullGroup.add(nullLight)
    scene.add(nullGroup)

    // ==================== SECRET ORB (gold, right) ====================
    const secGroup = new THREE.Group()

    const secCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 48, 48),
      new THREE.MeshPhysicalMaterial({
        color: COL.secondary, metalness: 0.15, roughness: 0.12,
        clearcoat: 0.8, emissive: COL.secondary, emissiveIntensity: 0.3,
      })
    )
    secGroup.add(secCore)

    const secGlow1 = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 32, 32),
      new THREE.MeshBasicMaterial({ color: COL.secondary, transparent: true, opacity: 0.08 })
    )
    secGroup.add(secGlow1)

    const secGlow2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 32, 32),
      new THREE.MeshBasicMaterial({ color: COL.secondary, transparent: true, opacity: 0.03 })
    )
    secGroup.add(secGlow2)

    const secRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.012, 8, 64),
      new THREE.MeshBasicMaterial({ color: COL.secondary, transparent: true, opacity: 0.2 })
    )
    secGroup.add(secRing)

    const secParticles: { mesh: THREE.Mesh; angle: number; radius: number; speed: number; yOff: number; phase: number }[] = []
    for (let i = 0; i < 20; i++) {
      const m = new THREE.MeshBasicMaterial({ color: COL.secondary, transparent: true, opacity: 0.3 + Math.random() * 0.4 })
      const p = new THREE.Mesh(npGeo, m)
      p.scale.setScalar(0.02 + Math.random() * 0.03)
      secGroup.add(p)
      secParticles.push({
        mesh: p,
        angle: Math.random() * Math.PI * 2,
        radius: 0.3 + Math.random() * 0.4,
        speed: 0.5 + Math.random() * 1.5,
        yOff: (Math.random() - 0.5) * 0.5,
        phase: Math.random() * Math.PI * 2,
      })
    }

    const secLight = new THREE.PointLight(COL.secondary, 0.8, 5)
    secGroup.add(secLight)
    scene.add(secGroup)

    // ==================== COMMITMENT ORB (result) ====================
    const commGroup = new THREE.Group()
    commGroup.visible = false

    const commCoreMat = new THREE.MeshPhysicalMaterial({
      color: COL.goldLight, metalness: 0.2, roughness: 0.05,
      clearcoat: 1.0, emissive: COL.goldLight, emissiveIntensity: 0.4,
      transparent: true, opacity: 1,
    })
    const commCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), commCoreMat)
    commGroup.add(commCore)

    const commWireMat = new THREE.MeshBasicMaterial({ color: COL.primary, wireframe: true, transparent: true, opacity: 0.2 })
    const commWire = new THREE.Mesh(new THREE.IcosahedronGeometry(0.48, 1), commWireMat)
    commGroup.add(commWire)

    const commGlow1Mat = new THREE.MeshBasicMaterial({ color: COL.goldLight, transparent: true, opacity: 0.1 })
    const commGlow1 = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 32), commGlow1Mat)
    commGroup.add(commGlow1)

    const commGlow2Mat = new THREE.MeshBasicMaterial({ color: COL.primary, transparent: true, opacity: 0.04 })
    const commGlow2 = new THREE.Mesh(new THREE.SphereGeometry(1.0, 32, 32), commGlow2Mat)
    commGroup.add(commGlow2)

    const commGlow3Mat = new THREE.MeshBasicMaterial({ color: COL.secondary, transparent: true, opacity: 0.02 })
    const commGlow3 = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32), commGlow3Mat)
    commGroup.add(commGlow3)

    const commRingMat = new THREE.MeshBasicMaterial({ color: COL.goldLight, transparent: true, opacity: 0.15 })
    const commRing = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.01, 8, 64), commRingMat)
    commGroup.add(commRing)

    const commRing2Mat = new THREE.MeshBasicMaterial({ color: COL.primary, transparent: true, opacity: 0.08 })
    const commRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.006, 8, 64), commRing2Mat)
    commGroup.add(commRing2)

    const commLight = new THREE.PointLight(COL.goldLight, 0, 8)
    commGroup.add(commLight)
    scene.add(commGroup)

    // ==================== FUSION FLASH ====================
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
    const flash = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), flashMat)
    scene.add(flash)

    // Explosion particles
    const expParticles: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number }[] = []
    const expGeo = new THREE.SphereGeometry(1, 6, 6)
    for (let i = 0; i < 150; i++) {
      const col = Math.random() > 0.5 ? COL.primary : COL.secondary
      const m = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0 })
      const p = new THREE.Mesh(expGeo, m)
      p.scale.setScalar(0.008 + Math.random() * 0.015)
      scene.add(p)
      expParticles.push({
        mesh: p,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 0.14,
          (Math.random() - 0.5) * 0.14,
          (Math.random() - 0.5) * 0.14
        ),
        life: 0,
      })
    }

    // ==================== ENERGY STREAMS ====================
    const streamParticles: { mesh: THREE.Mesh; isCyan: boolean; t: number; speed: number; offset: THREE.Vector3 }[] = []
    const stGeo = new THREE.SphereGeometry(1, 4, 4)
    for (let i = 0; i < 40; i++) {
      const isCyan = i < 20
      const col = isCyan ? COL.primary : COL.secondary
      const m = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0 })
      const p = new THREE.Mesh(stGeo, m)
      p.scale.setScalar(0.012 + Math.random() * 0.015)
      scene.add(p)
      streamParticles.push({
        mesh: p,
        isCyan,
        t: Math.random(),
        speed: 0.008 + Math.random() * 0.012,
        offset: new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3),
      })
    }

    // ==================== AMBIENT DUST ====================
    const dustGeo = new THREE.SphereGeometry(1, 4, 4)
    for (let i = 0; i < 60; i++) {
      const col = Math.random() > 0.6 ? COL.primary : (Math.random() > 0.5 ? COL.secondary : COL.card)
      const m = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.05 + Math.random() * 0.1 })
      const p = new THREE.Mesh(dustGeo, m)
      p.scale.setScalar(0.008 + Math.random() * 0.015)
      p.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6)
      scene.add(p)
    }

    // ==================== LIGHTING ====================
    scene.add(new THREE.AmbientLight(0x0a0a10, 0.4))
    scene.add(new THREE.HemisphereLight(COL.bgDeep, COL.primary, 0.08))

    const keyL = new THREE.DirectionalLight(0xffffff, 0.2)
    keyL.position.set(3, 5, 4)
    scene.add(keyL)

    const fillL = new THREE.PointLight(COL.secondary, 0.15, 12)
    fillL.position.set(-5, 3, -3)
    scene.add(fillL)

    const gnd = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshBasicMaterial({ color: COL.primary, transparent: true, opacity: 0.005, side: THREE.DoubleSide })
    )
    gnd.rotation.x = -Math.PI / 2
    gnd.position.y = -2.5
    scene.add(gnd)

    // ==================== ANIMATION STATE ====================
    const PHASE_ORBIT = 0, PHASE_APPROACH = 1, PHASE_FLASH = 2, PHASE_COMMIT = 3, PHASE_RESET = 4
    let phase = PHASE_ORBIT
    let phaseTime = 0

    const ORBIT_DURATION = 10
    const APPROACH_DURATION = 120
    const FLASH_DURATION = 15
    const COMMIT_DURATION = 50
    const RESET_DURATION = 20

    let time = 0
    const orbStartDist = 2.8
    const nullPos = new THREE.Vector3()
    const secPos = new THREE.Vector3()
    let orbitAngle = 0

    let threeAnimId: number

    function animate() {
      threeAnimId = requestAnimationFrame(animate)
      time += 0.01
      phaseTime++

      // ==================== PHASE LOGIC ====================
      if (phase === PHASE_ORBIT) {
        orbitAngle += 0.03
        const bobY = Math.sin(time * 1.2) * 0.15


        nullPos.set(
          Math.cos(orbitAngle) * orbStartDist,
          bobY + 0.1,
          Math.sin(orbitAngle) * orbStartDist * 0.4
        )
        secPos.set(
          Math.cos(orbitAngle + Math.PI) * orbStartDist,
          -bobY - 0.1,
          Math.sin(orbitAngle + Math.PI) * orbStartDist * 0.4
        )

        nullGroup.position.copy(nullPos)
        secGroup.position.copy(secPos)
        nullGroup.visible = true
        secGroup.visible = true
        commGroup.visible = false

        streamParticles.forEach(sp => (sp.mesh.material as THREE.MeshBasicMaterial).opacity = 0)

        if (phaseTime > ORBIT_DURATION) {
          phase = PHASE_APPROACH
          phaseTime = 0
        }
      }

      else if (phase === PHASE_APPROACH) {
        const prog = Math.min(phaseTime / APPROACH_DURATION, 1)
        const ease = Math.pow(prog, 2)
        const dist = orbStartDist * Math.max(0.08, 1 - ease)
        const angularSpeed = 0.03 + Math.pow(prog, 3.5) * 0.35
        orbitAngle += angularSpeed
        const bobY = Math.sin(time * 1.5) * 0.1 * (1 - ease)


        nullPos.set(
          Math.cos(orbitAngle) * dist,
          bobY * (1 - ease),
          Math.sin(orbitAngle) * dist * 0.5
        )
        secPos.set(
          Math.cos(orbitAngle + Math.PI) * dist,
          -bobY * (1 - ease),
          Math.sin(orbitAngle + Math.PI) * dist * 0.5
        )

        nullGroup.position.copy(nullPos)
        secGroup.position.copy(secPos)

        ;(nullCore.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.3 + ease * 0.7
        ;(secCore.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.3 + ease * 0.7
        nullLight.intensity = 0.8 + ease * 1.5
        secLight.intensity = 0.8 + ease * 1.5

        nullCore.scale.setScalar(1 + ease * 0.3)
        secCore.scale.setScalar(1 + ease * 0.3)

        streamParticles.forEach(sp => {
          sp.t += sp.speed
          if (sp.t > 1) sp.t -= 1
          const from = sp.isCyan ? nullPos : secPos
          const to = sp.isCyan ? secPos : nullPos
          const px = from.x + (to.x - from.x) * sp.t + sp.offset.x * (1 - ease) * Math.sin(time * 3 + sp.t * 5)
          const py = from.y + (to.y - from.y) * sp.t + sp.offset.y * (1 - ease) * Math.cos(time * 2 + sp.t * 4)
          const pz = from.z + (to.z - from.z) * sp.t + sp.offset.z * (1 - ease)
          sp.mesh.position.set(px, py, pz)
          ;(sp.mesh.material as THREE.MeshBasicMaterial).opacity = ease * 0.5 * Math.sin(sp.t * Math.PI)
        })

        if (phaseTime >= APPROACH_DURATION) {
          phase = PHASE_FLASH
          phaseTime = 0
        }
      }

      else if (phase === PHASE_FLASH) {
        const prog = phaseTime / FLASH_DURATION


        nullGroup.visible = false
        secGroup.visible = false

        streamParticles.forEach(sp => (sp.mesh.material as THREE.MeshBasicMaterial).opacity = 0)

        flash.visible = true
        const flashScale = 0.1 + prog * 4
        flash.scale.setScalar(flashScale)
        flashMat.opacity = (1 - prog) * 0.8

        if (phaseTime === 1) {
          expParticles.forEach(ep => {
            ep.mesh.position.set(0, 0, 0)
            ep.vel.set(
              (Math.random() - 0.5) * 0.14,
              (Math.random() - 0.5) * 0.14,
              (Math.random() - 0.5) * 0.14
            )
            ep.life = 0
          })
        }
        expParticles.forEach(ep => {
          ep.life++
          ep.mesh.position.add(ep.vel)
          ep.vel.multiplyScalar(0.94)
          ;(ep.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, (1 - ep.life / 60) * 0.6)
        })

        if (phaseTime >= FLASH_DURATION) {
          phase = PHASE_COMMIT
          phaseTime = 0
          flash.visible = false
          flashMat.opacity = 0
          commGroup.visible = true
          commGroup.position.set(0, 0, 0)
          commCore.scale.setScalar(0.01)
        }
      }

      else if (phase === PHASE_COMMIT) {
        const prog = Math.min(phaseTime / 40, 1)


        const easeOut = 1 - Math.pow(1 - prog, 3)
        commCore.scale.setScalar(easeOut)
        commWire.scale.setScalar(easeOut)

        commCore.rotation.y = time * 0.5
        commCore.rotation.x = time * 0.3
        commWire.rotation.y = time * 0.5
        commWire.rotation.x = time * 0.3

        commRing.rotation.x = time * 0.4
        commRing.rotation.z = time * 0.2
        commRing2.rotation.y = time * 0.3
        commRing2.rotation.x = time * 0.5

        commLight.intensity = easeOut * 1.5

        commGlow1Mat.opacity = 0.06 + 0.04 * Math.sin(time * 2)
        commGlow2Mat.opacity = 0.03 + 0.02 * Math.sin(time * 2.5)
        commGlow3Mat.opacity = 0.01 + 0.01 * Math.sin(time * 1.8)

        expParticles.forEach(ep => {
          ep.mesh.position.add(ep.vel)
          ep.vel.multiplyScalar(0.985)
          ;(ep.mesh.material as THREE.MeshBasicMaterial).opacity *= 0.994
        })

        if (phaseTime >= COMMIT_DURATION) {
          phase = PHASE_RESET
          phaseTime = 0
        }
      }

      else if (phase === PHASE_RESET) {
        const prog = phaseTime / RESET_DURATION


        const fadeOut = 1 - prog
        commCoreMat.opacity = fadeOut
        commWireMat.opacity = 0.2 * fadeOut
        commGlow1Mat.opacity = 0.06 * fadeOut
        commGlow2Mat.opacity = 0.03 * fadeOut
        commGlow3Mat.opacity = 0.01 * fadeOut
        commLight.intensity = 1.5 * fadeOut
        commRingMat.opacity = 0.15 * fadeOut
        commRing2Mat.opacity = 0.08 * fadeOut

        commCore.rotation.y = time * 0.5
        commCore.rotation.x = time * 0.3
        commWire.rotation.y = time * 0.5
        commWire.rotation.x = time * 0.3

        if (phaseTime >= RESET_DURATION) {
          phase = PHASE_ORBIT
          phaseTime = 0

          commGroup.visible = false
          nullGroup.visible = true
          secGroup.visible = true
          commCoreMat.opacity = 1
          commWireMat.opacity = 0.2
          commRingMat.opacity = 0.15
          commRing2Mat.opacity = 0.08

          ;(nullCore.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.3
          ;(secCore.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.3
          nullCore.scale.setScalar(1)
          secCore.scale.setScalar(1)
          nullLight.intensity = 0.8
          secLight.intensity = 0.8
        }
      }

      // ==================== ALWAYS-ON ANIMATIONS ====================
      nullRing.rotation.x = time * 0.8
      nullRing.rotation.z = time * 0.4
      secRing.rotation.x = -time * 0.7
      secRing.rotation.y = time * 0.5

      nullParticles.forEach(p => {
        const a = p.angle + time * p.speed
        p.mesh.position.set(
          Math.cos(a) * p.radius,
          p.yOff + Math.sin(time * 0.8 + p.phase) * 0.1,
          Math.sin(a) * p.radius
        )
      })
      secParticles.forEach(p => {
        const a = p.angle + time * p.speed
        p.mesh.position.set(
          Math.cos(a) * p.radius,
          p.yOff + Math.sin(time * 0.9 + p.phase) * 0.1,
          Math.sin(a) * p.radius
        )
      })

      if (nullGroup.visible) {
        ;(nullGlow1.material as THREE.MeshBasicMaterial).opacity = 0.06 + 0.03 * Math.sin(time * 2)
        ;(nullGlow2.material as THREE.MeshBasicMaterial).opacity = 0.02 + 0.015 * Math.sin(time * 1.5)
        ;(secGlow1.material as THREE.MeshBasicMaterial).opacity = 0.06 + 0.03 * Math.sin(time * 2.2)
        ;(secGlow2.material as THREE.MeshBasicMaterial).opacity = 0.02 + 0.015 * Math.sin(time * 1.7)
      }

      renderer.render(scene, camera)
    }

    animate()

    // Cleanup function
    cleanupRef.current = () => {
      cancelAnimationFrame(rainAnimId)
      cancelAnimationFrame(threeAnimId)
      renderer.dispose()
      if (threeCanvasRef.current && container.contains(threeCanvasRef.current)) {
        container.removeChild(threeCanvasRef.current)
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
    >
      <canvas
        ref={rainCanvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ borderRadius: '14px' }}
      />
    </div>
  )
}
