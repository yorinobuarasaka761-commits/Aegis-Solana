import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";
import { AddressType, WalletData, TokenData, TokenHolding, MaliciousInteraction, TransactionActivity, TokenTrade, ParsedTransaction } from "./types";
import { buildTokenRiskFlags, buildWalletRiskFlags, assessTokenRisk } from "./riskScoring";
import { MALICIOUS_ADDRESSES } from "./maliciousAddresses";
import { fetchWalletTransactions } from "./transactions";
import { addMaliciousAddress } from "./maliciousDB";
import { fetchPrices, fetchTokenPrice, SOL_MINT } from "./prices";


const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";

// Extract API key from Helius URL if present (for DAS calls)
const HELIUS_API_KEY = RPC_URL.match(/api-key=([^&]+)/)?.[1] ?? null;

const SYSTEM_PROGRAM = "11111111111111111111111111111111";
const TOKEN_PROGRAM  = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022     = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

export const connection = new Connection(RPC_URL, "confirmed");

export function isValidPublicKey(address: string): boolean {
  try { new PublicKey(address); return true; }
  catch { return false; }
}

export async function detectAddressType(address: string): Promise<AddressType> {
  const info = await connection.getAccountInfo(new PublicKey(address));
  if (!info) return "wallet"; // Unfunded/new accounts are wallets
  const owner = info.owner.toBase58();
  if (owner === SYSTEM_PROGRAM) return "wallet";
  if (owner === TOKEN_PROGRAM || owner === TOKEN_2022) return "token";
  return "program";
}

interface DasAsset {
  interface: string;
  id: string;
  token_info?: {
    balance: number;
    decimals: number;
    symbol?: string;
    price_info?: {
      price_per_token?: number;
      total_price?: number;
    };
  };
  content?: {
    metadata?: {
      name?: string;
      symbol?: string;
    };
    links?: {
      image?: string;
    };
    files?: Array<{ uri: string }>;
  };
}

