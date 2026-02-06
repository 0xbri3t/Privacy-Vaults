interface VaultConfig {
  usdcAddress: string;
  chainId: number;
  relayerPrivateKey: string;
  circleApiKey: string;
}

interface ShieldConfig {
  publishableKey: string;
  secretKey: string;
  encryptionShare: string;
}

interface OpenfortConfig {
  secretKey: string;
  shield: ShieldConfig;
}

export interface Config {
  port: number;
  allowedOrigins: string[];
  vault: VaultConfig;
  openfort: OpenfortConfig;
}

function parseOrigins(rawOrigins?: string): string[] {
  if (!rawOrigins) return [];
  return rawOrigins.split(",").map(origin => origin.trim()).filter(Boolean);
}

function toNumber(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function loadConfig(): Config {
  return {
    port: toNumber(process.env.PORT) ?? 3001,
    allowedOrigins: parseOrigins(process.env.CORS_ORIGINS),
    vault: {
      usdcAddress: process.env.USDC_ADDRESS ?? "0x0000000000000000000000000000000000000000",
      chainId: toNumber(process.env.CHAIN_ID) ?? 84532,
      relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY ?? "",
      circleApiKey: process.env.TEST_API_KEY ?? "",
    },
    openfort: {
      secretKey: process.env.OPENFORT_SECRET_KEY ?? "",
      shield: {
        publishableKey: process.env.OPENFORT_SHIELD_PUBLISHABLE_KEY ?? "",
        secretKey: process.env.OPENFORT_SHIELD_SECRET_KEY ?? "",
        encryptionShare: process.env.OPENFORT_SHIELD_ENCRYPTION_SHARE ?? "",
      },
    },
  };
}
