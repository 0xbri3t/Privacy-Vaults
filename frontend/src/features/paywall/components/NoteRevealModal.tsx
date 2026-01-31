import { CheckIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import type { VaultNote } from '../../../integrations/zk/notes'

interface NoteRevealModalProps {
    note: VaultNote
    isOpen: boolean
    onClose: () => void
}

export function NoteRevealModal({
    note,
    isOpen,
    onClose,
}: NoteRevealModalProps) {
    const [copied, setCopied] = useState(false)

    const noteString = JSON.stringify(
        {
            note: note.note.toString(),
            nullifier: note.nullifier.toString(),
            commitment: note.commitment,
        },
        null,
        2,
    )

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(noteString)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (error) {
            console.error('Failed to copy note:', error)
        }
    }

    const handleDownload = () => {
        const element = document.createElement('a')
        const file = new Blob([noteString], { type: 'text/plain' })
        element.href = URL.createObjectURL(file)
        element.download = `vault-note-${Date.now()}.txt`
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="glass-card w-full max-w-md rounded-2xl p-8"
                    >
                        {/* Header */}
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-white mb-2">
                                ✓ Deposit Successful
                            </h2>
                            <p className="text-sm text-zinc-400">
                                Save your withdrawal note securely. You'll need it to claim your
                                funds later.
                            </p>
                        </div>

                        {/* Note display */}
                        <div className="mb-6 bg-zinc-900/50 rounded-xl p-4 border border-zinc-700">
                            <p className="text-xs text-zinc-500 mb-2 font-mono">
                                Withdrawal Note:
                            </p>
                            <textarea
                                readOnly
                                value={noteString}
                                className="w-full h-32 bg-transparent text-xs text-zinc-300 font-mono resize-none outline-none scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 mb-4">
                            <button
                                onClick={handleCopy}
                                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${copied
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                                        : 'bg-violet-500/20 text-violet-400 border border-violet-500/50 hover:bg-violet-500/30'
                                    }`}
                            >
                                {copied ? (
                                    <>
                                        <CheckIcon className="w-4 h-4" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <DocumentArrowDownIcon className="w-4 h-4" />
                                        Copy
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleDownload}
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30 transition-all"
                            >
                                <DocumentArrowDownIcon className="w-4 h-4" />
                                Download
                            </button>
                        </div>

                        {/* Warning */}
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-6">
                            <p className="text-xs text-yellow-400">
                                ⚠️ Keep this note safe. Anyone with access to it can withdraw
                                your funds.
                            </p>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="w-full rounded-xl bg-linear-to-r from-violet-500 to-cyan-400 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:opacity-95 transition"
                        >
                            Done
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
