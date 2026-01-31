import { type Address, getAddress, type Hex, toHex } from 'viem'

import { AUTHORIZATION_TYPES } from './contracts'
import { getNetworkId } from './networks'
import type {
  ExactEvmPayloadAuthorization,
  PaymentPayload,
  PaymentRequirements,
  UnsignedPaymentPayload,
} from './types'

/**
 * EIP-3009 authorization signature for vault deposits
 */
export interface VaultAuthorization {
  from: Address
  to: Address
  value: bigint
  validAfter: bigint
  validBefore: bigint
  nonce: Hex
  signature: Hex
  v: number
  r: Hex
  s: Hex
}

export function preparePaymentHeader(
  from: Address,
  x402Version: number,
  paymentRequirements: PaymentRequirements,
): UnsignedPaymentPayload {
  const nowSeconds = Math.floor(Date.now() / 1000)
  const { validAfter, validBefore } = getAuthorizationWindow(
    nowSeconds,
    paymentRequirements.maxTimeoutSeconds,
  )

  return {
    x402Version,
    scheme: paymentRequirements.scheme,
    network: paymentRequirements.network,
    payload: {
      signature: undefined,
      authorization: {
        from,
        to: paymentRequirements.payTo,
        value: paymentRequirements.maxAmountRequired,
        validAfter,
        validBefore,
        nonce: createNonce(),
      },
    },
  }
}

export async function createPayment(
  client: any,
  x402Version: number,
  paymentRequirements: PaymentRequirements,
): Promise<PaymentPayload> {
  const accountAddress = resolveAccountAddress(client)
  if (!accountAddress) {
    throw new Error('Wallet client missing account address')
  }

  const unsigned = preparePaymentHeader(
    accountAddress,
    x402Version,
    paymentRequirements,
  )
  const signed = await signPaymentHeader(
    client,
    accountAddress,
    paymentRequirements,
    unsigned,
  )
  return signed
}

export function encodePayment(payment: PaymentPayload): string {
  const safePayload = {
    ...payment,
    payload: {
      ...payment.payload,
      authorization: {
        ...payment.payload.authorization,
      },
    },
  }
  return toBase64(JSON.stringify(safePayload))
}

function getAuthorizationWindow(
  nowSeconds: number,
  maxTimeoutSeconds: number,
): {
  validAfter: string
  validBefore: string
} {
  return {
    validAfter: BigInt(nowSeconds - 600).toString(),
    validBefore: BigInt(nowSeconds + maxTimeoutSeconds).toString(),
  }
}

async function signPaymentHeader(
  client: any,
  accountAddress: Address,
  paymentRequirements: PaymentRequirements,
  unsignedPaymentHeader: UnsignedPaymentPayload,
): Promise<PaymentPayload> {
  const domain = buildAuthorizationDomain(paymentRequirements)

  const { authorization } = unsignedPaymentHeader.payload
  const signature = await client.signTypedData({
    account: accountAddress,
    domain,
    types: AUTHORIZATION_TYPES,
    primaryType: 'TransferWithAuthorization',
    message: buildAuthorizationMessage(authorization),
  })

  return {
    ...unsignedPaymentHeader,
    payload: {
      authorization,
      signature,
    },
  }
}

function buildAuthorizationDomain(paymentRequirements: PaymentRequirements) {
  const chainId = getNetworkId(paymentRequirements.network)
  return {
    name: paymentRequirements.extra?.name ?? 'USD Coin',
    version: paymentRequirements.extra?.version ?? '2',
    chainId,
    verifyingContract: getAddress(paymentRequirements.asset),
  }
}

function buildAuthorizationMessage(
  authorization: ExactEvmPayloadAuthorization,
) {
  return {
    from: getAddress(authorization.from),
    to: getAddress(authorization.to),
    value: BigInt(authorization.value),
    validAfter: BigInt(authorization.validAfter),
    validBefore: BigInt(authorization.validBefore),
    nonce: authorization.nonce,
  }
}

function resolveAccountAddress(client: any): Address | undefined {
  if (typeof client.account === 'string') {
    return getAddress(client.account)
  }
  if (client.account?.address) {
    return getAddress(client.account.address)
  }
  return undefined
}

function createNonce(): Hex {
  const bytes = new Uint8Array(32)
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.getRandomValues === 'function'
  ) {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  return toHex(bytes)
}

function toBase64(data: string): string {
  if (
    typeof globalThis !== 'undefined' &&
    typeof globalThis.btoa === 'function'
  ) {
    return globalThis.btoa(unescape(encodeURIComponent(data)))
  }
  if (typeof globalThis !== 'undefined') {
    const maybeBuffer = (globalThis as Record<string, any>).Buffer
    if (typeof maybeBuffer?.from === 'function') {
      return maybeBuffer.from(data, 'utf-8').toString('base64')
    }
  }
  throw new Error('Base64 encoding not supported in this environment')
}

/**
 * Creates a vault deposit authorization (EIP-3009 signature)
 * @param client Wallet client with signTypedData capability
 * @param from User's wallet address
 * @param to Vault contract address
 * @param value Amount to transfer (denomination)
 * @param usdcAddress USDC token address for domain
 * @param chainId Chain ID for domain
 * @returns Authorization with signature components
 */
export async function createVaultAuthorization(
  client: any,
  from: Address,
  to: Address,
  value: bigint,
  usdcAddress: Address,
  chainId: number,
): Promise<VaultAuthorization> {
  const nowSeconds = Math.floor(Date.now() / 1000)
  const validAfter = BigInt(nowSeconds - 600)
  const validBefore = BigInt(nowSeconds + 3600) // 1 hour validity
  const nonce = createNonce()

  const domain = {
    name: 'USD Coin',
    version: '2',
    chainId,
    verifyingContract: getAddress(usdcAddress),
  }

  const message = {
    from: getAddress(from),
    to: getAddress(to),
    value,
    validAfter,
    validBefore,
    nonce,
  }

  const signature = await client.signTypedData({
    account: from,
    domain,
    types: AUTHORIZATION_TYPES,
    primaryType: 'TransferWithAuthorization',
    message,
  })

  // Parse signature components (v, r, s)
  const r = `0x${signature.slice(2, 66)}` as Hex
  const s = `0x${signature.slice(66, 130)}` as Hex
  const v = parseInt(signature.slice(130, 132), 16)

  return {
    from,
    to,
    value,
    validAfter,
    validBefore,
    nonce,
    signature,
    v,
    r,
    s,
  }
}
