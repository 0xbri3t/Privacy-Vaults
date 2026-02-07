import { createPublicClient, http, type Address, type Log, parseAbiItem } from "viem";
import { base, baseSepolia } from "viem/chains";
import type { Config } from "./config.js";

const DEPLOY_BLOCK = 37317095n;

/**
 * PrivacyVault contract ABI (read-only entries)
 */
const PRIVACY_VAULT_ABI = [
    {
        inputs: [{ name: "_collateralNullifierHash", type: "bytes32" }],
        name: "getDebt",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "", type: "bytes32" }],
        name: "s_loans",
        outputs: [
            { name: "principalAmount", type: "uint256" },
            { name: "borrowYieldIndex", type: "uint256" },
            { name: "depositYieldIndex", type: "uint256" },
            { name: "active", type: "bool" },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "", type: "bytes32" }],
        name: "s_collateralSpent",
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getCurrentBucketedYieldIndex",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "DENOMINATION",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "s_withdrawalFeeBps",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "s_feeRecipient",
        outputs: [{ name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ name: "_collateralNullifierHash", type: "bytes32" }],
        name: "getRepaymentAmount",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
] as const;

/**
 * Gets RPC URL for chain (prefers RPC_URL env var)
 */
function getRpcUrl(chainId: number): string {
    if (process.env.RPC_URL) {
        return process.env.RPC_URL;
    }
    if (chainId === 8453) {
        return "https://mainnet.base.org";
    }
    if (chainId === 84532) {
        return "https://base-sepolia-rpc.publicnode.com";
    }
    throw new Error(`Unsupported chain ID: ${chainId}`);
}

/**
 * Reads loan info from the vault contract
 */
