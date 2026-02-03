import type { Address } from 'viem'

export interface VaultConfig {
  address: Address
  denomination: bigint
  label: string
  displayAmount: number
  enabled: boolean
}

export const USDC_ADDRESS: Address = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
export const CHAIN_ID = 84532
export const DEPLOY_BLOCK = 37139811n

export const VAULTS: VaultConfig[] = [
  {
    address: '0xFB2edE3a061D140c3Cd0fc3dc1e5b9b7d339c739',
    denomination: 1_000_000n,
    label: '1 USDC',
    displayAmount: 1,
    enabled: true,
  },
  {
    address: '0x0000000000000000000000000000000000000002',
    denomination: 5_000_000n,
    label: '5 USDC',
    displayAmount: 5,
    enabled: false,
  },
  {
    address: '0x0000000000000000000000000000000000000003',
    denomination: 20_000_000n,
    label: '20 USDC',
    displayAmount: 20,
    enabled: false,
  },
  {
    address: '0x0000000000000000000000000000000000000004',
    denomination: 50_000_000n,
    label: '50 USDC',
    displayAmount: 50,
    enabled: false,
  },
]

export const DEFAULT_VAULT = VAULTS.find((v) => v.enabled) ?? VAULTS[0]
export const VAULT_ADDRESS = VAULTS[0].address
export const DENOMINATION = VAULTS[0].denomination
