import { useState, useEffect } from 'react'
import { decodeNote } from '../zk/note.ts'
import { computeCollateralNullifierHash } from '../zk/proof.ts'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3007'

interface LoanInfo {
  debt: string
  fee: string
  repaymentAmount: string
  loan: {
    principalAmount: string
    borrowYieldIndex: string
    depositYieldIndex: string
    active: boolean
  } | null
  collateralNullifierHash: string | null
  isLoading: boolean
  error: string | null
}

export function useLoanInfo(noteInput: string, vaultAddress: string, refreshKey = 0) {
  const [info, setInfo] = useState<LoanInfo>({
    debt: '0',
    fee: '0',
    repaymentAmount: '0',
    loan: null,
    collateralNullifierHash: null,
    isLoading: false,
    error: null,
  })

  useEffect(() => {
    const trimmed = noteInput.trim()
    if (!trimmed) {
      setInfo({ debt: '0', fee: '0', repaymentAmount: '0', loan: null, collateralNullifierHash: null, isLoading: false, error: null })
      return
    }

    let decoded: ReturnType<typeof decodeNote>
    try {
      decoded = decodeNote(trimmed)
    } catch {
      setInfo({ debt: '0', fee: '0', repaymentAmount: '0', loan: null, collateralNullifierHash: null, isLoading: false, error: null })
      return
    }

    let cancelled = false

    async function fetchLoan() {
      setInfo((s) => ({ ...s, isLoading: true, error: null }))
      try {
        const { nullifier } = decoded
        const collateralNullifierHash = await computeCollateralNullifierHash(nullifier)

        const res = await fetch(
          `${BACKEND_URL}/api/vault/loan?vaultAddress=${encodeURIComponent(vaultAddress)}&collateralNullifierHash=${encodeURIComponent(collateralNullifierHash)}`,
        )
        if (!res.ok) throw new Error('Failed to fetch loan info')
        const data = await res.json()

        if (!cancelled) {
          setInfo({
            debt: data.debt,
            fee: data.fee ?? '0',
            repaymentAmount: data.repaymentAmount ?? data.debt,
            loan: data.loan,
            collateralNullifierHash,
            isLoading: false,
            error: null,
          })
        }
      } catch (err) {
        if (!cancelled) {
          setInfo((s) => ({
            ...s,
            isLoading: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          }))
        }
      }
    }

    fetchLoan()
    return () => { cancelled = true }
  }, [noteInput, vaultAddress, refreshKey])

  return info
}