export async function getLoanInfo(
    vaultAddress: string,
    collateralNullifierHash: string,
    vaultConfig: Config["vault"],
): Promise<{ debt: string; fee: string; repaymentAmount: string; loan: { principalAmount: string; borrowYieldIndex: string; depositYieldIndex: string; active: boolean } | null; error?: string }> {
    try {
        const chain = vaultConfig.chainId === 8453 ? base : baseSepolia;
        const rpcUrl = getRpcUrl(vaultConfig.chainId);

        const publicClient = createPublicClient({
            chain,
            transport: http(rpcUrl),
        });

        const debt = await publicClient.readContract({
            address: vaultAddress as Address,
            abi: PRIVACY_VAULT_ABI,
            functionName: "getDebt",
            args: [collateralNullifierHash as `0x${string}`],
        });

        const repaymentAmount = await publicClient.readContract({
            address: vaultAddress as Address,
            abi: PRIVACY_VAULT_ABI,
            functionName: "getRepaymentAmount",
            args: [collateralNullifierHash as `0x${string}`],
        });

        const loanData = await publicClient.readContract({
            address: vaultAddress as Address,
            abi: PRIVACY_VAULT_ABI,
            functionName: "s_loans",
            args: [collateralNullifierHash as `0x${string}`],
        });

        const [principalAmount, borrowYieldIndex, depositYieldIndex, active] = loanData;
        const fee = repaymentAmount - debt;

        return {
            debt: debt.toString(),
            fee: fee.toString(),
            repaymentAmount: repaymentAmount.toString(),
            loan: active ? {
                principalAmount: principalAmount.toString(),
                borrowYieldIndex: borrowYieldIndex.toString(),
                depositYieldIndex: depositYieldIndex.toString(),
                active,
            } : null,
        };
    } catch (error) {
        console.error("Error fetching loan info:", error instanceof Error ? error.message : "Unknown error");
        return {
            debt: "0",
            fee: "0",
            repaymentAmount: "0",
            loan: null,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Reads the fee configuration from the vault contract
 */
export async function getFeeInfo(
    vaultAddress: string,
    vaultConfig: Config["vault"],
): Promise<{ feeBps: string; feeRecipient: string; error?: string }> {
    try {
        const chain = vaultConfig.chainId === 8453 ? base : baseSepolia;
        const rpcUrl = getRpcUrl(vaultConfig.chainId);

        const publicClient = createPublicClient({
            chain,
            transport: http(rpcUrl),
        });

        const feeBps = await publicClient.readContract({
            address: vaultAddress as Address,
            abi: PRIVACY_VAULT_ABI,
            functionName: "s_withdrawalFeeBps",
        });

        const feeRecipient = await publicClient.readContract({
            address: vaultAddress as Address,
            abi: PRIVACY_VAULT_ABI,
            functionName: "s_feeRecipient",
        });

        return {
            feeBps: feeBps.toString(),
            feeRecipient: feeRecipient as string,
        };
    } catch (error) {
        console.error("Error fetching fee info:", error instanceof Error ? error.message : "Unknown error");
        return {
            feeBps: "0",
            feeRecipient: "",
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Fetches all deposit commitments from the vault contract events
 */
export async function getCommitments(
    vaultAddress: string,
    vaultConfig: Config["vault"],
): Promise<{ commitments: string[]; error?: string }> {
    try {
        const chain = vaultConfig.chainId === 8453 ? base : baseSepolia;
        const rpcUrl = getRpcUrl(vaultConfig.chainId);

        const publicClient = createPublicClient({
            chain,
            transport: http(rpcUrl),
        });

        const eventAbi = parseAbiItem(
            "event DepositWithAuthorization(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp, uint256 yieldIndex)",
        );
        const currentBlock = await publicClient.getBlockNumber();
        console.log(`[getCommitments] vaultAddress=${vaultAddress}, fromBlock=${DEPLOY_BLOCK}, toBlock=${currentBlock}, range=${currentBlock - DEPLOY_BLOCK} blocks`);
        let allLogs: Log[] = [];

        // Try single request first (works when result set is small)
        try {
            allLogs = await publicClient.getLogs({
                address: vaultAddress as Address,
                event: eventAbi,
                fromBlock: DEPLOY_BLOCK,
                toBlock: currentBlock,
            });
        } catch (singleErr) {
            console.log(`[getCommitments] single-request failed, falling back to chunked:`, singleErr instanceof Error ? singleErr.message : singleErr);
            // Fall back to chunked requests if RPC rejects large range
            const totalBlocks = currentBlock - DEPLOY_BLOCK;
            const chunkSize = totalBlocks < 100n ? 10n : totalBlocks < 10_000n ? 1_000n : 10_000n;

            for (let from = DEPLOY_BLOCK; from <= currentBlock; from += chunkSize) {
                const to = from + chunkSize - 1n > currentBlock ? currentBlock : from + chunkSize - 1n;
                for (let attempt = 0; attempt < 3; attempt++) {
                    try {
                        const logs = await publicClient.getLogs({
                            address: vaultAddress as Address,
                            event: eventAbi,
                            fromBlock: from,
                            toBlock: to,
                        });
                        allLogs.push(...logs);
                        break;
                    } catch (e) {
                        if (attempt === 2) throw e;
                        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
                    }
                }
            }
        }

        console.log(`[getCommitments] found ${allLogs.length} raw logs`);
        if (allLogs.length > 0) {
            console.log(`[getCommitments] first log block: ${allLogs[0].blockNumber}, topics:`, allLogs[0].topics);
        }

        type DepositLog = Log & { args: { commitment: string; leafIndex: number; timestamp: bigint; yieldIndex: bigint } };
        const sorted = (allLogs as DepositLog[]).sort((a, b) => a.args.leafIndex - b.args.leafIndex);
        const commitments = sorted.map((log) => log.args.commitment);

        console.log(`[getCommitments] returning ${commitments.length} commitments`);
        return { commitments };
    } catch (error) {
        console.error("Error fetching commitments:", error instanceof Error ? error.message : "Unknown error");
        return {
            commitments: [],
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Fetches deposit stats (leafIndex + timestamp) from vault contract events
 */
export async function getDepositStats(
    vaultAddress: string,
    vaultConfig: Config["vault"],
): Promise<{ deposits: { leafIndex: number; timestamp: number }[]; error?: string }> {
    try {
        const chain = vaultConfig.chainId === 8453 ? base : baseSepolia;
        const rpcUrl = getRpcUrl(vaultConfig.chainId);

        const publicClient = createPublicClient({
            chain,
            transport: http(rpcUrl),
        });

        const eventAbi = parseAbiItem(
            "event DepositWithAuthorization(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp, uint256 yieldIndex)",
        );
        const currentBlock = await publicClient.getBlockNumber();
        let allLogs: Log[] = [];

        try {
            allLogs = await publicClient.getLogs({
                address: vaultAddress as Address,
                event: eventAbi,
                fromBlock: DEPLOY_BLOCK,
                toBlock: currentBlock,
            });
        } catch {
            const totalBlocks = currentBlock - DEPLOY_BLOCK;
            const chunkSize = totalBlocks < 100n ? 10n : totalBlocks < 10_000n ? 1_000n : 10_000n;

            for (let from = DEPLOY_BLOCK; from <= currentBlock; from += chunkSize) {
                const to = from + chunkSize - 1n > currentBlock ? currentBlock : from + chunkSize - 1n;
                for (let attempt = 0; attempt < 3; attempt++) {
                    try {
                        const logs = await publicClient.getLogs({
                            address: vaultAddress as Address,
                            event: eventAbi,
                            fromBlock: from,
                            toBlock: to,
                        });
                        allLogs.push(...logs);
                        break;
                    } catch (e) {
                        if (attempt === 2) throw e;
                        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
                    }
                }
            }
        }

        type DepositLog = Log & { args: { commitment: string; leafIndex: number; timestamp: bigint; yieldIndex: bigint } };
        const sorted = (allLogs as DepositLog[]).sort((a, b) => a.args.leafIndex - b.args.leafIndex);
        const deposits = sorted.map((log) => ({
            leafIndex: log.args.leafIndex,
            timestamp: Number(log.args.timestamp),
        }));

        return { deposits };
    } catch (error) {
        console.error("Error fetching deposit stats:", error instanceof Error ? error.message : "Unknown error");
        return {
            deposits: [],
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Reads the current bucketed yield index from the vault contract
 */
export async function getCurrentYieldIndex(
    vaultAddress: string,
    vaultConfig: Config["vault"],
): Promise<{ yieldIndex: string; error?: string }> {
    try {
        const chain = vaultConfig.chainId === 8453 ? base : baseSepolia;
        const rpcUrl = getRpcUrl(vaultConfig.chainId);

        const publicClient = createPublicClient({
            chain,
            transport: http(rpcUrl),
        });

        const yieldIndex = await publicClient.readContract({
            address: vaultAddress as Address,
            abi: PRIVACY_VAULT_ABI,
            functionName: "getCurrentBucketedYieldIndex",
        });

        return { yieldIndex: yieldIndex.toString() };
    } catch (error) {
        console.error("Error fetching yield index:", error instanceof Error ? error.message : "Unknown error");
        return {
            yieldIndex: "0",
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
