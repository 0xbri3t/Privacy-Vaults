import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useWallets, OpenfortButton, type UserWallet } from "@openfort/react";
import { useAccount, useSwitchChain, useBalance, useReadContract, useWriteContract } from "wagmi";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

import { formatUnits } from "viem";
import { erc20Abi, createPublicClient, http } from "viem";

import { AnimatedBackground } from "../components/AnimatedBackground";
import { USDC_ADDRESSES } from "../integrations/x402/networks";
import { ERC20_BALANCE_OF_ABI } from "../integrations/x402/contracts";
import { address } from "framer-motion/client";

import { base, baseSepolia } from "viem/chains";


import {
  ensureValidAmount,
  getUSDCBalance,
  type SupportedNetwork,
} from "../integrations/x402";

import { AuthPrompt } from "../features/paywall/components/AuthPrompt";
import { ErrorState } from "../features/paywall/components/ErrorState";
import { LoadingState } from "../features/paywall/components/LoadingState";
import { PaymentSuccess } from "../features/paywall/components/PaymentSuccess";
import { PaymentSummary } from "../features/paywall/components/PaymentSummary";
import { WalletSelector } from "../features/paywall/components/WalletSelector";
import { usePaymentFlow } from "../features/paywall/hooks/usePaymentFlow";
import { useUsdcBalance } from "../features/paywall/hooks/useUsdcBalance";

import {
  getRequiredAmount,
  hasSufficientBalance,
  isDestinationConfigured,
} from "../features/paywall/utils/paymentGuards";

// type Token = "USDC" | "ETH";
type Tab = "deposit" | "withdraw";

// token object with attributes
type Token = {
  name: string;
  symbol: string;
  address?: `0x${string}`;
  icon: typeof UsdcIcon;
}

const tokens = [
  { name: "USD Coin", symbol: "USDC", address: undefined, icon: UsdcIcon },
  { name: "Ether", symbol: "ETH", address: undefined, icon: EthIcon },
]

const BALANCE_REFRESH_INTERVAL_MS = 3000;


const amounts = [1, 2, 5, 10];

function UsdcIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#2775CA" />
      <path
        d="M20.4 18.4c0-2-1.2-2.7-3.6-3-.8-.1-1.6-.3-2.4-.6-.5-.2-.8-.6-.8-1.2 0-.7.5-1.1 1.4-1.2 1.5-.2 2.7.2 3.4.5l.5-1.8c-.8-.4-1.8-.6-2.7-.7V9h-1.6v1.5c-1.8.3-3 1.4-3 3 0 1.8 1.2 2.6 3.6 2.9.8.1 1.6.4 2.4.7.5.2.8.6.8 1.2 0 .8-.6 1.3-1.6 1.4-1.5.1-3-.3-3.8-.8l-.5 1.9c.9.5 2 .7 3.1.8V23h1.6v-1.5c1.9-.3 3.1-1.4 3.1-3.1z"
        fill="#fff"
      />
    </svg>
  );
}

function EthIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#627EEA" />
      <path d="M16.5 4v8.87l7.5 3.35L16.5 4z" fill="#fff" fillOpacity=".6" />
      <path d="M16.5 4L9 16.22l7.5-3.35V4z" fill="#fff" />
      <path d="M16.5 21.97v6.03L24 17.62l-7.5 4.35z" fill="#fff" fillOpacity=".6" />
      <path d="M16.5 28V21.97L9 17.62 16.5 28z" fill="#fff" />
      <path d="M16.5 20.57l7.5-4.35-7.5-3.35v7.7z" fill="#fff" fillOpacity=".2" />
      <path d="M9 16.22l7.5 4.35v-7.7L9 16.22z" fill="#fff" fillOpacity=".6" />
    </svg>
  );
}


