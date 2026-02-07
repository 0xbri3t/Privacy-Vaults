import { useEffect, useRef } from 'react'
import { createPublicClient, http, type Address } from 'viem'
import { baseSepolia } from 'viem/chains'
import { getUSDCBalance } from './useUsdcBalance'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3007'
const STORAGE_KEY = 'faucet_last_claim'
const COOLDOWN_MS = 24 * 60 * 60 * 1000 // 24 hours
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
})

export function useFaucetClaim(address: string | undefined, isTestnet: boolean) {
  const hasClaimed = useRef(false)

  useEffect(() => {
    if (!address || !isTestnet || hasClaimed.current) return

    // Check localStorage cooldown
    const lastClaim = localStorage.getItem(`${STORAGE_KEY}_${address}`)
    if (lastClaim && Date.now() - parseInt(lastClaim) < COOLDOWN_MS) return

    hasClaimed.current = true

    // Check balance first, only claim if zero
    getUSDCBalance(publicClient, address as Address, USDC_ADDRESS)
      .then((balance) => {
        if (balance > 0n) return // User has USDC, skip faucet

        // Fire and forget - no error handling needed
        return fetch(`${BACKEND_URL}/api/vault/claim-faucet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              localStorage.setItem(`${STORAGE_KEY}_${address}`, Date.now().toString())
            }
          })
      })
      .catch(() => {}) // Silent fail
  }, [address, isTestnet])
}
