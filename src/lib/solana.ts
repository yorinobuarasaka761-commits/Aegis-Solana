import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";
import { AddressType, WalletData, TokenData, TokenHolding, MaliciousInteraction, TransactionActivity, TokenTrade } from "./types";
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

  return {
    name, symbol,
    decimals: mint.decimals,
    supply, mintAuthority, freezeAuthority, updateAuthority,
    isVerified, metadataUri,
    riskFlags: buildTokenRiskFlags({ mintAuthority, freezeAuthority, updateAuthority, supply, isVerified }),
    priceUsd, volume24h, liquidity, fdv, dexUrl,
    pairAddress: pairAddress || undefined,
  };
}

export async function getUpdateAuthority(
  mintAddress: string,
  connection: Connection
): Promise<string | null> {
  try {
    const mint = new PublicKey(mintAddress);
    const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28ej1Al56LdhWYFCG6G4jrh5CjCwh5");
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

export async function fetchRecentActivity(
  address: string,
  connection: Connection
): Promise<TransactionActivity[]> {
  const pubkey = new PublicKey(address);
  const activities: TransactionActivity[] = [];

  try {
    const signatures = await connection.getSignaturesForAddress(pubkey, { limit: 10 });
    if (!signatures || signatures.length === 0) return [];

    const sigStrings = signatures.map((s) => s.signature);
    const txs = await connection.getParsedTransactions(sigStrings, { maxSupportedTransactionVersion: 0 });

    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i];
      if (!tx) continue;
      
      const sigInfo = signatures[i];
      const signature = sigInfo.signature;
      const timestamp = sigInfo.blockTime
        ? new Date(sigInfo.blockTime * 1000).toLocaleString()
        : "Unknown time";
      const status = tx.meta?.err ? "failed" : "success";

      let type: TransactionActivity["type"] = "contract_interaction";
      let typeName = "Contract Interaction";
      let amount: string | undefined;

      const accountKeys = tx.transaction.message.accountKeys;
      const myIndex = accountKeys.findIndex((ak) => {
        const pk = ak.pubkey || ak;
        return pk && typeof pk.toBase58 === "function" && pk.toBase58() === address;
      });

      if (myIndex !== -1 && tx.meta) {
        const preSol = tx.meta.preBalances[myIndex];
        const postSol = tx.meta.postBalances[myIndex];
        const fee = tx.meta.fee;
        const solChange = (postSol - preSol) / LAMPORTS_PER_SOL;
        const feeAdjustedChange = myIndex === 0 ? solChange + (fee / LAMPORTS_PER_SOL) : solChange;

        const tokenChanges: Array<{ mint: string; change: number; symbol?: string }> = [];
        const preToken = tx.meta.preTokenBalances ?? [];
        const postToken = tx.meta.postTokenBalances ?? [];

        const allMints = Array.from(new Set([
          ...preToken.map((t) => t.mint),
          ...postToken.map((t) => t.mint),
        ]));

        for (const mint of allMints) {
          const myPre = preToken.find((t) => t.owner === address && t.mint === mint);
          const myPost = postToken.find((t) => t.owner === address && t.mint === mint);
          const preAmt = myPre?.uiTokenAmount.uiAmount ?? 0;
          const postAmt = myPost?.uiTokenAmount.uiAmount ?? 0;
          const diff = postAmt - preAmt;
          if (Math.abs(diff) > 0.000001) {
            const WELL_KNOWN_SYMBOLS: Record<string, string> = {
              "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
              "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT",
              "So11111111111111111111111111111111111111112": "SOL",
              "DezXAZ8z7PnrFcPybznJHzRmjJ89qYYea1R8k1tKBpfa": "BONK",
            };
            const symbol = WELL_KNOWN_SYMBOLS[mint] ?? `${mint.slice(0, 4)}...${mint.slice(-4)}`;
            tokenChanges.push({ mint, change: diff, symbol });
          }
        }

        if (tokenChanges.length >= 2 || (Math.abs(feeAdjustedChange) > 0.001 && tokenChanges.length >= 1)) {
          type = "swap";
          typeName = "Token Swap";
          
          let fromText = "";
          let toText = "";

          if (tokenChanges.length >= 2) {
            const dec = tokenChanges.find((tc) => tc.change < 0);
            const inc = tokenChanges.find((tc) => tc.change > 0);
            if (dec && inc) {
              fromText = `${Math.abs(dec.change).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${dec.symbol || "Token"}`;
              toText = `${inc.change.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${inc.symbol || "Token"}`;
            }
          } else if (tokenChanges.length === 1 && Math.abs(feeAdjustedChange) > 0.001) {
            const tc = tokenChanges[0];
            if (feeAdjustedChange < 0 && tc.change > 0) {
              fromText = `${Math.abs(feeAdjustedChange).toFixed(4)} SOL`;
              toText = `${tc.change.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${tc.symbol || "Token"}`;
            } else if (feeAdjustedChange > 0 && tc.change < 0) {
              fromText = `${Math.abs(tc.change).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${tc.symbol || "Token"}`;
              toText = `${feeAdjustedChange.toFixed(4)} SOL`;
            }
          }

          if (fromText && toText) {
            amount = `${fromText} → ${toText}`;
          } else {
            amount = "Swap Executed";
          }
        } else if (tokenChanges.length === 1) {
          const tc = tokenChanges[0];
          if (tc.change > 0) {
            type = "transfer_in";
            typeName = "Token Received";
            amount = `+${tc.change.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${tc.symbol || "Token"}`;
          } else {
            type = "transfer_out";
            typeName = "Token Sent";
            amount = `-${Math.abs(tc.change).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${tc.symbol || "Token"}`;
          }
        } else if (Math.abs(feeAdjustedChange) > 0.001) {
          if (feeAdjustedChange > 0) {
            type = "transfer_in";
            typeName = "SOL Received";
            amount = `+${feeAdjustedChange.toFixed(4)} SOL`;
          } else {
            type = "transfer_out";
            typeName = "SOL Sent";
            amount = `-${Math.abs(feeAdjustedChange).toFixed(4)} SOL`;
          }
        }
      }

      if (type === "contract_interaction") {
        const programIds = tx.transaction.message.instructions.map((i) => {
          const pid = i.programId || (i as { programId?: PublicKey }).programId;
          return pid ? pid.toBase58() : "";
        }).filter(Boolean);

        const knownPrograms: Record<string, string> = {
          "JUP6Lgp5gZXrNrTRN7QMw45zOB66g1B36t1wDLauC3o": "Jupiter Swap",
          "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "Raydium V4 Swap",
          "routehkwwNzjRCn9y5tTE4z2nC79B2KxV8mR4wD3m2": "Raydium Router",
          "Orcert2EB7a1b4W1FwJEDmeZaEsKhTczbd424B2CgBq": "Orca Swap",
          "6EF8rrecthR5Dkzonr17F5vkR6qiYqrqbGvbuJ5PE9JY": "pump.fun Interaction",
        };

        let foundKnown = false;
        for (const pid of programIds) {
          if (knownPrograms[pid]) {
            typeName = knownPrograms[pid];
            if (typeName.includes("Swap")) {
              type = "swap";
            }
            foundKnown = true;
            break;
          }
        }

        if (!foundKnown && programIds.length > 0) {
          const pid = programIds[0];
          typeName = `Interact with ${pid.slice(0, 6)}...${pid.slice(-4)}`;
        }
      }

      activities.push({
        signature,
        timestamp,
        type,
        typeName,
        amount,
        status,
      });
    }
  } catch (err) {
    console.error("fetchRecentActivity failed:", err);
  }

  return activities;
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
            tokenTransfers?: HeliusTokenTransfer[];
            nativeTransfers?: HeliusNativeTransfer[];
          }

          const heliusTxs: HeliusTx[] = await r.json();

          for (const htx of heliusTxs) {
            if (trades.length >= 10) break;
            if (htx.type !== "SWAP" || htx.transactionError) continue;

            // Find the entry where our token was RECEIVED by a non-pool account
            const tokenIn = htx.tokenTransfers?.find(
              (tt) =>
                tt.mint === tokenAddress &&
                tt.tokenAmount > 0 &&
                tt.toUserAccount &&
                tt.toUserAccount !== pairAddress
            );
            if (!tokenIn) continue;

            const buyerAddress = tokenIn.toUserAccount;
            const tokenAmount = tokenIn.tokenAmount;

            // Calculate net SOL spent by the buyer (sent minus any received back)
            const solSent = htx.nativeTransfers
              ?.filter((nt) => nt.fromUserAccount === buyerAddress)
              .reduce((s, nt) => s + nt.amount, 0) ?? 0;
            const solBack = htx.nativeTransfers
              ?.filter((nt) => nt.toUserAccount === buyerAddress)
              .reduce((s, nt) => s + nt.amount, 0) ?? 0;
            const netLamports = solSent - solBack;

            // Require at least 0.0005 SOL net spend (filters noise / fee-only txs)
            if (netLamports < 500_000) continue;

            // Pretty-format the DEX name for display
            const dexName = htx.source
              ? htx.source.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
              : "Unknown DEX";

            trades.push({
              signature: htx.signature,
              timestamp: new Date(htx.timestamp * 1000).toLocaleString(),
              buyer: buyerAddress,
              tokenAmount,
              tokenSymbol,
              solAmount: netLamports / LAMPORTS_PER_SOL,
              dexName,
              type: "buy",
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
  // Requires a pool address to know which accounts to scan
  if (!pairAddress) return trades;

  try {
    const poolPubkey = new PublicKey(pairAddress);
    const signatures = await connection.getSignaturesForAddress(poolPubkey, { limit: 80 });
    if (!signatures || signatures.length === 0) return trades;

    const sigStrings = signatures.map((s) => s.signature);
    const txs = await connection.getParsedTransactions(sigStrings, {
      maxSupportedTransactionVersion: 0,
    });

    for (let i = 0; i < txs.length && trades.length < 10; i++) {
      const tx = txs[i];
      if (!tx || tx.meta?.err) continue;

      const sigInfo = signatures[i];
      const timestamp = sigInfo.blockTime
        ? new Date(sigInfo.blockTime * 1000).toLocaleString()
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

      const accountKeys = tx.transaction.message.accountKeys.map((ak) => {
        const pk = (ak as { pubkey?: PublicKey }).pubkey ?? (ak as unknown as PublicKey);
        return pk?.toBase58?.() ?? "";
      });

      // Buyer = account that GAINED the token AND spent SOL (negative SOL delta)
      let buyerAddress = "";
      let tokenReceived = 0;
      let solSpent: number | undefined;

      for (const [owner, tokenDelta] of ownerDelta) {
        if (tokenDelta <= 0.000001) continue;
        const ownerIdx = accountKeys.indexOf(owner);
        if (ownerIdx === -1 || !tx.meta) continue;
        const solDelta =
          (tx.meta.postBalances[ownerIdx] - tx.meta.preBalances[ownerIdx]) / LAMPORTS_PER_SOL;
        if (solDelta < -0.0005 && tokenDelta > tokenReceived) {
          tokenReceived = tokenDelta;
          buyerAddress = owner;
          solSpent = Math.abs(solDelta);
        }
      }

      if (!buyerAddress || tokenReceived <= 0) continue;

      trades.push({
        signature: sigInfo.signature,
        timestamp,
        buyer: buyerAddress,
        tokenAmount: tokenReceived,
        tokenSymbol,
        solAmount: solSpent,
        type: "buy",
      });
    }
  } catch (err) {
    console.error("fetchTokenTrades RPC fallback failed:", err);
  }

  return trades;
}
