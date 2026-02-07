import { useState, useCallback, useRef } from 'react'
import { encodeFunctionData, erc20Abi, maxUint256, type Hex } from 'viem'
import { useSponsoredTransaction } from '../useSponsoredTransaction.ts'
import type { LiFiQuote } from './useLiFiQuote.ts'
import { sanitizeError } from '../../lib/utils.ts'
import { BASE_USDC_ADDRESS } from '../../constants/chains.ts'

const LIFI_API = 'https://li.quest/v1'

export type BridgeStep = 'idle' | 'approving' | 'bridging' | 'polling' | 'complete' | 'error'

interface BridgeState {
  step: BridgeStep
  txHash: string | null
  error: string | null
}

export function useLiFiBridge() {
  const [state, setState] = useState<BridgeState>({
    step: 'idle',
    txHash: null,
    error: null,
  })

  const { sendSponsoredTransaction } = useSponsoredTransaction()
  const pollingRef = useRef<ReturnType<typeof setInterval>>(null)

  const bridge = useCallback(async (quote: LiFiQuote) => {
    try {
      setState({ step: 'bridging', txHash: null, error: null })

      const tx = quote.transactionRequest
      const calls = [
        {
          to: BASE_USDC_ADDRESS as Hex,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: 'approve',
            args: [tx.to as Hex, maxUint256],
          }),
        },
        {
          to: tx.to as Hex,
          data: tx.data as Hex,
          value: BigInt(tx.value || '0'),
        },
      ]
      const txHash = await sendSponsoredTransaction(calls)

      setState((s) => ({ ...s, step: 'polling', txHash }))

      // Poll LI.FI status API
      await new Promise<void>((resolve, reject) => {
        let attempts = 0
        pollingRef.current = setInterval(async () => {
          attempts++
          if (attempts > 120) { // ~10 minutes
            if (pollingRef.current) clearInterval(pollingRef.current)
            reject(new Error('Bridge timeout — check your wallet for status'))
            return
          }

          try {
            const params = new URLSearchParams({
              txHash,
              bridge: 'lifi',
              fromChain: quote.transactionRequest.chainId.toString(),
            })
            const res = await fetch(`${LIFI_API}/status?${params}`)
            if (!res.ok) return // Retry on error

            const data = await res.json()
            if (data.status === 'DONE') {
              if (pollingRef.current) clearInterval(pollingRef.current)
              resolve()
            } else if (data.status === 'FAILED') {
              if (pollingRef.current) clearInterval(pollingRef.current)
              reject(new Error('Bridge transaction failed'))
            }
          } catch {
            // Ignore polling errors, will retry
          }
        }, 5000)
      })

      setState({ step: 'complete', txHash, error: null })
    } catch (err) {
      if (pollingRef.current) clearInterval(pollingRef.current)
      setState((s) => ({ ...s, step: 'error', error: sanitizeError(err) }))
    }
  }, [sendSponsoredTransaction])

  const reset = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    setState({ step: 'idle', txHash: null, error: null })
  }, [])

  return { ...state, bridge, reset }
}
