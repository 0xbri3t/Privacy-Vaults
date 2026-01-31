import type { Address } from 'viem'

/**
 * Vault configuration with hardcoded addresses and denominations per network
 * Format: { chainId: { vaultAddress, usdcAddress, denomination } }
 */
export const VAULT_CONFIG: Record<
    number,
    {
        vaultAddress: Address
        usdcAddress: Address
        denomination: bigint
    }
> = {
    // Base (Chain ID 8453)
    8453: {
        vaultAddress: '0x0000000000000000000000000000000000000000', // TODO: Update with actual vault address
        usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
        denomination: BigInt('100000000'), // 100 USDC (6 decimals)
    },

    // Base Sepolia (Chain ID 84532)
    84532: {
        vaultAddress: '0x22F5Ef39A7871e739223da3b6F3f868c1c803e54', // PrivacyVault deployed with real Groth16Verifier + MiMC Hasher
        usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC on Base Sepolia
        denomination: BigInt('1000000'), // 1 USDC (6 decimals)
    },
}

/**
 * Get vault configuration for a specific chain
 */
export function getVaultConfig(chainId: number): (typeof VAULT_CONFIG)[number] {
    const config = VAULT_CONFIG[chainId]
    if (!config) {
        throw new Error(`Vault not configured for chain ${chainId}`)
    }
    return config
}