function TokenDropdown({
  value,
  onChange,
}: {
  value: Token;
  onChange: (t: Token) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = tokens.find((t) => t.symbol === value.symbol)!;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm font-medium text-white transition hover:border-zinc-600"
      >
        <span className="flex items-center gap-2.5">
          <selected.icon className="h-5 w-5" />
          {selected.symbol}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800 shadow-lg"
          >
            {tokens.map((t) => (
              <li key={t.symbol}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(t);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 px-4 py-3 text-sm transition hover:bg-zinc-700/50 ${t.symbol === value.symbol
                    ? "text-white bg-violet-500/10"
                    : "text-zinc-300"
                    }`}
                >
                  <t.icon className="h-5 w-5" />
                  {t.symbol}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function DepositTab({
  isAuthenticated,
  address,
  balance,
}: {
  isAuthenticated: boolean;
  address: `0x${string}` | undefined;
  balance: number | null;
}) {
  const [token, setToken] = useState<Token>(tokens[0]);
  const [amount, setAmount] = useState<number>(1);
  
  return (
    <div className="space-y-6">
      {/* Token selector */}
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300">
          Token
        </label>
        <TokenDropdown value={token} onChange={setToken} />
        {address && balance !== null && (
          <p className="mt-2 text-xs text-zinc-500">
            Balance: <span className="text-zinc-300">{balance} {token.symbol}</span>
          </p>
        )}
      </div>

      {/* Amount selector */}
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300">
          Amount{" "}
          <span className="text-zinc-500">({token.symbol})</span>
        </label>
        <div className="grid grid-cols-4 gap-3">
          {amounts.map((a) => {
            const active = amount === a;
            return (
              <button
                key={a}
                onClick={() => setAmount(a)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${active
                  ? "border-violet-500/60 bg-violet-500/10 text-white shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                  : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                  }`}
              >
                {a}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action button */}
      {isAuthenticated ? (
        <button className="w-full rounded-xl bg-linear-to-r from-violet-500 to-cyan-400 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:shadow-violet-500/30 hover:opacity-95">
          Deposit
        </button>
      ) : (
        <button
          className="w-full rounded-xl bg-linear-to-r from-violet-500 to-cyan-400 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:shadow-violet-500/30 hover:opacity-95"
        >
          Log In to Deposit
        </button>
      )}

    </div>
  );
}

function WithdrawTab({
  isAuthenticated,
  address,
}: {
  isAuthenticated: boolean;
  address: string | undefined;
}) {
  const [note, setNote] = useState("");
  const [recipient, setRecipient] = useState("");

  return (
    <div className="space-y-6">
      {/* Note input */}
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300">
          Withdrawal Note
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Paste your withdrawal note here..."
          rows={3}
          className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-violet-500/60"
        />
      </div>

      {/* Recipient input */}
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300">
          Recipient Address
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            className="w-full! rounded-xl! border! border-zinc-700! bg-zinc-800/50! px-4! py-3! text-sm! text-white placeholder-zinc-500 outline-none transition focus:border-violet-500/60!"
          />
          {isAuthenticated && address && (
            <button
              type="button"
              onClick={() => setRecipient(address)}
              title="Use my address"
              className="shrink-0 rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-3 text-xs font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-white"
            >
              Me
            </button>
          )}
        </div>
      </div>

      {/* Action button */}
      {isAuthenticated ? (
        <button className="w-full rounded-xl bg-linear-to-r from-violet-500 to-cyan-400 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:shadow-violet-500/30 hover:opacity-95">
          Withdraw
        </button>
      ) : (
        <button
          className="w-full rounded-xl bg-linear-to-r from-violet-500 to-cyan-400 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:shadow-violet-500/30 hover:opacity-95"
        >
          Log In to Withdraw
        </button>
      )}
    </div>
  );
}

export function AppPage() {
  const [tab, setTab] = useState<Tab>("deposit");

  const initialNetwork: SupportedNetwork =
    window.x402?.testnet === false ? "base" : "base-sepolia";

  // Derive payment chain details
  const paymentChain = initialNetwork === "base" ? base : baseSepolia;
  const chainName = initialNetwork === "base" ? "Base" : "Base Sepolia";
  const testnet = initialNetwork !== "base";

  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { isAuthenticated } = useUser();
  const { wallets, isLoadingWallets, setActiveWallet, isConnecting } = useWallets();

  // Unified payment flow hook
  const {
    state: paymentState,
    paymentRequirements,
    amount,
    statusMessage,
    error: flowError,
    successContent,
    initiatePayment,
    refetch: refetchRequirements,
    reset: resetPayment,
  } = usePaymentFlow({
    network: initialNetwork,
    resourceUrl: window.x402?.currentUrl,
    paymentChainId: paymentChain.id,
  });

  // Create public client for balance checks
  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: paymentChain,
        transport: http(),
      }),
    [paymentChain],
  );

  const { formattedBalance: formattedUsdcBalance, isRefreshingBalance, refreshBalance } =
    useUsdcBalance({
      address,
      paymentRequirements,
      publicClient,
      refreshIntervalMs: BALANCE_REFRESH_INTERVAL_MS,
    });

  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  // Check if we're on the correct chain
  const isCorrectChain = isConnected && chainId === paymentChain.id;

  const handleSwitchChain = useCallback(async () => {
    if (isCorrectChain) return;

    try {
      await switchChainAsync({ chainId: paymentChain.id });
    } catch (error) {
      console.error("Failed to switch network", error);
    }
  }, [isCorrectChain, switchChainAsync, paymentChain.id]);


  const handlePayment = useCallback(async () => {
      if (!paymentRequirements || !address) {
        return;
      }
  
      const validRequirements = ensureValidAmount(paymentRequirements);
      const requiredAmount = getRequiredAmount(validRequirements);
  
      try {
        const balance = await getUSDCBalance(publicClient as any, address);
        if (!hasSufficientBalance(balance, requiredAmount)) {
          throw new Error(`Insufficient balance. Make sure you have USDC on ${chainName}.`);
        }
  
        if (!isDestinationConfigured(validRequirements.payTo)) {
          throw new Error("Payment destination not configured. Please contact support.");
        }
  
        const hash = await writeContractAsync({
          address: validRequirements.asset,
          abi: erc20Abi,
          functionName: "transfer",
          args: [validRequirements.payTo, requiredAmount],
          chainId: paymentChain.id,
        });
  
        initiatePayment(hash);
      } catch (error) {
        console.error("Payment failed", error);
      }
    }, [
      address,
      chainName,
      paymentChain.id,
      paymentRequirements,
      publicClient,
      writeContractAsync,
      initiatePayment,
    ]);
  
    const connectWallet = useCallback(
      (wallet: UserWallet) => {
        void setActiveWallet(wallet.id);
      },
      [setActiveWallet],
    );
  
    const handleTryAnotherPayment = useCallback(() => {
      resetPayment();
      void refreshBalance(true);
    }, [resetPayment, refreshBalance]);
  
    // Show loading state
    if (paymentState === "loading" && !paymentRequirements) {
      return (
        <LoadingState
          title="Payment Required"
          subtitle="Loading payment details..."
        />
      );
    }
  
    // Show error state
    if (paymentState === "error" || flowError) {
      return (
        <ErrorState
          title="Payment Configuration Error"
          message={statusMessage || "We could not retrieve payment requirements from the server."}
          actionLabel="Retry"
          onAction={() => {
            void refetchRequirements();
          }}
        />
      );
    }
  
    if (!paymentRequirements) {
      return (
        <ErrorState
          title="Payment Configuration Missing"
          message="No payment requirements were provided. Please check your server configuration."
        />
      );
    }
  
    if (!isAuthenticated) {
      return <AuthPrompt />;
    }
  
    if (isLoadingWallets || wallets.length === 0) {
      return (
        <LoadingState
          title="Setting up your wallet"
          subtitle="We're preparing your embedded Openfort wallet."
        />
      );
    }
  
    if (!isConnected || !address) {
      return (
        <WalletSelector
          wallets={wallets}
          isConnecting={isConnecting}
          onSelect={connectWallet}
        />
      );
    }
  
    // Show success state
    if (paymentState === "success" && successContent) {
      return (
        <PaymentSuccess
          content={successContent}
          onReset={handleTryAnotherPayment}
        />
      );
    }
  
    // Show payment summary
    const isWorking = paymentState === "paying" || paymentState === "confirming" || paymentState === "unlocking" || isWritePending;
  

  return (
    <div className="relative flex min-h-screen flex-col text-white">
      <AnimatedBackground />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <Link to="/" className="text-lg font-bold tracking-tight hover:opacity-80 transition">
          Privacy Vault
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm text-zinc-400 transition hover:text-white">
            &larr; Home
          </Link>
          <OpenfortButton mode="dark" />
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card w-full max-w-md rounded-2xl overflow-hidden"
        >
          {/* Tabs — full width, flush with top edge */}
          <div className="flex">
            {(["deposit", "withdraw"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3.5 text-sm font-semibold transition-all ${tab === t
                  ? "bg-linear-to-r from-violet-500 to-cyan-400 text-white"
                  : "bg-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/10"
                  }`}
              >
                {t === "deposit" ? "Deposit" : "Withdraw"}
              </button>
            ))}
          </div>

          <div className="min-h-[370px] p-8">
            {tab === "deposit" ? (
              <DepositTab isAuthenticated={isAuthenticated} address={address} balance={Number(formattedUsdcBalance)}  />
            ) : (
              <WithdrawTab
                isAuthenticated={isAuthenticated}
                address={address}
              />
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
