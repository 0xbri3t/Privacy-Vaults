import { concat, keccak256, toBytes } from 'viem'

/**
 * Generates a random note (secret)
 * A note is 248 bits of randomness used to create commitments
 */
export function generateNote(): bigint {
  const randomBytes = new Uint8Array(31) // 248 bits = 31 bytes
  crypto.getRandomValues(randomBytes)
  return BigInt(
    `0x${Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')}`,
  )
}

/**
 * Generates a random nullifier (to prevent double-spends)
 * A nullifier is 248 bits of randomness
 */
export function generateNullifier(): bigint {
  const randomBytes = new Uint8Array(31) // 248 bits
  crypto.getRandomValues(randomBytes)
  return BigInt(
    `0x${Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')}`,
  )
}

/**
 * Creates a commitment hash from a note and nullifier
 * For simplicity, we use Keccak256 hash of concatenated values
 * (In production, this should use MiMC-Sponge hash to match the circuit)
 * @param note The secret note (248 bits)
 * @param nullifier The nullifier (248 bits)
 * @returns The commitment hash (bytes32)
 */
export function createCommitment(note: bigint, nullifier: bigint): string {
  const noteBytes = toBytes(note, { size: 32 })
  const nullifierBytes = toBytes(nullifier, { size: 32 })
  const commitment = keccak256(concat([noteBytes, nullifierBytes]))
  return commitment
}

/**
 * Represents a note object with secret data for later withdrawal
 */
export interface VaultNote {
  note: bigint
  nullifier: bigint
  commitment: string // bytes32 hex string
}

/**
 * Generates a complete note ready for vault deposit
 */
export function generateVaultNote(): VaultNote {
  const note = generateNote()
  const nullifier = generateNullifier()
  const commitment = createCommitment(note, nullifier)

  return {
    note,
    nullifier,
    commitment,
  }
}

/**
 * Stores a vault note in local storage (encrypted by browser)
 * WARNING: This is not production-secure. In production, use:
 * - Encrypted storage with user-provided passphrase
 * - Hardware wallet support
 * - Recovery phrases
 */
export function saveVaultNoteLocally(note: VaultNote, depositId: string): void {
  const notes = getAllVaultNotesLocally()
  notes.push({
    ...note,
    depositId,
    timestamp: Date.now(),
  })
  localStorage.setItem('vaultNotes', JSON.stringify(notes))
}

export function getAllVaultNotesLocally(): Array<
  VaultNote & { depositId: string; timestamp: number }
> {
  const stored = localStorage.getItem('vaultNotes')
  return stored ? JSON.parse(stored) : []
}

export function getVaultNoteLocally(
  commitment: string,
): (VaultNote & { depositId: string; timestamp: number }) | null {
  const notes = getAllVaultNotesLocally()
  return notes.find((n) => n.commitment === commitment) || null
}

export function deleteVaultNoteLocally(commitment: string): void {
  const notes = getAllVaultNotesLocally().filter(
    (n) => n.commitment !== commitment,
  )
  localStorage.setItem('vaultNotes', JSON.stringify(notes))
}