// ── Helius DAS helper ─────────────────────────────────────────────────────────
async function dasCall(method: string, params: Record<string, unknown>) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`DAS ${method} failed: ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(`DAS ${method}: ${JSON.stringify(j.error)}`);
  return j.result;
}

export async function fetchWalletData(address: string): Promise<WalletData> {
  const pubkey = new PublicKey(address);

  // ── 1. SOL balance ────────────────────────────────────────────
  const lamports = await connection.getBalance(pubkey);
  const solBalance = lamports / LAMPORTS_PER_SOL;

  // ── 2. Fetch all fungible assets via Helius DAS ──────────────────────────
  //    This covers standard SPL, Token-2022, and pump.fun tokens in one call.
  //    Helius even returns priceInfo when available.
  let rawHoldings: TokenHolding[] = [];
  let dasSuccess = false;

  if (HELIUS_API_KEY) {
    try {
      let page = 1;
      const allAssets: DasAsset[] = [];
      while (true) {
        const result = (await dasCall("getAssetsByOwner", {
          ownerAddress: address,
          page,
          limit: 1000,
          displayOptions: { showFungible: true, showNativeBalance: false },
        })) as { items?: DasAsset[] };
        const items = result?.items ?? [];
        allAssets.push(...items);
        if (items.length < 1000) break;
        page++;
      }

      const fungible = allAssets.filter(
        (a) => a.interface === "FungibleToken" || a.interface === "FungibleAsset"
      );

      rawHoldings = fungible
        .map((asset): TokenHolding | null => {
          const info = asset.token_info;
          if (!info) return null;
          const balance = info.balance / Math.pow(10, info.decimals ?? 0);
          if (balance <= 0) return null;
          const symbol = info.symbol || asset.content?.metadata?.symbol || asset.id.slice(0, 6) + "...";
          const name   = asset.content?.metadata?.name || info.symbol || "Unknown Token";
          const logo   = asset.content?.links?.image ?? asset.content?.files?.[0]?.uri;
          // Helius price_info gives us the USD price when available
          const priceUsd = info.price_info?.price_per_token ?? 0;
          const valueUSD = info.price_info?.total_price ?? (balance * priceUsd);
          return {
            mint: asset.id,
            symbol,
            name,
            balance,
            decimals: info.decimals ?? 0,
            priceUsd,
            valueUSD,
            change24h: undefined,
            riskLevel: assessTokenRisk(false, info.symbol ? { symbol, name } : undefined),
            isFrozen: false,
            logoUri: logo,
            dexUrl: undefined,
          };
        })
        .filter((h): h is TokenHolding => h !== null && h.balance > 0);

      dasSuccess = true;
    } catch (err) {
      console.error("DAS getAssetsByOwner failed, falling back to RPC:", err);
    }
  }

  // ── 3. Fallback: standard getParsedTokenAccountsByOwner (both programs) ──
  if (!dasSuccess) {
    const [legacy, t22] = await Promise.all([
      connection.getParsedTokenAccountsByOwner(pubkey, { programId: new PublicKey(TOKEN_PROGRAM) }),
      connection.getParsedTokenAccountsByOwner(pubkey, { programId: new PublicKey(TOKEN_2022) }),
    ]);

    const jupiterMap: Record<string, { symbol: string; name: string; logoURI?: string }> = {};
    try {
      const res = await fetch("https://token.jup.ag/all", { next: { revalidate: 3600 } } as RequestInit);
      if (res.ok) {
        const tokens = (await res.json()) as Array<{ address: string; symbol: string; name: string; logoURI?: string }>;
        for (const t of tokens) jupiterMap[t.address] = t;
      }
    } catch {}

    rawHoldings = [...legacy.value, ...t22.value]
      .map((acct): TokenHolding | null => {
        const info = acct.account.data.parsed?.info;
        if (!info) return null;
        const mint = info.mint;
        const meta = jupiterMap[mint];
        const isFrozen = info.state === "frozen";
        const balance = info.tokenAmount?.uiAmount ?? 0;
        if (balance <= 0) return null;
        return {
          mint,
          symbol: meta?.symbol ?? mint.slice(0, 6) + "...",
          name: meta?.name ?? "Unknown Token",
          balance,
          decimals: info.tokenAmount?.decimals ?? 0,
          priceUsd: 0, valueUSD: 0,
          change24h: undefined,
          riskLevel: assessTokenRisk(isFrozen, meta),
          isFrozen,
          logoUri: meta?.logoURI,
          dexUrl: undefined,
        };
      })
      .filter((h): h is TokenHolding => h !== null);
  }

  // ── 4. Fetch all prices via Jupiter Price API v6 ──────────────────────────
  const allMints = [SOL_MINT, ...rawHoldings.map((h) => h.mint)];
  let prices: Record<string, number> = {};
  try {
    prices = await fetchPrices(allMints);
  } catch (err) {
    console.error("Failed to fetch prices:", err);
  }

  const solPrice = prices[SOL_MINT] ?? 0;
  const solBalanceUSD = solBalance * solPrice;

  // ── 5. Fetch 24h change & metadata from DexScreener for holdings ────────
  interface DexPairInfo {
    price?: number;
    change24h?: number;
    dexUrl?: string;
    logo?: string;
    _liq?: number;
  }
  const dexData: Record<string, DexPairInfo> = {};
  try {
    for (let i = 0; i < rawHoldings.length; i += 30) {
      const batch = rawHoldings.slice(i, i + 30).map((h) => h.mint).join(",");
      const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${batch}`);
      if (!r.ok) continue;
      const d = await r.json();
      for (const pair of d?.pairs ?? []) {
        const addr = pair.baseToken?.address;
        if (!addr) continue;
        const liq = pair.liquidity?.usd ?? 0;
        if (!dexData[addr] || liq > (dexData[addr]._liq ?? 0)) {
          dexData[addr] = {
            price: parseFloat(pair.priceUsd ?? "0") || 0,
            change24h: pair.priceChange?.h24,
            dexUrl: pair.url,
            logo: pair.info?.imageUrl,
            _liq: liq,
          };
        }
      }
    }
  } catch {}

  // ── 6. Enrich raw holdings with prices & DexScreener stats ─────────────
  rawHoldings = rawHoldings.map((h) => {
    const jupPrice = prices[h.mint] ?? 0;
    const dex = dexData[h.mint];
    // Prioritize Jupiter price, fall back to DAS (if helius has it) or DexScreener
    const price = jupPrice > 0 ? jupPrice : (h.priceUsd > 0 ? h.priceUsd : (dex?.price ?? 0));
    const valueUSD = h.balance * price;
    return {
      ...h,
      priceUsd: price,
      valueUSD,
      change24h: dex?.change24h,
      dexUrl: dex?.dexUrl,
      logoUri: h.logoUri ?? dex?.logo
    };
  });

  let transactions: ParsedTransaction[] = [];
  try {
    transactions = await fetchWalletTransactions(connection, address);
  } catch (err) {
    console.error("[Aegis] Transaction fetch failed silently:", err);
  }

  // ── 6. Deriving recent malicious interactions from parsed transactions ──
  const recentInteractions: MaliciousInteraction[] = [];

  // Check current holdings for scam tokens (all holdings, including those under $10, to be secure)
  for (const holding of rawHoldings) {
    const malInfo = MALICIOUS_ADDRESSES[holding.mint];
    if (malInfo) {
      addMaliciousAddress(
        address,
        `Auto-flagged: Holds scam token ${holding.symbol} (${malInfo.name})`
      );
      if (!recentInteractions.some((item) => item.address === holding.mint)) {
        recentInteractions.push({
          address: holding.mint,
          name: malInfo.name,
          type: "scam_token",
          description: malInfo.description,
          timestamp: "Active Holding",
        });
      }
    }
  }

  // Derive other interactions from parsed transactions
  for (const tx of transactions) {
    if (tx.isMalicious && tx.counterparty) {
      const malInfo = MALICIOUS_ADDRESSES[tx.counterparty];
      if (!recentInteractions.some((item) => item.address === tx.counterparty)) {
        recentInteractions.push({
          address: tx.counterparty,
          name: malInfo?.name ?? tx.maliciousLabel ?? "Flagged Threat",
          type: malInfo?.type ?? "drainer",
          description: malInfo?.description ?? tx.maliciousLabel ?? "Interaction with flagged address",
          signature: tx.signature,
          timestamp: tx.timestamp,
        });
      }
    }
  }

  // ── 7. Filter dust (<$10), sort by value ────────────────────────────────
  const filteredHoldings = rawHoldings
    .filter((h) => h.valueUSD >= 10)
    .sort((a, b) => b.valueUSD - a.valueUSD);

  const totalValueUSD = filteredHoldings.reduce((s, h) => s + h.valueUSD, solBalanceUSD);

  return {
    solBalance,
    solBalanceUSD,
    tokenHoldings: filteredHoldings,
    totalValueUSD,
    riskFlags: buildWalletRiskFlags(filteredHoldings, recentInteractions, transactions, address),
    tokenCount: filteredHoldings.length,
    recentInteractions,
    transactions,
  };
}

