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
import { address, div } from "framer-motion/client";

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
import { Spinner } from "../features/paywall/components/Spinner";

type Tab = "deposit" | "withdraw";

type Token = {
  name: string;
  symbol: string;
  address?: `0x${string}`;
  icon: string;
}

const tokens = [
  { name: "USD Coin", symbol: "USDC", address: undefined, icon: "/usdcLogo.svg" },
  { name: "EUR Coin", symbol: "EURC", address: undefined, icon: "/eurcLogo.svg" },
]

const BALANCE_REFRESH_INTERVAL_MS = 3000;

// const depositButtonTheme = {
//   '--ck-connectbutton-width': '100%',
//   '--ck-connectbutton-font-size': '16px',
//   '--ck-connectbutton-font-weight': '600',
//   '--ck-connectbutton-border-radius': '12px',
//   '--ck-connectbutton-color': '#ffffff',
//   '--ck-connectbutton-background': 'linear-gradient(to right, #8b5cf6, #22d3ee)',
//   '--ck-connectbutton-box-shadow': '0 10px 15px -3px rgba(139, 92, 246, 0.2)',
//   '--ck-connectbutton-hover-color': '#ffffff',
//   '--ck-connectbutton-hover-background': 'linear-gradient(to right, #8b5cf6, #22d3ee)',
//   '--ck-connectbutton-hover-box-shadow': '0 10px 15px -3px rgba(139, 92, 246, 0.3)',
//   '--ck-connectbutton-active-color': '#ffffff',
//   '--ck-connectbutton-active-background': 'linear-gradient(to right, #8b5cf6, #22d3ee)',
//   '--ck-connectbutton-active-box-shadow': '0 10px 15px -3px rgba(139, 92, 246, 0.3)',
// } as const;


const amounts = [1, 2, 5, 10];


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
          <img src={selected.icon} alt={selected.name} className="h-5 w-5 rounded-full" />
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
                  <img src={t.icon} alt={t.name} className="h-5 w-5 rounded-full" />
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
  isCorrectChain,
  isWorking,
  onRefreshBalance,
  onSwitchNetwork,
  onSubmitPayment,
}: {
  isAuthenticated: boolean;
  address: `0x${string}` | undefined;
  balance: number | null;
  isCorrectChain: boolean;
  isWorking: boolean;
  onRefreshBalance: () => void;
  onSwitchNetwork: () => void;
  onSubmitPayment: () => void;
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
      {isAuthenticated && isCorrectChain ? (
        <button 
        className="w-full rounded-xl bg-linear-to-r from-violet-500 to-cyan-400 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:shadow-violet-500/30 hover:opacity-95"
        onClick={onSubmitPayment}
        disabled={isWorking}
        type="button"
        >
          {isWorking ? <Spinner /> : "Deposit"}
        </button>
      ) : (
        <button
          className="w-full rounded-xl bg-linear-to-r from-violet-500 to-cyan-400 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:shadow-violet-500/30 hover:opacity-95"
        >
          Log In to Deposit
        </button>
          // <OpenfortButton label="Log In to deposit" customTheme={depositButtonTheme} />
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
        // <OpenfortButton label="Log In to withdraw" customTheme={depositButtonTheme} />
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

  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { isAuthenticated } = useUser();
  const { wallets, isLoadingWallets, setActiveWallet, isConnecting } = useWallets();

  // Unified payment flow hook
  const {
    state: paymentState,
    paymentRequirements,
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


  // if (isLoadingWallets || wallets.length === 0) {
  //   return (
  //     <LoadingState
  //       title="Setting up your wallet"
  //       subtitle="We're preparing your embedded Openfort wallet."
  //     />
  //   );
  // }

  // if (!isConnected || !address) {
  //   return (
  //     <WalletSelector
  //       wallets={wallets}
  //       isConnecting={isConnecting}
  //       onSelect={connectWallet}
  //     />
  //   );
  // }

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
              <DepositTab 
              isAuthenticated={isAuthenticated} 
              address={address} 
              balance={Number(formattedUsdcBalance) }
              isCorrectChain={isCorrectChain}
              isWorking={isWorking} 
              onRefreshBalance={() => {
                void refreshBalance(true);
              }}
              onSwitchNetwork={handleSwitchChain}
              onSubmitPayment={handlePayment}
              />
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
