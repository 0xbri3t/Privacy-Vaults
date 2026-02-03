import { motion, AnimatePresence } from 'framer-motion'

interface FlowOverlayProps {
  activeStep: number
  onLaunch: () => void
}

const stages = [
  {
    title: 'Deposit',
    description: 'Deposit USDC into the privacy vault. Your funds enter a shared pool — anonymous from the start.',
  },
  {
    title: 'Commitment',
    description: 'Your deposit is hashed with Poseidon2 into a secret commitment. Only you hold the key.',
  },
  {
    title: 'Merkle Tree',
    description: 'Your commitment joins the Merkle tree — hidden among all other deposits. Indistinguishable.',
  },
  {
    title: 'ZK Proof',
    description: 'A zero-knowledge proof verifies your claim without revealing your identity or deposit.',
  },
  {
    title: 'Withdraw',
    description: 'Withdraw to any address. No on-chain link to the original depositor. Complete privacy.',
  },
]

export function FlowOverlay({ activeStep, onLaunch }: FlowOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-start pt-8 px-8">
      {/* Stage title + description */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="text-center max-w-lg mx-auto"
        >
          <p className="text-xs font-medium tracking-widest uppercase text-violet-400 mb-3">
            Step {activeStep + 1} of 5
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {stages[activeStep].title}
          </h2>
          <p className="text-zinc-400 text-base sm:text-lg leading-relaxed">
            {stages[activeStep].description}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* CTA at the last step */}
      <AnimatePresence>
        {activeStep === 4 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 pointer-events-auto"
          >
            <button
              onClick={onLaunch}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 text-white font-semibold text-lg hover:shadow-xl hover:shadow-violet-500/25 transition-all"
            >
              Launch App
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
