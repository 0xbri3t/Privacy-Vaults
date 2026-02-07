import { useState, useCallback } from 'react'
import { useSignTypedData } from 'wagmi'
import { encodeAbiParameters, parseAbiParameters, encodeFunctionData, decodeEventLog, type Hex, toHex, getAddress } from 'viem'
import { generateCommitment } from '../zk/commitment.ts'
import { encodeNote } from '../zk/note.ts'
import { hexToBytes } from '../zk/utils.ts'
import {
  RECEIVE_WITH_AUTHORIZATION_TYPES,
  vaultAbi,
} from '../contracts/abis.ts'
import type { NetworkConfig } from '../contracts/addresses.ts'
import { useSponsoredTransaction } from './useSponsoredTransaction.ts'

export type DepositStep =
  | 'idle'
  | 'generating'
  | 'signing'
  | 'submitting'
  | 'done'
  | 'error'

interface DepositState {
  step: DepositStep
  note: string | null
  txHash: string | null
  error: string | null
}

interface useDepositProps {
  address?: `0x${string}`
  isConnected?: boolean
  vaultAddress: `0x${string}`
  denomination: bigint
  displayAmount: number
  networkConfig: NetworkConfig
}

const chainIdToNetwork: Record<number, string> = {
  8453: 'base',
  84532: 'base_sepolia',
}

export function useDeposit({ address, isConnected, vaultAddress, denomination, displayAmount, networkConfig }: useDepositProps) {
  const [state, setState] = useState<DepositState>({
    step: 'idle',
    note: null,
    txHash: null,
    error: null,
  })

  const { signTypedDataAsync } = useSignTypedData()
  const { sendSponsoredTransaction, publicClient } = useSponsoredTransaction()

  const deposit = useCallback(async () => {
    if (!isConnected) {
      setState((s) => ({ ...s, step: 'error', error: 'No wallet connected' }))
      return
    }

    try {
      // Step 1: Generate inner commitment (contract will wrap with yield index on-chain)
      setState({ step: 'generating', note: null, txHash: null, error: null })

      const commitment = await generateCommitment()

      // Step 2: Sign EIP-3009 ReceiveWithAuthorization (off-chain, gasless)
      setState((s) => ({ ...s, step: 'signing' }))
      const from = address as `0x${string}`
      const to = vaultAddress
      const nowSeconds = Math.floor(Date.now() / 1000)
      const validAfter = 0n
      const validBefore = BigInt(nowSeconds + 3600)
      const nonceBytes = new Uint8Array(32)
      crypto.getRandomValues(nonceBytes)
      const nonce = toHex(nonceBytes)

      const signature: Hex = await signTypedDataAsync({
        domain: networkConfig.usdcDomain,
        types: RECEIVE_WITH_AUTHORIZATION_TYPES,
        primaryType: 'ReceiveWithAuthorization',
        message: {
          from: getAddress(from),
          to: getAddress(to),
          value: denomination,
          validAfter,
          validBefore,
          nonce,
        },
      })

      // Parse signature → v, r, s
      const r = `0x${signature.slice(2, 66)}` as Hex
      const s = `0x${signature.slice(66, 130)}` as Hex
      const vRaw = parseInt(signature.slice(130, 132), 16)
      const v = vRaw < 27 ? vRaw + 27 : vRaw

      // ABI-encode the authorization (9 params)
      const encodedAuth = encodeAbiParameters(
        parseAbiParameters(
          'address, address, uint256, uint256, uint256, bytes32, uint8, bytes32, bytes32',
        ),
        [
          getAddress(from),
          getAddress(to),
          denomination,
          validAfter,
          validBefore,
          nonce,
          v,
          r,
          s,
        ],
      )

      // Step 3: Submit via Pimlico-sponsored 7702 transaction
      setState((s) => ({ ...s, step: 'submitting' }))
      const callData = encodeFunctionData({
        abi: vaultAbi,
        functionName: 'depositWithAuthorization',
        args: [commitment.commitmentHex as `0x${string}`, encodedAuth as `0x${string}`],
      })

      const txHash = await sendSponsoredTransaction([
        { to: vaultAddress, data: callData },
      ])

      // Step 4: Wait for receipt and read yieldIndex from logs
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

      let yieldIndexBytes: Uint8Array | undefined
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: vaultAbi,
            data: log.data,
            topics: log.topics as [Hex, ...Hex[]],
          })
          if (decoded.eventName === 'DepositWithAuthorization') {
            const yieldIndexBigInt = (decoded.args as { yieldIndex: bigint }).yieldIndex
            const yieldIndexHex = '0x' + yieldIndexBigInt.toString(16).padStart(64, '0')
            yieldIndexBytes = hexToBytes(yieldIndexHex)
            break
          }
        } catch {
          // Not our event, skip
        }
      }

      if (!yieldIndexBytes) {
        throw new Error('Could not read yieldIndex from deposit event')
      }

      const network = chainIdToNetwork[networkConfig.chainId] ?? `chain_${networkConfig.chainId}`
      const note = encodeNote(commitment.commitment, commitment.nullifier, commitment.secret, yieldIndexBytes, 'usdc', displayAmount, network)
      setState({ step: 'done', note, txHash, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setState((s) => ({ ...s, step: 'error', error: message }))
    }
  }, [signTypedDataAsync, sendSponsoredTransaction, publicClient, isConnected, address, vaultAddress, denomination, displayAmount, networkConfig])

  const reset = useCallback(() => {
    setState({ step: 'idle', note: null, txHash: null, error: null })
  }, [])

  return { ...state, deposit, reset }
}