export async function fetchTokenData(address: string): Promise<TokenData> {
  const pubkey = new PublicKey(address);
  let mint;
  try {
    const info = await connection.getAccountInfo(pubkey);
    const programId = info ? info.owner : undefined;
    mint = await getMint(connection, pubkey, undefined, programId);
  } catch (err: unknown) {
    try {
      const info = await connection.getAccountInfo(pubkey);
      const programId = info ? info.owner : undefined;
      const { getAccount } = await import("@solana/spl-token");
      const account = await getAccount(connection, pubkey, undefined, programId);
      throw new Error(`This address is a Token Account (holding ${account.amount.toString()} of mint ${account.mint.toBase58()}). Please scan the Mint or Wallet address instead.`);
    } catch (innerErr: unknown) {
      if (innerErr instanceof Error && innerErr.message?.includes("Token Account")) {
        throw innerErr;
      }
      const errMessage = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to parse token mint: ${errMessage}`);
    }
  }

  const mintAuthority  = mint.mintAuthority?.toBase58() ?? null;
  const freezeAuthority = mint.freezeAuthority?.toBase58() ?? null;
  const updateAuthority = await getUpdateAuthority(address, connection);
  const supply = Number(mint.supply) / Math.pow(10, mint.decimals);

  let name = "Unknown Token", symbol = "???", isVerified = false;
  let metadataUri: string | undefined;

  // Local fallback for well-known verified tokens (USDC, USDT, SOL)
  const WELL_KNOWN_TOKENS: Record<string, { name: string; symbol: string; logoURI: string }> = {
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": {
      name: "USD Coin",
      symbol: "USDC",
      logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
    },
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": {
      name: "USDT",
      symbol: "USDT",
      logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png",
    },
    "So11111111111111111111111111111111111111112": {
      name: "Wrapped SOL",
      symbol: "SOL",
      logoURI: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    },
  };

  const localFallback = WELL_KNOWN_TOKENS[address];
  if (localFallback) {
    name = localFallback.name;
    symbol = localFallback.symbol;
    metadataUri = localFallback.logoURI;
    isVerified = true;
  } else {
    try {
      const r = await fetch(`https://tokens.jup.ag/token/${address}`);
      if (r.ok) {
        const d = await r.json();
        name = d.name;
        symbol = d.symbol;
        metadataUri = d.logoURI;
        isVerified = true;
      }
    } catch {}
  }

  let priceUsd = 0, volume24h = 0, liquidity = 0, fdv = 0, dexUrl = "", pairAddress = "";
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
    if (r.ok) {
      const d = await r.json();
      interface DexPair {
        priceUsd?: string;
        volume?: { h24?: number };
        liquidity?: { usd?: number };
        fdv?: number;
        url: string;
        pairAddress?: string;
        baseToken?: { name?: string; symbol?: string };
        info?: { imageUrl?: string };
      }
      // Pick best pair (prefer raydium/pump, then highest liquidity)
      const sorted = (d.pairs ?? []).sort((a: DexPair, b: DexPair) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
      if (sorted.length > 0) {
        const p = sorted[0];
        priceUsd  = parseFloat(p.priceUsd || "0");
        volume24h = p.volume?.h24 || 0;
        liquidity = p.liquidity?.usd || 0;
        fdv       = p.fdv || 0;
        dexUrl    = p.url;
        pairAddress = p.pairAddress || "";
        if (!isVerified && p.baseToken?.name) { name = p.baseToken.name; symbol = p.baseToken.symbol; }
        if (!metadataUri && p.info?.imageUrl) { metadataUri = p.info.imageUrl; }
      }
    }
  } catch {}

  let currentPriceUSD = 0;
  let marketCapUSD = 0;
  try {
    currentPriceUSD = await fetchTokenPrice(address);
    marketCapUSD = currentPriceUSD * supply;
  } catch (err) {
    console.error("Failed to fetch token price from Jupiter:", err);
  }

  return {
    name, symbol,
    decimals: mint.decimals,
    supply, mintAuthority, freezeAuthority, updateAuthority,
    isVerified, metadataUri,
    riskFlags: buildTokenRiskFlags({ mintAuthority, freezeAuthority, updateAuthority, supply, isVerified }),
    priceUsd, volume24h, liquidity, fdv, dexUrl,
    pairAddress: pairAddress || undefined,
    currentPriceUSD,
    marketCapUSD,
  };
}

