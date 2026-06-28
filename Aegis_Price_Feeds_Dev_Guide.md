# Aegis Solana — Token Price Feeds Dev Guide

## Table of Contents

1. [What You're Building](#what-youre-building)
2. [Why This Feature Matters](#why-this-feature-matters)
3. [How It Fits Into the Existing App](#how-it-fits-into-the-existing-app)
4. [Part 1 — Update Types](#part-1--update-types-libtypests)
5. [Part 2 — Price Feed Logic](#part-2--price-feed-logic-libpricests)
6. [Part 3 — Wire Into solana.ts](#part-3--wire-into-solanats)
7. [Part 4 — Update WalletResults.tsx](#part-4--update-walletresultstsx)
8. [Part 5 — Update TokenResults.tsx](#part-5--update-tokenresultstsx)
9. [Part 6 — API Route Changes](#part-6--api-route-changes)
10. [Part 7 — Rate Limits & Caching](#part-7--rate-limits--caching)
11. [Part 8 — Graceful Failure Rules](#part-8--graceful-failure-rules)
12. [Part 9 — Implementation Checklist](#part-9--implementation-checklist)

---

## What You're Building

Real USD price data for every token in a scanned wallet, plus the SOL balance converted to USD. Users will see actual dollar values next to every holding instead of raw token amounts with no context.

This is a single API call to Jupiter Price API v6 — free, no key required, covers the vast majority of Solana tokens.

---

## Why This Feature Matters

**Before price feeds:**
```
Wrapped SOL    0.9979
USDC           3,875
BONK           28,275,000
```

**After price feeds:**
```
Wrapped SOL    0.9979        $71.66
USDC           3,875         $3,875.00
BONK           28,275,000    $593.77
─────────────────────────────────────
Total Portfolio Value        $4,540.43
```

The difference is significant for three reasons:

**1. Makes risk flags actionable**
A DANGER token holding means more when you can see the user has $4,000 sitting in it. Raw token amounts don't communicate stakes — dollar values do.

**2. Strengthens the scanner vs bots comparison**
No Telegram bot shows you a full portfolio value breakdown with per-token USD values alongside risk ratings. This is a UI-level differentiator that's immediately visible in screenshots.

**3. Sets up the premium tier**
Total portfolio value is the anchor metric for the institutional monitoring dashboard planned in Q2 2026. The data pipeline starts here.

---

## How It Fits Into the Existing App

Price feeds slot into the existing wallet scan flow with one additional API call after token holdings are fetched. Nothing structural changes — you're just backfilling `valueUSD` fields that are currently returning `0`.

```
fetchWalletData()
  ├── getBalance()                    ← SOL balance (exists)
  ├── getParsedTokenAccountsByOwner() ← Token accounts (exists)
  ├── Jupiter token list enrichment   ← Metadata (exists)
  ├── fetchPrices()                   ← USD prices (NEW)
  └── buildWalletRiskFlags()          ← Risk scoring (exists)
```

For token scans, it's a single SOL price lookup to show the token's current price if it exists on Jupiter.

---

## Part 1 — Update Types (`lib/types.ts`)

No new interfaces needed. Just confirm these fields already exist — they were stubbed as `0` in the original guide:

```typescript
// These already exist in your types — just confirm they're there
export interface WalletData {
  solBalance: number;
  solBalanceUSD: number;      // ← was 0, now will be real
  tokenHoldings: TokenHolding[];
  totalValueUSD: number;      // ← was 0, now will be real
  riskFlags: RiskFlag[];
  transactions: ParsedTransaction[];
}

export interface TokenHolding {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  valueUSD: number;           // ← was 0, now will be real
  riskLevel: "SAFE" | "CAUTION" | "DANGER";
  isFrozen: boolean;
  logoUri?: string;
}

// Add this to TokenData for token scans
export interface TokenData {
  name: string;
  symbol: string;
  decimals: number;
  supply: number;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  isVerified: boolean;
  metadataUri?: string;
  currentPriceUSD: number;    // ← ADD THIS (0 if not found)
  marketCapUSD: number;       // ← ADD THIS (0 if not found)
  riskFlags: RiskFlag[];
}
```

---

## Part 2 — Price Feed Logic (`lib/prices.ts`)

Create this new file. This is the entire price feed layer.

```typescript
// Jupiter Price API v6 — free, no API key required
const JUPITER_PRICE_URL = "https://price.jup.ag/v6/price";

// SOL mint address (for SOL price lookup)
export const SOL_MINT = "So11111111111111111111111111111111111111112";

// ── Fetch prices for multiple mints in one call ──────────────────
export async function fetchPrices(
  mints: string[]
): Promise<Record<string, number>> {
  if (mints.length === 0) return {};

  // Jupiter accepts up to 100 mints per request
  // Split into chunks if needed
  const chunks = chunkArray(mints, 100);
  const allPrices: Record<string, number> = {};

  for (const chunk of chunks) {
    try {
      const ids = chunk.join(",");
      const res = await fetch(`${JUPITER_PRICE_URL}?ids=${ids}`, {
        next: { revalidate: 60 }, // cache for 60 seconds
      });

      if (!res.ok) continue;

      const data = await res.json();

      for (const [mint, info] of Object.entries(data.data as any)) {
        const price = (info as any)?.price ?? 0;
        allPrices[mint] = typeof price === "number" ? price : 0;
      }
    } catch {
      // Fail silently per chunk — don't block the whole scan
      continue;
    }
  }

  return allPrices;
}

// ── Fetch SOL price only ─────────────────────────────────────────
export async function fetchSOLPrice(): Promise<number> {
  try {
    const prices = await fetchPrices([SOL_MINT]);
    return prices[SOL_MINT] ?? 0;
  } catch {
    return 0;
  }
}

// ── Fetch price for a single token (for token scans) ────────────
export async function fetchTokenPrice(mint: string): Promise<number> {
  try {
    const prices = await fetchPrices([mint]);
    return prices[mint] ?? 0;
  } catch {
    return 0;
  }
}

// ── Format USD values for display ───────────────────────────────
export function formatUSD(value: number): string {
  if (value === 0) return "$0.00";
  if (value < 0.01) return "< $0.01";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

// ── Utility ─────────────────────────────────────────────────────
function chunkArray<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}
```

---

## Part 3 — Wire Into solana.ts

### Wallet scan — backfill USD values after holdings are built

In `fetchWalletData`, after the holdings array is built, add the price fetch:

```typescript
// Add import at top of lib/solana.ts
import { fetchPrices, fetchSOLPrice, SOL_MINT } from "./prices";

// Inside fetchWalletData — add AFTER holdings array is built:

// 1. Collect all mint addresses + SOL
const allMints = [SOL_MINT, ...holdings.map((h) => h.mint)];

// 2. Fetch all prices in one call
let prices: Record<string, number> = {};
try {
  prices = await fetchPrices(allMints);
} catch {
  prices = {}; // fail gracefully
}

// 3. Backfill USD values on each holding
const solPrice = prices[SOL_MINT] ?? 0;
const enrichedHoldings = holdings.map((h) => ({
  ...h,
  valueUSD: (prices[h.mint] ?? 0) * h.balance,
}));

// 4. Calculate totals
const solBalanceUSD = solBalance * solPrice;
const totalValueUSD =
  solBalanceUSD +
  enrichedHoldings.reduce((sum, h) => sum + h.valueUSD, 0);

// 5. Return with real values
return {
  solBalance,
  solBalanceUSD,
  tokenHoldings: enrichedHoldings,  // use enriched, not original
  totalValueUSD,
  riskFlags: buildWalletRiskFlags(enrichedHoldings, transactions),
  transactions,
};
```

### Token scan — add current price and market cap

In `fetchTokenData`, add at the end before the return:

```typescript
// Add import at top
import { fetchTokenPrice } from "./prices";

// Inside fetchTokenData — add before return:
let currentPriceUSD = 0;
let marketCapUSD = 0;
try {
  currentPriceUSD = await fetchTokenPrice(address);
  marketCapUSD = currentPriceUSD * supply;
} catch {
  currentPriceUSD = 0;
  marketCapUSD = 0;
}

return {
  name,
  symbol,
  decimals,
  supply,
  mintAuthority,
  freezeAuthority,
  isVerified,
  metadataUri,
  currentPriceUSD,
  marketCapUSD,
  riskFlags,
};
```

---

## Part 4 — Update WalletResults.tsx

Add total portfolio value to the summary cards and USD values to each token holding row.

### Summary cards update

```tsx
// Replace or update your existing StatCard section:
<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
  <StatCard
    label="Total Portfolio"
    value={formatUSD(data.totalValueUSD)}
    highlight
  />
  <StatCard
    label="SOL Balance"
    value={`${data.solBalance.toFixed(4)} SOL`}
    sub={formatUSD(data.solBalanceUSD)}
  />
  <StatCard
    label="Token Holdings"
    value={`${data.tokenHoldings.length}`}
  />
</div>
```

### Token holding row update

```tsx
// Inside your holdings map — update the right side:
<div className="flex items-center gap-3">
  <div className="text-right">
    <p className="text-sm text-gray-300">
      {token.balance.toLocaleString()}
    </p>
    <p className="text-xs text-gray-500">
      {token.valueUSD > 0 ? formatUSD(token.valueUSD) : "—"}
    </p>
  </div>
  <span
    className="text-xs font-bold px-2 py-1 rounded"
    style={{ backgroundColor: c.bg, color: c.text }}
  >
    {token.riskLevel}
  </span>
</div>
```

### Updated StatCard component

```tsx
function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-4 border ${
        highlight
          ? "bg-purple-900/20 border-purple-500/30"
          : "bg-[#0d0d14] border-white/5"
      }`}
    >
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p
        className={`text-lg font-bold ${
          highlight ? "text-purple-300" : "text-white"
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}
```

### Import formatUSD in the component

```tsx
import { formatUSD } from "@/lib/prices";
```

---

## Part 5 — Update TokenResults.tsx

Show current price and market cap for token scans.

```tsx
// Add to your existing stat cards grid:
<div className="grid grid-cols-2 gap-4">
  <StatCard label="Total Supply" value={data.supply.toLocaleString()} />
  <StatCard label="Decimals" value={String(data.decimals)} />
  <StatCard
    label="Current Price"
    value={data.currentPriceUSD > 0 ? formatUSD(data.currentPriceUSD) : "Not Listed"}
    danger={false}
  />
  <StatCard
    label="Market Cap"
    value={data.marketCapUSD > 0 ? formatUSD(data.marketCapUSD) : "Unknown"}
    danger={false}
  />
  <StatCard
    label="Mint Authority"
    value={data.mintAuthority ? "Active ⚠️" : "Renounced ✓"}
    danger={!!data.mintAuthority}
  />
  <StatCard
    label="Freeze Authority"
    value={data.freezeAuthority ? "Active ⚠️" : "Renounced ✓"}
    danger={!!data.freezeAuthority}
  />
</div>
```

### Import formatUSD

```tsx
import { formatUSD } from "@/lib/prices";
```

---

## Part 6 — API Route Changes

No structural changes needed to `app/api/scan/route.ts`. The price fetch happens inside `fetchWalletData` and `fetchTokenData` — the route just returns whatever those functions return, and they'll now have real USD values populated.

The only thing to confirm is that your route response isn't stripping or ignoring the new fields. If you have any response transformation logic, make sure `solBalanceUSD`, `totalValueUSD`, `valueUSD`, `currentPriceUSD`, and `marketCapUSD` are passing through.

---

## Part 7 — Rate Limits & Caching

Jupiter Price API v6 is free with no API key but has rate limits. Here's how to stay safe:

### Request volume

| Scenario | Jupiter API Calls |
|---|---|
| Wallet scan (50 tokens) | 1 call (all mints batched) |
| Token scan | 1 call |
| 100 scans/hour | 100 calls |

Jupiter's free tier handles this comfortably. The batching in `fetchPrices` means even a wallet with 50 tokens is still one API call.

### Next.js caching

The `next: { revalidate: 60 }` in the fetch call caches prices for 60 seconds per unique mint set. This means if two users scan the same wallet within a minute, the second scan doesn't hit Jupiter at all.

For token scans you can cache longer:

```typescript
// Token prices change slower than wallet portfolio values
const res = await fetch(`${JUPITER_PRICE_URL}?ids=${ids}`, {
  next: { revalidate: 30 }, // 30 seconds for wallet scans
});

// For individual token scans
const res = await fetch(`${JUPITER_PRICE_URL}?ids=${mint}`, {
  next: { revalidate: 120 }, // 2 minutes for single token price
});
```

### What to do if Jupiter is down

Jupiter has occasional downtime. Always fail gracefully:

```typescript
// Never let a price failure kill the scan
try {
  prices = await fetchPrices(allMints);
} catch {
  prices = {};
  // Scan still returns — just with $0.00 values
}
```

Show a small indicator in the UI when prices couldn't load:

```tsx
{data.totalValueUSD === 0 && data.tokenHoldings.length > 0 && (
  <p className="text-xs text-amber-500">
    ⚠ Price data temporarily unavailable
  </p>
)}
```

---

## Part 8 — Graceful Failure Rules

Price feeds must never block or break the core scan. Three rules:

**Rule 1 — Always default to 0, never undefined**
```typescript
const price = prices[mint] ?? 0; // not prices[mint] alone
const valueUSD = price * balance; // 0 * anything = 0, never NaN
```

**Rule 2 — Wrap every fetch in try/catch**
```typescript
try {
  prices = await fetchPrices(mints);
} catch {
  prices = {};
}
```

**Rule 3 — Display "—" not "$0.00" for genuinely unlisted tokens**
```tsx
// In the UI — distinguish between "price is zero" and "price unknown"
{token.valueUSD > 0 ? formatUSD(token.valueUSD) : "—"}
```

This matters because a token with a real $0.00 value and a token with no price data are different things. Show a dash for unknown, not a misleading zero.

---

## Part 9 — Implementation Checklist

- [ ] `lib/prices.ts` created — `fetchPrices`, `fetchSOLPrice`, `fetchTokenPrice`, `formatUSD` all exported
- [ ] `lib/types.ts` updated — `currentPriceUSD` and `marketCapUSD` added to `TokenData`
- [ ] `lib/solana.ts` updated — `fetchPrices` called inside `fetchWalletData` after holdings built
- [ ] `lib/solana.ts` updated — `fetchTokenPrice` called inside `fetchTokenData`
- [ ] `solBalanceUSD` and `totalValueUSD` are real values, not 0
- [ ] Each `TokenHolding.valueUSD` is populated correctly
- [ ] `WalletResults.tsx` updated — total portfolio card visible, USD shown per holding
- [ ] `TokenResults.tsx` updated — current price and market cap cards visible
- [ ] `formatUSD` imported and used in both components
- [ ] "—" shown for tokens with no price data (not "$0.00")
- [ ] Amber warning shown when all prices are 0 but holdings exist
- [ ] Tested on a wallet with known holdings — USD values match Jupiter
- [ ] Tested on a token with no Jupiter listing — shows "Not Listed" cleanly
- [ ] Confirmed scan still completes if Jupiter API is down

---

## What This Unlocks After Implementation

Once price feeds are live, two things open up immediately:

**1. Risk flags can factor in value**
A wallet holding $50,000 in a DANGER-rated token is a different risk profile than one holding $2. You can add a new flag:

```typescript
const highValueDanger = enrichedHoldings.filter(
  (h) => h.riskLevel === "DANGER" && h.valueUSD > 1000
);
if (highValueDanger.length > 0) {
  flags.push({
    label: "High-Value Dangerous Holdings",
    severity: "DANGER",
    description: `Wallet holds ${formatUSD(
      highValueDanger.reduce((s, h) => s + h.valueUSD, 0)
    )} in high-risk tokens.`,
  });
}
```

**2. Screenshots become significantly more impressive**
A UI showing "$4,540 total portfolio · $593 in DANGER-rated tokens" is a screenshot people share. Raw token amounts are not.

---

*Aegis Solana — Token Price Feeds Dev Guide v1.0*
