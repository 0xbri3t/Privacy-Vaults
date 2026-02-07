import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Contract revert errors must come first — bundler wraps them in AA errors
const ERROR_MAP: [RegExp, string][] = [
  // User action
  [/user rejected|user denied|rejected the request/i, 'Transaction was rejected'],

  // Contract reverts (matched inside bundler error strings)
  [/NoteAlreadySpent/i, 'This note has already been used'],
  [/CollateralLocked/i, 'Cannot withdraw — there is an active loan on this note'],
  [/LoanAlreadyActive/i, 'There is already an active loan on this note'],
  [/NoActiveLoan/i, 'No active loan found for this note'],
  [/DepositAlreadyWithdrawn/i, 'This deposit has already been withdrawn'],
  [/BorrowAmountExceedsLTV/i, 'Borrow amount exceeds the maximum allowed'],
  [/CommitmentAlreadyAdded/i, 'This commitment was already deposited'],
  [/UnknownRoot/i, 'Merkle root is outdated — please try again'],
  [/InvalidWithdrawProof|InvalidBorrowProof/i, 'Proof verification failed — please try again'],
  [/InvalidYieldIndex/i, 'Invalid yield index'],
  [/DepositValueMismatch/i, 'Deposit amount does not match vault denomination'],
  [/PaymentFailed|Transfer failed/i, 'Token transfer failed'],
  [/Insufficient repayment/i, 'Repayment amount is insufficient'],

  // Frontend-thrown errors
  [/commitment not found/i, 'Note not found in this vault'],
  [/no active loan/i, 'No active loan found for this note'],
  [/could not read yieldIndex/i, 'Deposit succeeded but failed to read receipt — check your transaction history'],
  [/insufficient funds/i, 'Insufficient funds'],
  [/nonce too low/i, 'Transaction conflict — please try again'],

  // Network
  [/ETIMEDOUT|ECONNREFUSED/i, 'Network error — please check your connection and try again'],
]

export function sanitizeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  for (const [pattern, friendly] of ERROR_MAP) {
    if (pattern.test(raw)) return friendly
  }
  return 'Something went wrong — please try again'
}
