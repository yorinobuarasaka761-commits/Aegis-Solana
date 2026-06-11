export type AddressType = "wallet" | "token" | "program" | "unknown";

export interface ScanResult {
  address: string;
  type: AddressType;
  riskScore: number; // 0-100, higher = riskier
  riskLabel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  scannedAt: string; // ISO timestamp
  wallet?: WalletData;
  token?: TokenData;
  error?: string;
}

export interface MaliciousInteraction {
  address: string;
  name: string;
  type: "drainer" | "mixer" | "scam_token" | "phishing" | "attacker" | "mev_bot" | "sanctioned";
  description: string;
  signature?: string;
  timestamp?: string;
}

export interface WalletData {
  solBalance: number;       // in SOL (not lamports)
  solBalanceUSD: number;
  tokenHoldings: TokenHolding[];
  totalValueUSD: number;
  riskFlags: RiskFlag[];
  // Wallet Overview Stats
  tokenCount: number;       // total non-dust token count
  recentInteractions?: MaliciousInteraction[];
}

export interface TokenHolding {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  priceUsd: number;
  valueUSD: number;
  change24h?: number;       // % price change 24h from DexScreener
  riskLevel: "SAFE" | "CAUTION" | "DANGER";
  isFrozen: boolean;
  logoUri?: string;
  dexUrl?: string;          // Link to DEX trading page
}

export interface TokenData {
  name: string;
  symbol: string;
  decimals: number;
  supply: number; // human-readable
  mintAuthority: string | null; // null = renounced (good)
  freezeAuthority: string | null;
  isVerified: boolean;
  metadataUri?: string;
  riskFlags: RiskFlag[];
  // Live Market Data (Raydium)
  priceUsd?: number;
  volume24h?: number;
  liquidity?: number;
  fdv?: number;
  dexUrl?: string;
}

export interface RiskFlag {
  label: string;
  severity: "INFO" | "WARNING" | "DANGER";
  description: string;
}
