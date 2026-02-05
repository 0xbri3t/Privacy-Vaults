import { motion } from 'framer-motion'
import { Plasma } from '../components/Plasma.tsx'
import { Spotlight } from '../components/Spotlight.tsx'
import { FlipWords } from '../components/FlipWords.tsx'
import { FlowVisualization } from '../components/flow/FlowVisualization.tsx'
import { DecryptedText } from '../components/DecryptedText.tsx'

interface LandingPageProps {
  onLaunch: () => void
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const },
  }),
}

export function LandingPage({ onLaunch }: LandingPageProps) {
  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] overflow-hidden">
      {/* Plasma WebGL background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Plasma color="#a1a1aa" speed={0.3} scale={1.2} opacity={0.08} mouseInteractive={false} />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl border-b border-[var(--border-subtle)]" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-page) 60%, transparent)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-bold text-[var(--text-primary)]">
            <DecryptedText
              text="Privacy Vaults"
              animateOn="view"
              sequential
              speed={40}
              className="text-[var(--text-primary)]"
              encryptedClassName="text-[var(--accent)]"
            />
          </span>
          <button
            onClick={onLaunch}
            className="px-5 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg-deep)] text-sm font-medium hover:bg-[var(--accent-hover)] transition-all"
            style={{ boxShadow: '0 4px 20px var(--primary-glow)' }}
          >
            Launch App
          </button>
        </div>
      </nav>

      {/* Hero */}
      <Spotlight className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 pt-16" fill="rgba(161,161,170,0.12)">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl"
        >
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-tight">
            <FlipWords words={['Private', 'Gasless', 'Anonymous', 'Untraceable']} />
            <br />
            <DecryptedText
              text="USDC Transfers"
              animateOn="view"
              sequential
              speed={35}
              className="text-[var(--text-primary)]"
              encryptedClassName="text-[var(--accent)]"
            />
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-[var(--text-tertiary)] max-w-xl mx-auto">
            Break the on-chain link between sender and receiver. Deposit and withdraw
            USDC with zero-knowledge proofs on Base.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <button
              onClick={onLaunch}
              className="px-8 py-3.5 rounded-xl bg-[var(--accent)] text-[var(--bg-deep)] font-semibold text-lg hover:bg-[var(--accent-hover)] transition-all"
              style={{ boxShadow: '0 8px 30px var(--primary-glow)' }}
            >
              Launch App
            </button>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3.5 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] font-medium text-lg hover:border-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Learn More
            </a>
          </div>
        </motion.div>
      </Spotlight>

      {/* How It Works — Interactive Flow */}
      <section className="relative z-10">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="text-3xl sm:text-4xl font-bold text-center mb-4 px-6"
        >
          <DecryptedText
            text="How It Works"
            animateOn="view"
            sequential
            speed={40}
            className="text-[var(--text-primary)]"
            encryptedClassName="text-[var(--accent)]"
          />
        </motion.h2>
        <FlowVisualization onLaunch={onLaunch} />
      </section>


      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--border-subtle)] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-[var(--text-muted)]">
            Built by <a href="https://www.linkedin.com/in/arnau-briet" target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors">0xbri3t</a>
          </span>
          <div className="flex items-center gap-4">
            <a href="https://github.com/bri3t/Privacy-Vaults" target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
              Docs
            </a>
            <a href="https://github.com/0xbri3t" target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors" aria-label="GitHub">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
            <a href="https://x.com/0xbri3t" target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors" aria-label="Twitter">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a href="https://www.linkedin.com/in/arnau-briet" target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors" aria-label="LinkedIn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