export async function getUpdateAuthority(
  mintAddress: string,
  connection: Connection
): Promise<string | null> {
  try {
    const mint = new PublicKey(mintAddress);
    const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      METADATA_PROGRAM_ID
    );
    const info = await connection.getAccountInfo(pda);
    if (!info || !info.data || info.data.length < 33) return null;
    const updateAuthority = new PublicKey(info.data.slice(1, 33));
    return updateAuthority.toBase58();
  } catch (e) {
    console.error("Failed to fetch update authority:", e);
    return null;
  }
}



/**
 * Fetch the 10 most recent BUY transactions for a token.
 *
 * ── Strategy 1 (primary): Helius Enhanced Transaction API ──────────────────
 *   Helius pre-parses every swap with a `source` DEX tag and structured
 *   tokenTransfers / nativeTransfers arrays. Works for ALL DEXes on Solana:
 *   Raydium V4 & CLMM, PumpSwap, Orca, Jupiter aggregated routes, Meteora,
 *   Lifinity, GooseFX, and more. No per-DEX parsing logic required.
 *
 * ── Strategy 2 (fallback): DEX-agnostic RPC parsing ───────────────────────
 *   Falls back to raw Solana RPC if Helius API key is unavailable.
 *   Buyer detection: an account that GAINED the base token AND SPENT SOL
 *   in the same transaction — reliable across any AMM structure.
 */
