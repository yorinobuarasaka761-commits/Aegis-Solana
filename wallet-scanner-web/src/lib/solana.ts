import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";
import { AddressType, WalletData, TokenData, TokenHolding, MaliciousInteraction } from "./types";
import { buildTokenRiskFlags, buildWalletRiskFlags, assessTokenRisk } from "./riskScoring";
import { MALICIOUS_ADDRESSES } from "./maliciousAddresses";

const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";

// Extract API key from Helius URL if present (for DAS calls)
const HELIUS_API_KEY = RPC_URL.match(/api-key=([^&]+)/)?.[1] ?? null;

const SYSTEM_PROGRAM = "11111111111111111111111111111111";
const TOKEN_PROGRAM  = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022     = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const SOL_MINT       = "So11111111111111111111111111111111111111112";

export const connection = new Connection(RPC_URL, "confirmed");

export function isValidPublicKey(address: string): boolean {
  try { new PublicKey(address); return true; }
  catch { return false; }
}

export async function detectAddressType(address: string): Promise<AddressType> {
  const info = await connection.getAccountInfo(new PublicKey(address));
  if (!info) return "unknown";
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

  // ── 4. For tokens still missing prices, use Jupiter Lite + DexScreener ──
  const missingPrice = rawHoldings.filter((h) => h.priceUsd === 0);

  interface DexPairInfo {
    price?: number;
    change24h?: number;
    dexUrl?: string;
    logo?: string;
    _liq?: number;
  }

  if (missingPrice.length > 0) {
    const mints = missingPrice.map((h) => h.mint);

    // Jupiter Lite v2 (price is returned as string)
    const jupPrices: Record<string, number> = {};
    try {
      for (let i = 0; i < mints.length; i += 100) {
        const batch = [...mints.slice(i, i + 100), SOL_MINT].join(",");
        const r = await fetch(`https://lite-api.jup.ag/price/v2?ids=${batch}`);
        if (r.ok) {
          const d = await r.json();
          if (d && d.data) {
            for (const [mint, info] of Object.entries(d.data as Record<string, { price?: string } | null | undefined>)) {
              const p = parseFloat(info?.price ?? "0");
              if (!isNaN(p) && p > 0) jupPrices[mint] = p;
            }
          }
        }
      }
    } catch {}

    // DexScreener as secondary fallback + 24h change + logo for all holdings
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

    // Merge Jupiter + DexScreener prices into raw holdings
    rawHoldings = rawHoldings.map((h) => {
      if (h.priceUsd > 0) {
        // Already priced by DAS; still grab change24h + dexUrl from DexScreener
        const dex = dexData[h.mint];
        return { ...h, change24h: dex?.change24h, dexUrl: dex?.dexUrl, logoUri: h.logoUri ?? dex?.logo };
      }
      const jupPrice = jupPrices[h.mint] ?? 0;
      const dex = dexData[h.mint];
      const price = jupPrice > 0 ? jupPrice : (dex?.price ?? 0);
      const valueUSD = h.balance * price;
      return { ...h, priceUsd: price, valueUSD, change24h: dex?.change24h, dexUrl: dex?.dexUrl, logoUri: h.logoUri ?? dex?.logo };
    });
  } else {
    // Still grab change24h + dexUrl from DexScreener for display
    try {
      for (let i = 0; i < rawHoldings.length; i += 30) {
        const batch = rawHoldings.slice(i, i + 30).map((h) => h.mint).join(",");
        const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${batch}`);
        if (!r.ok) continue;
        const d = await r.json();
        const dexMap: Record<string, DexPairInfo> = {};
        for (const pair of d?.pairs ?? []) {
          const addr = pair.baseToken?.address;
          if (!addr) continue;
          const liq = pair.liquidity?.usd ?? 0;
          if (!dexMap[addr] || liq > (dexMap[addr]._liq ?? 0)) {
            dexMap[addr] = { change24h: pair.priceChange?.h24, dexUrl: pair.url, logo: pair.info?.imageUrl, _liq: liq };
          }
        }
        rawHoldings = rawHoldings.map((h) => {
          const dex = dexMap[h.mint];
          return dex ? { ...h, change24h: dex.change24h, dexUrl: dex.dexUrl, logoUri: h.logoUri ?? dex.logo } : h;
        });
      }
    } catch {}
  }

  // ── 5. SOL price ────────────────────────────────────────────────────────
  let solPrice = 0;
  try {
    const r = await fetch(`https://lite-api.jup.ag/price/v2?ids=${SOL_MINT}`);
    if (r.ok) { const d = await r.json(); solPrice = parseFloat(d?.data?.[SOL_MINT]?.price ?? "0") || 0; }
  } catch {}
  if (solPrice === 0) {
    try {
      const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
      if (r.ok) { const d = await r.json(); solPrice = d?.solana?.usd ?? 0; }
    } catch {}
  }
  const solBalanceUSD = solBalance * solPrice;

  // ── 6. Recent Transaction & Interaction Scan (Low Credit, Limit 20) ──
  const recentInteractions: MaliciousInteraction[] = [];
  try {
    const signatures = await connection.getSignaturesForAddress(pubkey, { limit: 20 });
    if (signatures && signatures.length > 0) {
      const sigStrings = signatures.map((s) => s.signature);
      // Batch fetch parsed transactions
      const txs = await connection.getParsedTransactions(sigStrings, { maxSupportedTransactionVersion: 0 });
      for (let i = 0; i < txs.length; i++) {
        const tx = txs[i];
        if (!tx) continue;
        const sigInfo = signatures[i];
        const blockTime = sigInfo.blockTime
          ? new Date(sigInfo.blockTime * 1000).toLocaleString()
          : "Unknown time";

        const message = tx.transaction.message;
        const accountKeys = message.accountKeys;
        for (const keyObj of accountKeys) {
          const pubkeyObj = (keyObj as { pubkey?: PublicKey }).pubkey || (keyObj as unknown as PublicKey);
          if (!pubkeyObj || typeof pubkeyObj.toBase58 !== "function") continue;
          const accAddress = pubkeyObj.toBase58();
          if (accAddress === address) continue;

          const malInfo = MALICIOUS_ADDRESSES[accAddress];
          if (malInfo) {
            if (!recentInteractions.some((item) => item.address === accAddress)) {
              recentInteractions.push({
                address: accAddress,
                name: malInfo.name,
                type: malInfo.type,
                description: malInfo.description,
                signature: sigInfo.signature,
                timestamp: blockTime,
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Failed to scan recent signatures for malicious interactions:", err);
  }

  // Check current holdings for scam tokens (all holdings, including those under $10, to be secure)
  for (const holding of rawHoldings) {
    const malInfo = MALICIOUS_ADDRESSES[holding.mint];
    if (malInfo) {
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
    riskFlags: buildWalletRiskFlags(filteredHoldings, recentInteractions),
    tokenCount: filteredHoldings.length,
    recentInteractions,
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

  let priceUsd = 0, volume24h = 0, liquidity = 0, fdv = 0, dexUrl = "";
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
        if (!isVerified && p.baseToken?.name) { name = p.baseToken.name; symbol = p.baseToken.symbol; }
        if (!metadataUri && p.info?.imageUrl) { metadataUri = p.info.imageUrl; }
      }
    }
  } catch {}

  return {
    name, symbol,
    decimals: mint.decimals,
    supply, mintAuthority, freezeAuthority,
    isVerified, metadataUri,
    riskFlags: buildTokenRiskFlags({ mintAuthority, freezeAuthority, supply, isVerified }),
    priceUsd, volume24h, liquidity, fdv, dexUrl,
  };
}
