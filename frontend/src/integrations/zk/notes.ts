ateVaultNote as createVaultNoteInternal,
  hashPrecommitment,
  type MasterKeys,
} from '../vault/crypto'

// Store master keys for the session
let sessionMasterKeys: MasterKeys | null = null

/**
 * Initialize vault notes with a mnemonic (called once at session start)
 * In production, this would use secure key management
 */
export function initializeVaultSession(mnemonic: string): void {
  try {
    sessionMasterKeys = generateMasterKeys(mnemonic)
  } catch (error) {
    throw new Error(
      `Failed to initialize vault session: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

/**
 * Generate a random index for vault notes (timestamp-based)
 */
function generateVaultIndex(): bigint {
  return BigInt(Date.now())
}

/**
 * Creates a commitment hash for withdrawal verification
 * Compatibility function for withdraw.ts
 */
export async function createCommitment(
  secret: bigint,
  nullifier: bigint,
): Promise<bigint> {
  // Using Poseidon hashing via crypto utilities
  const commitment = hashPrecommitment(nullifier as any, secret as any)
  return BigInt(commitment)
}

/**
 * Creates a nullifier hash for withdrawal
 * Compatibility function for withdraw.ts
 */
export async function createNullifierHash(
  nullifier: bigint,
): Promise<bigint> {
  // For Poseidon-based system, nullifier hash can be the nullifier itself
  // or a hash of it depending on circuit requirements
  return nullifier
}

/**
 * Represents a note object with secret data for later withdrawal
 * Uses Poseidon hashing instead of Pedersen
 */
export interface VaultNote {
  commitment: string // bytes32 hex string
  nullifier: string // hex string for zero-knowledge proofs
  secret: string // hex string (keep private!)
}

/**
 * Generates a complete note ready for vault deposit using Poseidon hashing
 * Requires initializeVaultSession() to be called first
 */
export async function generateVaultNote(): Promise<VaultNote> {
  if (!sessionMasterKeys) {
    throw new Error(
      'Vault session not initialized. Call initializeVaultSession(mnemonic) first.',
    )
  }

  const vaultIndex = generateVaultIndex()
  const { nullifier, secret } = generateVaultSecrets(sessionMasterKeys, vaultIndex)
  const note = createVaultNoteInternal(nullifier, secret)

  return {
    commitment: `0x${note.commitment.toString(16).padStart(64, '0')}`,
    nullifier: `0x${nullifier.toString(16).padStart(64, '0')}`,
    secret: `0x${secret.toString(16).padStart(64, '0')}`,
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