export async function fetchTokenTrades(
  tokenAddress: string,
  tokenSymbol: string,
  pairAddress: string | null,
  connection: Connection
): Promise<TokenTrade[]> {
  const trades: TokenTrade[] = [];
  // Use pool address if available; token mint itself works as a fallback for bonding-curve tokens
  const targetAddress = pairAddress ?? tokenAddress;

  // Helper to calculate net SOL/WSOL change for an address in lamports
  const getNetSolChange = (htx: any, wallet: string): number => {
    const nativeSent = htx.nativeTransfers
      ?.filter((nt: any) => nt.fromUserAccount === wallet)
      .reduce((s: number, nt: any) => s + nt.amount, 0) ?? 0;
    const nativeReceived = htx.nativeTransfers
      ?.filter((nt: any) => nt.toUserAccount === wallet)
      .reduce((s: number, nt: any) => s + nt.amount, 0) ?? 0;

    const wsolSent = htx.tokenTransfers
      ?.filter((tt: any) => tt.mint === SOL_MINT && tt.fromUserAccount === wallet)
      .reduce((s: number, tt: any) => s + tt.tokenAmount, 0) ?? 0;
    const wsolReceived = htx.tokenTransfers
      ?.filter((tt: any) => tt.mint === SOL_MINT && tt.toUserAccount === wallet)
      .reduce((s: number, tt: any) => s + tt.tokenAmount, 0) ?? 0;

    const netNative = nativeReceived - nativeSent; // lamports
    const netWsol = Math.round((wsolReceived - wsolSent) * 1_000_000_000); // convert decimal WSOL to lamports

    return netNative + netWsol;
  };

  // ── Strategy 1: Helius Enhanced Transaction API ─────────────────────────
  if (HELIUS_API_KEY) {
    try {
      const targetPubkey = new PublicKey(targetAddress);
      const sigs = await connection.getSignaturesForAddress(targetPubkey, { limit: 50 });

      if (sigs && sigs.length > 0) {
        // Helius batch enhanced transaction parser (max 100 per call)
        const sigBatch = sigs.map((s) => s.signature).slice(0, 50);

        const r = await fetch(
          `https://api.helius.xyz/v0/transactions?api-key=${HELIUS_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transactions: sigBatch }),
          }
        );

        if (r.ok) {
          interface HeliusTokenTransfer {
            fromUserAccount: string;
            toUserAccount: string;
            mint: string;
            tokenAmount: number;
          }
          interface HeliusNativeTransfer {
            fromUserAccount: string;
            toUserAccount: string;
            amount: number; // lamports
          }
          interface HeliusTx {
            signature: string;
            timestamp: number;
            type: string;     // "SWAP", "TRANSFER", etc.
            source: string;   // "RAYDIUM", "PUMP_FUN", "ORCA_V2", "JUPITER", etc.
            transactionError: unknown;
            feePayer?: string;
            tokenTransfers?: HeliusTokenTransfer[];
            nativeTransfers?: HeliusNativeTransfer[];
          }

          const heliusTxs: HeliusTx[] = await r.json();

          for (const htx of heliusTxs) {
            if (trades.length >= 10) break;
            if (htx.transactionError) continue;

            // Find any token transfer of our token
            const baseTransfer = htx.tokenTransfers?.find(
              (tt) => tt.mint === tokenAddress && tt.tokenAmount > 0
            );
            if (!baseTransfer) continue;

            let traderAddress = "";
            let tokenAmount = baseTransfer.tokenAmount;
            let tradeType: "buy" | "sell" = "buy";

            const feePayer = htx.feePayer;
            if (feePayer && (feePayer === baseTransfer.toUserAccount || feePayer === baseTransfer.fromUserAccount)) {
              traderAddress = feePayer;
              tradeType = feePayer === baseTransfer.toUserAccount ? "buy" : "sell";
            } else {
              // Heuristic 1: If one of the accounts has a net negative SOL/WSOL movement, that's the buyer.
              const netSolTo = getNetSolChange(htx, baseTransfer.toUserAccount);
              const netSolFrom = getNetSolChange(htx, baseTransfer.fromUserAccount);

              if (netSolTo < -500_000) {
                traderAddress = baseTransfer.toUserAccount;
                tradeType = "buy";
              } else if (netSolFrom > 500_000) {
                traderAddress = baseTransfer.fromUserAccount;
                tradeType = "sell";
              } else if (pairAddress) {
                if (baseTransfer.toUserAccount === pairAddress) {
                  tradeType = "sell";
                  traderAddress = baseTransfer.fromUserAccount;
                } else {
                  tradeType = "buy";
                  traderAddress = baseTransfer.toUserAccount;
                }
              } else {
                tradeType = "buy";
                traderAddress = baseTransfer.toUserAccount;
              }
            }

            if (!traderAddress) continue;

            // Calculate net SOL spent or received by the trader:
            const netLamports = getNetSolChange(htx, traderAddress);
            const absoluteLamports = Math.abs(netLamports);

            // Require at least 0.0005 SOL net movement (filters noise / fee-only txs)
            if (absoluteLamports < 500_000) continue;

            // Pretty-format the DEX name for display
            const dexName = htx.source
              ? htx.source.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
              : "Unknown DEX";

            trades.push({
              signature: htx.signature,
              timestamp: new Date(htx.timestamp * 1000).toLocaleString(),
              buyer: traderAddress,
              tokenAmount,
              tokenSymbol,
              solAmount: absoluteLamports / LAMPORTS_PER_SOL,
              dexName,
              type: tradeType,
            });
          }

          if (trades.length > 0) return trades;
        }
      }
    } catch (err) {
      console.error("Helius enhanced trade parsing failed — falling back to RPC:", err);
    }
  }

  // ── Strategy 2: DEX-agnostic RPC fallback ───────────────────────────────
  try {
    const targetPubkey = new PublicKey(pairAddress ?? tokenAddress);
    const signatures = await connection.getSignaturesForAddress(targetPubkey, { limit: 15 });
    if (!signatures || signatures.length === 0) return trades;

    const sigStrings = signatures.map((s) => s.signature);
    interface ParsedTxWrapper {
      parsed: any;
      signature: string;
      blockTime: number | null | undefined;
    }

    let txs: ParsedTxWrapper[] = [];
    try {
      const batch = await connection.getParsedTransactions(sigStrings, {
        maxSupportedTransactionVersion: 0,
      });
      for (let i = 0; i < batch.length; i++) {
        const p = batch[i];
        if (p) {
          txs.push({
            parsed: p,
            signature: signatures[i].signature,
            blockTime: signatures[i].blockTime,
          });
        }
      }
    } catch (err: any) {
      if (err.message?.includes("Too many requests") || err.code === 429) {
        console.warn("fetchTokenTrades batch fetch rate limited; falling back to sequential fetching.");
        const subset = signatures.slice(0, 5);
        for (const sigInfo of subset) {
          try {
            const parsed = await connection.getParsedTransaction(sigInfo.signature, {
              maxSupportedTransactionVersion: 0,
            });
            if (parsed) {
              txs.push({
                parsed,
                signature: sigInfo.signature,
                blockTime: sigInfo.blockTime,
              });
            }
            await new Promise((resolve) => setTimeout(resolve, 300));
          } catch {
            // ignore individual transaction errors
          }
        }
      } else {
        throw err;
      }
    }

    for (const wrapper of txs) {
      const tx = wrapper.parsed;
      if (!tx || tx.meta?.err) continue;

      const timestamp = wrapper.blockTime
        ? new Date(wrapper.blockTime * 1000).toLocaleString()
        : "Unknown";

      const preTokens = tx.meta?.preTokenBalances ?? [];
      const postTokens = tx.meta?.postTokenBalances ?? [];

      // owner → net base-token delta
      const ownerDelta = new Map<string, number>();
      for (const pre of preTokens) {
        if (pre.mint !== tokenAddress) continue;
        const owner = pre.owner ?? "";
        if (!owner) continue;
        ownerDelta.set(owner, (ownerDelta.get(owner) ?? 0) - (pre.uiTokenAmount.uiAmount ?? 0));
      }
      for (const post of postTokens) {
        if (post.mint !== tokenAddress) continue;
        const owner = post.owner ?? "";
        if (!owner) continue;
        ownerDelta.set(owner, (ownerDelta.get(owner) ?? 0) + (post.uiTokenAmount.uiAmount ?? 0));
      }
      if (ownerDelta.size === 0) continue;

      // owner → net WSOL delta
      const ownerWsolDelta = new Map<string, number>();
      for (const pre of preTokens) {
        if (pre.mint !== SOL_MINT) continue;
        const owner = pre.owner ?? "";
        if (!owner) continue;
        ownerWsolDelta.set(owner, (ownerWsolDelta.get(owner) ?? 0) - (pre.uiTokenAmount.uiAmount ?? 0));
      }
      for (const post of postTokens) {
        if (post.mint !== SOL_MINT) continue;
        const owner = post.owner ?? "";
        if (!owner) continue;
        ownerWsolDelta.set(owner, (ownerWsolDelta.get(owner) ?? 0) + (post.uiTokenAmount.uiAmount ?? 0));
      }

      const accountKeys = tx.transaction.message.accountKeys.map((ak: any) => {
        const pk = (ak as { pubkey?: PublicKey }).pubkey ?? (ak as unknown as PublicKey);
        return pk?.toBase58?.() ?? "";
      });

      // Buyer/Seller detection: Gained tokens & lost SOL/WSOL -> BUY; Lost tokens & gained SOL/WSOL -> SELL
      let traderAddress = "";
      let tokenAmount = 0;
      let solAmount = 0;
      let tradeType: "buy" | "sell" = "buy";

      for (const [owner, tokenDelta] of ownerDelta) {
        const ownerIdx = accountKeys.indexOf(owner);
        if (ownerIdx === -1 || !tx.meta) continue;

        const solDelta =
          (tx.meta.postBalances[ownerIdx] - tx.meta.preBalances[ownerIdx]) / LAMPORTS_PER_SOL;

        const wsolDelta = ownerWsolDelta.get(owner) ?? 0;
        const totalSolDelta = solDelta + wsolDelta;

        if (tokenDelta > 0.000001 && totalSolDelta < -0.0005) {
          // Gained tokens AND spent SOL/WSOL -> BUY
          if (tokenDelta > tokenAmount) {
            tokenAmount = tokenDelta;
            traderAddress = owner;
            solAmount = Math.abs(totalSolDelta);
            tradeType = "buy";
          }
        } else if (tokenDelta < -0.000001 && totalSolDelta > 0.0005) {
          // Lost tokens AND gained SOL/WSOL -> SELL
          const absDelta = Math.abs(tokenDelta);
          if (absDelta > tokenAmount) {
            tokenAmount = absDelta;
            traderAddress = owner;
            solAmount = totalSolDelta;
            tradeType = "sell";
          }
        }
      }

      if (!traderAddress || tokenAmount <= 0) continue;

      trades.push({
        signature: wrapper.signature,
        timestamp,
        buyer: traderAddress,
        tokenAmount,
        tokenSymbol,
        solAmount,
        type: tradeType,
      });
    }
  } catch (err) {
    console.error("fetchTokenTrades RPC fallback failed:", err);
  }

  return trades;
}
