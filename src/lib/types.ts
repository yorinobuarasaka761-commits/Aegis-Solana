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
  recentActivity?: TransactionActivity[];  // Recent logs for wallets
  tokenTrades?: TokenTrade[];              // Recent buy trades for tokens (from pool)
}

export interface TokenTrade {
  signature: string;
  timestamp: string;
  buyer: string;          // Full wallet address of the buyer
  tokenAmount: number;    // Number of tokens received by buyer
  tokenSymbol: string;
  solAmount?: number;     // SOL spent (may be undefined for USDC buys)
  priceUsd?: number;      // Price per token at time of trade
  dexName?: string;       // Source DEX: "RAYDIUM", "PUMP_FUN", "ORCA", "JUPITER", etc.
  type: "buy" | "sell";
}

export interface TransactionActivity {
  signature: string;
  timestamp: string;
  type: "transfer_in" | "transfer_out" | "swap" | "contract_interaction" | "unknown";
  typeName: string; // e.g. "SOL Received", "SOL Sent", "Token Swap", "Contract Interaction"
  amount?: string;
  sender?: string;
  recipient?: string;
  opposingParty?: string;
  status: "success" | "failed";
  programId?: string;
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
  transactions: ParsedTransaction[];
}

export type TransactionType =
  | "SOL_TRANSFER_IN"
  | "SOL_TRANSFER_OUT"
  | "TOKEN_TRANSFER"
  | "SWAP"
  | "CONTRACT_INTERACTION"
  | "UNKNOWN";

export interface ParsedTransaction {
  signature: string;
  timestamp: string;           // ISO string
  type: TransactionType;
  counterparty: string | null; // The other wallet involved
  amountSOL: number | null;    // SOL moved (if applicable)
  isMalicious: boolean;        // counterparty in malicious DB
  maliciousLabel?: string;     // e.g. "Known Drainer"
  status: "SUCCESS" | "FAILED";
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
  updateAuthority: string | null; // null = renounced (good)
  isVerified: boolean;
  metadataUri?: string;
  riskFlags: RiskFlag[];
  // Live Market Data (Raydium / DexScreener)
  priceUsd?: number;
  volume24h?: number;
  liquidity?: number;
  fdv?: number;
  dexUrl?: string;
  pairAddress?: string; // AMM pool address (Raydium / pump.fun) — used to fetch live trades
  currentPriceUSD: number;    // USD Price from Jupiter API
  marketCapUSD: number;       // Market Cap calculated from Jupiter Price
}

export interface RiskFlag {
  label: string;
  severity: "INFO" | "WARNING" | "DANGER";
  description: string;
}

