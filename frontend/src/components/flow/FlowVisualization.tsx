import { useState, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { FlowScene } from './FlowScene.tsx'
import { FlowOverlay } from './FlowOverlay.tsx'

const STAGE_LABELS = ['Deposit', 'Commitment', 'Merkle Tree', 'ZK Proof', 'Withdraw']

interface FlowVisualizationProps {
  onLaunch: () => void
}

export function FlowVisualization({ onLaunch }: FlowVisualizationProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const rafRef = useRef<number>(0)
  const targetProgress = useRef(0)

  // When activeStep changes, set target and animate
  useEffect(() => {
    // Target is the midpoint of the stage range (e.g. step 0 → 0.1, step 1 → 0.3, ...)
    targetProgress.current = activeStep * 0.2 + 0.1
  }, [activeStep])

  // Smooth animation loop
  useEffect(() => {
    const animate = () => {
      setProgress((prev) => {
        const diff = targetProgress.current - prev
        if (Math.abs(diff) < 0.001) return targetProgress.current
        return prev + diff * 0.06
      })
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const goToStep = (step: number) => {
    setActiveStep(step)
  }

  const goNext = () => {
    if (activeStep < 4) setActiveStep(activeStep + 1)
  }

  const goPrev = () => {
    if (activeStep > 0) setActiveStep(activeStep - 1)
  }

  return (
    <div className="relative w-full h-[80vh] overflow-hidden">
      {/* Three.js canvas */}
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <FlowScene progress={progress} />
      </Canvas>

      {/* HTML overlay */}
      <FlowOverlay activeStep={activeStep} onLaunch={onLaunch} />

      {/* Bottom controls */}
      <div className="absolute bottom-6 inset-x-0 flex flex-col items-center gap-4">
        {/* Step circles */}
        <div className="flex items-center gap-3">
          {STAGE_LABELS.map((label, i) => {
            const isActive = i === activeStep
            const isDone = i < activeStep
            return (
              <button
                key={i}
                onClick={() => goToStep(i)}
                className="group flex flex-col items-center gap-1.5"
              >
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold
                    transition-all duration-300 border-2
                    ${isActive
                      ? 'bg-amber-500 border-transparent text-white shadow-lg shadow-amber-500/30 scale-110'
                      : isDone
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-[var(--bg-surface)] border-[var(--border-primary)] text-[var(--text-muted)] group-hover:border-[var(--text-muted)] group-hover:text-[var(--text-secondary)]'
                    }
                  `}
                >
                  {i + 1}
                </div>
                <span
                  className={`text-[10px] font-medium transition-colors duration-300 ${
                    isActive ? 'text-[var(--text-primary)]' : isDone ? 'text-amber-400' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Prev / Next arrows */}
        <div className="flex items-center gap-4">
          <button
            onClick={goPrev}
            disabled={activeStep === 0}
            className="px-4 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)] text-[var(--text-tertiary)] text-sm font-medium
              hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Prev
          </button>
          <button
            onClick={goNext}
            disabled={activeStep === 4}
            className="px-4 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-primary)] text-[var(--text-tertiary)] text-sm font-medium
              hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
