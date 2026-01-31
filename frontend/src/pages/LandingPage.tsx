import {
  BoltIcon,
  CurrencyDollarIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { AnimatedBackground } from '../components/AnimatedBackground'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
}

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
}

const features = [
  {
    icon: BoltIcon,
    title: 'Zero Gas Fees',
    description:
      "Deposit assets without paying gas. The x402 protocol handles transaction costs so you don't have to.",
  },
  {
    icon: EyeSlashIcon,
    title: 'Private Withdrawals',
    description:
      'Break the on-chain link between deposits and withdrawals. Your financial privacy is preserved.',
  },
  {
    icon: CurrencyDollarIcon,
    title: 'Multi-Asset Support',
    description:
      'Deposit USDC or ETH with flexible amounts. More assets coming soon.',
  },
]

const steps = [
  {
    number: '01',
    title: 'Choose Asset & Amount',
    description: 'Select your token and deposit size',
  },
  {
    number: '02',
    title: 'Deposit via x402',
    description: 'Gasless deposit through the x402 protocol',
  },
  {
    number: '03',
    title: 'Receive Withdrawal Note',
    description: 'Get a private note to withdraw later',
  },
]

export function LandingPage() {
  return (
    <div className="relative min-h-screen text-white">
      <AnimatedBackground />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-xl bg-zinc-950/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-tight">
            Privacy Vault
          </span>
          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              How it Works
            </a>
            <a
              href="#security"
              className="text-sm text-zinc-400 transition hover:text-white"
            >
              Security
            </a>
          </div>
          <Link
            to="/app"
            className="rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Launch App
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex min-h-screen flex-col items-center justify-center px-6 pt-20 text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="mx-auto max-w-3xl"
        >
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="mb-4 inline-block rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300"
          >
            Built on Base &middot; Powered by x402
          </motion.p>
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="!text-5xl !font-extrabold leading-tight tracking-tight md:!text-7xl"
          >
            Private Transactions,{' '}
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              Zero Gas Fees
            </span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="mx-auto mt-6 max-w-xl text-lg text-zinc-400"
          >
            Deposit tokens into a privacy vault using the x402 gasless protocol.
            Break the on-chain link between your deposits and withdrawals.
          </motion.p>
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="mt-10"
          >
            <Link
              to="/app"
              className="inline-block rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:shadow-violet-500/40 hover:opacity-95"
            >
              Start Depositing
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="relative px-6 py-32">
        <div className="mx-auto max-w-5xl">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="mb-16 text-center !text-4xl !font-bold"
          >
            Why Privacy Vault?
          </motion.h2>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="grid gap-6 md:grid-cols-3"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                className="glass-card group rounded-2xl p-8"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 transition group-hover:bg-violet-500/20">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">
                  {f.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative px-6 py-32">
        <div className="mx-auto max-w-5xl">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="mb-16 text-center !text-4xl !font-bold"
          >
            How It Works
          </motion.h2>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="grid gap-8 md:grid-cols-3"
          >
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                {i < steps.length - 1 && (
                  <div className="absolute right-0 top-10 hidden h-px w-8 translate-x-full bg-gradient-to-r from-violet-500/50 to-transparent md:block" />
                )}
                <div className="glass-card rounded-2xl p-8">
                  <span className="mb-4 inline-block bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-3xl font-bold text-transparent">
                    {step.number}
                  </span>
                  <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm text-zinc-400">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="relative px-6 py-32">
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
          >
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="mb-8 flex justify-center"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-violet-500/10">
                <ShieldCheckIcon className="h-10 w-10 text-violet-400" />
              </div>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="!text-4xl !font-bold"
            >
              Security First
            </motion.h2>
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5 }}
              className="mt-4 text-lg text-zinc-400"
            >
              All deposits are secured by audited smart contracts on Base. The
              x402 protocol ensures gasless transactions without compromising on
              security. Your withdrawal notes are generated client-side and
              never leave your device.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <span className="text-sm font-semibold">Privacy Vault</span>
          <div className="flex items-center gap-6">
            <a
              href="#features"
              className="text-sm text-zinc-500 transition hover:text-white"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm text-zinc-500 transition hover:text-white"
            >
              How it Works
            </a>
            <a
              href="#security"
              className="text-sm text-zinc-500 transition hover:text-white"
            >
              Security
            </a>
          </div>
          <span className="rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1 text-xs text-zinc-400">
            Built on Base
          </span>
        </div>
      </footer>
    </div>
  )
}
