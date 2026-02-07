import type { Request, Response } from "express";
import type { Openfort } from "@openfort/openfort-node";
import type { Config } from "./config.js";
import { getLoanInfo, getFeeInfo, getCommitments, getCurrentYieldIndex, getDepositStats } from "./vault.js";

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const BYTES32_LENGTH = 66; // 0x + 64 hex chars
const HEX_PATTERN = /^0x[0-9a-fA-F]+$/;

function isValidAddress(value: unknown): value is string {
  return typeof value === "string" && ADDRESS_PATTERN.test(value);
}

function isValidBytes32(value: unknown): value is string {
  return typeof value === "string" && HEX_PATTERN.test(value) && value.length === BYTES32_LENGTH;
}

export async function handleHealth(_req: Request, res: Response): Promise<void> {
  res.status(200).json({
    status: "ok",
    message: "Privacy Vaults server is running",
  });
}

/**
 * Creates an encryption session for AUTOMATIC embedded wallet recovery.
 * This endpoint is required when using automatic wallet recovery with Openfort Shield.
 *
 * @see https://www.openfort.io/docs/products/embedded-wallet/react-native/quickstart/automatic
 * @see https://github.com/openfort-xyz/openfort-backend-quickstart
 */
export async function handleShieldSession(
  _req: Request,
  res: Response,
  openfortClient: Openfort | null,
  shieldConfig: Config["openfort"]["shield"]
): Promise<void> {
  const hasShieldConfig = Boolean(
    shieldConfig.publishableKey &&
    shieldConfig.secretKey &&
    shieldConfig.encryptionShare
  );

  if (!openfortClient || !hasShieldConfig) {
    res.status(500).json({
      error: "Openfort Shield configuration is missing.",
    });
    return;
  }

  try {
    const sessionId = await openfortClient.createEncryptionSession(
      shieldConfig.publishableKey,
      shieldConfig.secretKey,
      shieldConfig.encryptionShare,
    );
    res.status(200).json({ session: sessionId });
  } catch (error) {
    console.error("Shield session error:", error instanceof Error ? error.message : "Unknown error");
    res.status(500).json({
      error: "Failed to create encryption session",
    });
  }
}

/**
 * Returns loan info for a given collateral nullifier hash
 */
export async function handleLoanInfo(
  req: Request,
  res: Response,
  vaultConfig: Config["vault"]
): Promise<void> {
  try {
    const vaultAddress = req.query.vaultAddress;
    const collateralNullifierHash = req.query.collateralNullifierHash;

    if (!isValidAddress(vaultAddress)) {
      res.status(400).json({ error: "Missing or invalid vaultAddress query parameter" });
      return;
    }
    if (!isValidBytes32(collateralNullifierHash)) {
      res.status(400).json({ error: "Missing or invalid collateralNullifierHash query parameter" });
      return;
    }

    const result = await getLoanInfo(vaultAddress, collateralNullifierHash, vaultConfig);

    if (result.error) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.status(200).json({ debt: result.debt, fee: result.fee, repaymentAmount: result.repaymentAmount, loan: result.loan });
  } catch (error) {
    console.error("Loan info error:", error instanceof Error ? error.message : "Unknown error");
    res.status(500).json({
      error: "Internal server error",
    });
  }
}

/**
 * Returns the relayer fee configuration for a vault
 */
export async function handleFeeInfo(
  req: Request,
  res: Response,
  vaultConfig: Config["vault"]
): Promise<void> {
  try {
    const vaultAddress = req.query.vaultAddress;
    if (!isValidAddress(vaultAddress)) {
      res.status(400).json({ error: "Missing or invalid vaultAddress query parameter" });
      return;
    }

    const result = await getFeeInfo(vaultAddress, vaultConfig);

    if (result.error) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.status(200).json({ feeBps: result.feeBps, feeRecipient: result.feeRecipient });
  } catch (error) {
    console.error("Fee info error:", error instanceof Error ? error.message : "Unknown error");
    res.status(500).json({
      error: "Internal server error",
    });
  }
}

/**
 * Returns all deposit commitments sorted by leafIndex
 */
export async function handleVaultCommitments(
  req: Request,
  res: Response,
  vaultConfig: Config["vault"]
): Promise<void> {
  try {
    const vaultAddress = req.query.vaultAddress;
    if (!isValidAddress(vaultAddress)) {
      res.status(400).json({ error: "Missing or invalid vaultAddress query parameter" });
      return;
    }

    const result = await getCommitments(vaultAddress, vaultConfig);

    if (result.error) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.status(200).json({ commitments: result.commitments });
  } catch (error) {
    console.error("Vault commitments error:", error instanceof Error ? error.message : "Unknown error");
    res.status(500).json({
      error: "Internal server error",
    });
  }
}

/**
 * Returns deposit stats (leafIndex + timestamp) for the stats panel
 */
export async function handleVaultStats(
  req: Request,
  res: Response,
  vaultConfig: Config["vault"]
): Promise<void> {
  try {
    const vaultAddress = req.query.vaultAddress;
    if (!isValidAddress(vaultAddress)) {
      res.status(400).json({ error: "Missing or invalid vaultAddress query parameter" });
      return;
    }

    const result = await getDepositStats(vaultAddress, vaultConfig);

    if (result.error) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.status(200).json({ deposits: result.deposits });
  } catch (error) {
    console.error("Vault stats error:", error instanceof Error ? error.message : "Unknown error");
    res.status(500).json({
      error: "Internal server error",
    });
  }
}

/**
 * Returns the current bucketed yield index from the vault contract
 */
export async function handleYieldIndex(
  req: Request,
  res: Response,
  vaultConfig: Config["vault"]
): Promise<void> {
  try {
    const vaultAddress = req.query.vaultAddress;
    if (!isValidAddress(vaultAddress)) {
      res.status(400).json({ error: "Missing or invalid vaultAddress query parameter" });
      return;
    }

    const result = await getCurrentYieldIndex(vaultAddress, vaultConfig);

    if (result.error) {
      res.status(500).json({ error: result.error });
      return;
    }

    res.status(200).json({ yieldIndex: result.yieldIndex });
  } catch (error) {
    console.error("Yield index error:", error instanceof Error ? error.message : "Unknown error");
    res.status(500).json({
      error: "Internal server error",
    });
  }
}

/**
 * Claims testnet USDC from Circle's faucet for Base Sepolia
 * Rate limited: 10 requests per developer account per 24 hours (Circle's limit)
 */
export async function handleFaucetClaim(
  req: Request,
  res: Response,
  vaultConfig: Config["vault"]
): Promise<void> {
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (!isValidAddress(body?.address)) {
      res.status(400).json({ success: false, error: "Invalid address" });
      return;
    }

    if (!vaultConfig.circleApiKey) {
      res.status(500).json({ success: false, error: "Faucet not configured" });
      return;
    }

    const response = await fetch("https://api.circle.com/v1/faucet/drips", {
      method: "POST",
      headers: {
        "Authorization": `Bearer TEST_API_KEY:${vaultConfig.circleApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address: body.address,
        blockchain: "BASE-SEPOLIA",
        usdc: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Circle faucet error:", data);
      res.status(response.status).json({
        success: false,
        error: data.message || "Faucet request failed",
      });
      return;
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Faucet claim error:", error instanceof Error ? error.message : "Unknown error");
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}
