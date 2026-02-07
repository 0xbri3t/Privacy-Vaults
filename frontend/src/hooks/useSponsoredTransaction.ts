import { use7702Authorization } from '@openfort/react'
import { createSmartAccountClient } from 'permissionless'
import { toSimpleSmartAccount } from 'permissionless/accounts'
import { createPimlicoClient } from 'permissionless/clients/pimlico'
import { useCallback, useMemo } from 'react'
import { createPublicClient, http, type Hex } from 'viem'
import { entryPoint08Address } from 'viem/account-abstraction'
import { baseSepolia } from 'viem/chains'
import { useWalletClient } from 'wagmi'

const DELEGATION_CONTRACT = '0xe6Cae83BdE06E4c305530e199D7217f42808555B' as const

const pimlicoApiKey = import.meta.env.VITE_PIMLICO_API_KEY
const sponsorshipPolicyId = import.meta.env.VITE_PIMLICO_SPONSORSHIP_POLICY_ID
const pimlicoUrl = `https://api.pimlico.io/v2/${baseSepolia.id}/rpc?apikey=${pimlicoApiKey}`

interface Call {
  to: Hex
  data: Hex
  value?: bigint
}

export function useSponsoredTransaction() {
  const { data: walletClient } = useWalletClient()
  const { signAuthorization } = use7702Authorization()

  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: baseSepolia,
        transport: http(),
      }),
    [],
  )

  const sendSponsoredTransaction = useCallback(
    async (calls: Call[]): Promise<Hex> => {
      if (!walletClient) throw new Error('Wallet not connected')

      const pimlicoClient = createPimlicoClient({
        transport: http(pimlicoUrl),
      })

      const simpleSmartAccount = await toSimpleSmartAccount({
        owner: walletClient,
        entryPoint: {
          address: entryPoint08Address,
          version: '0.8',
        },
        client: publicClient,
        address: walletClient.account.address,
      })

      const smartAccountClient = createSmartAccountClient({
        account: simpleSmartAccount,
        chain: baseSepolia,
        bundlerTransport: http(pimlicoUrl),
        paymaster: pimlicoClient,
        userOperation: {
          estimateFeesPerGas: async () => {
            return (await pimlicoClient.getUserOperationGasPrice()).fast
          },
        },
      })

      const nonce = await publicClient.getTransactionCount({
        address: walletClient.account.address,
      })

      const authorization = await signAuthorization({
        contractAddress: DELEGATION_CONTRACT,
        chainId: baseSepolia.id,
        nonce,
      })

      const txHash = await smartAccountClient.sendTransaction({
        calls: calls.map((c) => ({
          to: c.to,
          data: c.data,
          value: c.value ?? 0n,
        })),
        factory: '0x7702' as Hex,
        factoryData: '0x' as Hex,
        paymasterContext: {
          sponsorshipPolicyId,
        },
        authorization,
      })

      return txHash
    },
    [walletClient, publicClient, signAuthorization],
  )

  return { sendSponsoredTransaction, publicClient }
}
