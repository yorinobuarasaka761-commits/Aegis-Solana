# Aegis Solana — Transaction History Feature Guide

## Table of Contents

1. [What You're Building](#what-youre-building)
2. [Why This Feature Matters](#why-this-feature-matters)
3. [How It Fits Into the Existing App](#how-it-fits-into-the-existing-app)
4. [New Files to Create](#new-files-to-create)
5. [Part 1 — Add Types](#part-1--add-types-libtypests)
6. [Part 2 — Malicious Wallet Database](#part-2--malicious-wallet-database-libmaliciousdbts)
7. [Part 3 — Transaction Fetching](#part-3--transaction-fetching-libtransactionsts)
8. [Part 4 — Wire Into solana.ts](#part-4--wire-into-solanats)
9. [Part 5 — The Component](#part-5--the-component-componentstransactiontimelinetsx)
10. [Part 6 — Add the Tab to page.tsx](#part-6--add-the-tab-to-pagetsx)
11. [Part 7 — RPC Cost Reality Check](#part-7--rpc-cost-reality-check)
12. [Part 8 — Graceful Failure Rules](#part-8--graceful-failure-rules)
13. [Part 9 — Expanding the Malicious Database](#part-9--expanding-the-malicious-database)
14. [Part 10 — Implementation Checklist](#part-10--implementation-checklist)

---

## What You're Building

A transaction history component that fetches the last **25 transactions** for any scanned wallet, parses them into readable activity, cross-references every counterparty address against the Aegis malicious wallet database, and flags dangerous interactions.

This is a focused, scoped implementation. 25 transactions is enough signal without destroying RPC credits.

---

## Why This Feature Matters

### From Snapshot to Behavior

Right now, Aegis evaluates a wallet or token in isolation — what does it look like *right now*. Mint authority status, freeze authority status, current holdings. That's a snapshot, and it's useful, but it's also a commodity. Most Telegram scanner bots already do this.

Transaction history changes what's being measured. Instead of asking "what does this address look like," it asks "what has this address actually *done*." Two wallets can be identical on paper — same balance, same token holdings, zero red flags in a static scan — while one of them has quietly moved funds through a mixer or interacted with a known drainer days earlier. A snapshot scan cannot catch that. Only history can.

### The Five Concrete Improvements

**1. Catches threats invisible to static data**
A wallet with clean current holdings can still have a dirty trail. Behavioral history surfaces risk that authority checks structurally cannot see.

**2. Turns Aegis into a behavioral signal, not just a lookup tool**
This is the direct answer to the "every bot does this" objection. Mint/freeze checks are cheap and common. Wallet-to-wallet threat tracing is expensive and rare — almost no bot does it, because it requires the RPC scoping discipline covered later in this guide.

**3. Feeds the malicious wallet database automatically**
Every scan that surfaces a flagged counterparty is a confirmation data point. The database compounds in value through usage — scanning activity becomes the intelligence pipeline, not a separate manual curation effort.

**4. Replaces a bare score with a reason**
A risk score of 76/100 with no explanation isn't actionable. "This wallet sent funds to a known drainer 4 hours ago" is something a person can immediately act on. This feature is what makes the score legible.

**5. Sets up the token-gated premium tier**
25 transactions free, deeper history reserved for $AEGIS holders. This is the literal product hook behind the utility promised in the whitepaper — it gives the token a functional reason to hold, not just a speculative one.

> **In one line:** this feature moves Aegis from "is this thing flagged" to "has this thing actually behaved badly" — the difference between a checklist and real risk intelligence.

---

## How It Fits Into the Existing App

This adds one new section to wallet scan results — a **Transaction Activity** tab sitting alongside the existing Security Audit and Token Holdings tabs.

```
Wallet Scan Result
├── Risk Gauge (existing)
├── Scan Profile Metadata (existing)
├── Tabs
│   ├── Security Audit (existing)
│   ├── Token Holdings (existing)
│   └── Transaction Activity ← NEW
```

---

## New Files to Create

```
components/
└── TransactionTimeline.tsx     ← New component

lib/
├── transactions.ts             ← New: fetch + parse transactions
└── maliciousDB.ts              ← New: known bad addresses list
```

Modified files:

```
lib/types.ts                    ← Add Transaction types
lib/solana.ts                   ← Call fetchTransactions inside fetchWalletData
app/api/scan/route.ts           ← Already handles wallet — no changes needed
app/page.tsx                    ← Render TransactionTimeline tab
```

---

## Part 1 — Add Types (`lib/types.ts`)

Add these to your existing types file:

```typescript
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
```

Also update `WalletData` to include transactions:

```typescript
export interface WalletData {
  solBalance: number;
  solBalanceUSD: number;
  tokenHoldings: TokenHolding[];
  totalValueUSD: number;
  riskFlags: RiskFlag[];
  transactions: ParsedTransaction[];   // ← ADD THIS
}
```

---

## Part 2 — Malicious Wallet Database (`lib/maliciousDB.ts`)

This is your threat intelligence layer. Start with a hardcoded seed list — you can expand it over time via community reporting.

```typescript
// Known malicious addresses on Solana
// Sources: community reports, on-chain forensics, public drainer lists
// Format: address → label

export const MALICIOUS_WALLETS: Record<string, string> = {
  // Wallet drainers
  "4qQiGDFPbpJNpCVPNBXfS2rMvUMz3smMBJQjUYBfvnVF": "Known Wallet Drainer",
  "BSfD6SHZigAfDWSjzD5Q41jw8LmKwtmjskPH9XW1mrRW": "Known Wallet Drainer",
  "3KPdoGPpBmQL8R5mKATEuQmdJk8uo4XDEVxjjuBqbdkC": "Phishing Contract",

  // Mixer / obfuscation
  "EXnGBBSamqzd3uxEdRLUiYzjJkTwQyorAaFXdfteuGXe": "Mixer Protocol",

  // Known scam deployers
  "7rVAbPFzqaBmydXKg1NTs5wNB9YMVsn8bpwuDLpD9gxp": "Rug Pull Deployer",
};

export function checkMalicious(address: string): {
  isMalicious: boolean;
  label?: string;
} {
  const label = MALICIOUS_WALLETS[address];
  return label
    ? { isMalicious: true, label }
    : { isMalicious: false };
}

// Future: replace hardcoded list with a database fetch
// e.g. check against your own API endpoint or Supabase table
```

> **Note:** The addresses above are placeholders. Before shipping, populate this with real flagged addresses from public sources like the Solana drainer tracker communities or your own on-chain research.

---

## Part 3 — Transaction Fetching (`lib/transactions.ts`)

This is the core of the feature. Keep it scoped to 25 transactions.

```typescript
import { Connection, PublicKey, ParsedTransactionWithMeta } from "@solana/web3.js";
import { ParsedTransaction, TransactionType } from "./types";
import { checkMalicious } from "./maliciousDB";

const LIMIT = 25; // never raise this without RPC credit analysis

export async function fetchWalletTransactions(
  connection: Connection,
  address: string
): Promise<ParsedTransaction[]> {
  const pubkey = new PublicKey(address);

  // Step 1: Get the last 25 transaction signatures
  let signatures;
  try {
    signatures = await connection.getSignaturesForAddress(pubkey, {
      limit: LIMIT,
    });
  } catch (err) {
    console.error("[Aegis] getSignaturesForAddress failed:", err);
    return []; // fail gracefully — never crash the whole scan
  }

  if (!signatures || signatures.length === 0) return [];

  // Step 2: Fetch full transaction details
  // Batch in groups of 10 to avoid hammering RPC
  const results: ParsedTransaction[] = [];
  const chunks = chunkArray(signatures, 10);

  for (const chunk of chunks) {
    const txDetails = await Promise.allSettled(
      chunk.map((sig) =>
        connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        })
      )
    );

    for (let i = 0; i < chunk.length; i++) {
      const sig = chunk[i];
      const detail = txDetails[i];

      if (detail.status === "rejected" || !detail.value) {
        // Skip failed fetches — don't hallucinate data
        continue;
      }

      const tx = detail.value;
      const parsed = parseTx(tx, address, sig.signature, sig.blockTime ?? null);
      if (parsed) results.push(parsed);
    }
  }

  return results;
}

// ── Parse a single transaction ──────────────────────────────────
function parseTx(
  tx: ParsedTransactionWithMeta,
  walletAddress: string,
  signature: string,
  blockTime: number | null
): ParsedTransaction | null {
  try {
    const timestamp = blockTime
      ? new Date(blockTime * 1000).toISOString()
      : new Date().toISOString();

    const status: "SUCCESS" | "FAILED" = tx.meta?.err ? "FAILED" : "SUCCESS";

    // Find the counterparty (the other account involved)
    const accountKeys = tx.transaction.message.accountKeys.map((k) =>
      typeof k === "string" ? k : k.pubkey.toBase58()
    );

    // Remove the wallet itself and system/token programs from the list
    const KNOWN_PROGRAMS = new Set([
      "11111111111111111111111111111111",
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
      "ComputeBudget111111111111111111111111111111",
      "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bC",
      "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", // Jupiter
      "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin", // Serum
    ]);

    const counterparty =
      accountKeys.find(
        (k) => k !== walletAddress && !KNOWN_PROGRAMS.has(k)
      ) ?? null;

    // Determine SOL amount moved
    const preBalance = tx.meta?.preBalances?.[0] ?? 0;
    const postBalance = tx.meta?.postBalances?.[0] ?? 0;
    const amountSOL = Math.abs(preBalance - postBalance) / 1e9;

    // Determine transaction type
    const type = detectTxType(tx, walletAddress, preBalance, postBalance);

    // Check counterparty against malicious DB
    const maliciousCheck = counterparty
      ? checkMalicious(counterparty)
      : { isMalicious: false };

    return {
      signature,
      timestamp,
      type,
      counterparty,
      amountSOL: amountSOL > 0 ? amountSOL : null,
      isMalicious: maliciousCheck.isMalicious,
      maliciousLabel: maliciousCheck.label,
      status,
    };
  } catch {
    return null; // never let a single bad tx crash the whole list
  }
}

// ── Detect what kind of transaction this is ─────────────────────
function detectTxType(
  tx: ParsedTransactionWithMeta,
  walletAddress: string,
  preBalance: number,
  postBalance: number
): TransactionType {
  const instructions = tx.transaction.message.instructions;

  // Check for swap (Jupiter router present)
  const JUPITER = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
  const accountKeys = tx.transaction.message.accountKeys.map((k) =>
    typeof k === "string" ? k : k.pubkey.toBase58()
  );
  if (accountKeys.includes(JUPITER)) return "SWAP";

  // Check for token transfer (parsed instruction type)
  for (const ix of instructions) {
    if ("parsed" in ix) {
      if (ix.parsed?.type === "transfer" || ix.parsed?.type === "transferChecked") {
        // Is SOL moving?
        if (preBalance !== postBalance) {
          return postBalance > preBalance ? "SOL_TRANSFER_IN" : "SOL_TRANSFER_OUT";
        }
        return "TOKEN_TRANSFER";
      }
    }
  }

  // SOL movement without clear instruction parse
  if (preBalance !== postBalance) {
    return postBalance > preBalance ? "SOL_TRANSFER_IN" : "SOL_TRANSFER_OUT";
  }

  // Has instructions but nothing matched
  if (instructions.length > 0) return "CONTRACT_INTERACTION";

  return "UNKNOWN";
}

// ── Utility ─────────────────────────────────────────────────────
function chunkArray<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}
```

---

## Part 4 — Wire Into solana.ts

In your existing `fetchWalletData` function, add the transaction fetch at the end:

```typescript
// At top of lib/solana.ts — add import
import { fetchWalletTransactions } from "./transactions";

// Inside fetchWalletData — add before the return statement:
let transactions: ParsedTransaction[] = [];
try {
  transactions = await fetchWalletTransactions(connection, address);
} catch {
  transactions = []; // never block the scan if tx fetch fails
}

return {
  solBalance,
  solBalanceUSD: 0,
  tokenHoldings: holdings,
  totalValueUSD: 0,
  riskFlags: buildWalletRiskFlags(holdings, transactions), // pass transactions in
  transactions,
};
```

### Update `buildWalletRiskFlags` to factor in malicious interactions

```typescript
function buildWalletRiskFlags(holdings: any[], transactions: any[]): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // Existing holding checks...
  const dangerCount = holdings.filter((h) => h.riskLevel === "DANGER").length;
  const frozenCount = holdings.filter((h) => h.isFrozen).length;
  const unknownCount = holdings.filter((h) => h.name === "Unknown Token").length;

  if (frozenCount > 0) {
    flags.push({
      label: "Frozen Token Accounts",
      severity: "DANGER",
      description: `${frozenCount} token account(s) are frozen.`,
    });
  }

  if (dangerCount > 0) {
    flags.push({
      label: "High-Risk Token Holdings",
      severity: "DANGER",
      description: `Wallet holds ${dangerCount} high-risk token(s).`,
    });
  }

  if (unknownCount > 5) {
    flags.push({
      label: "Many Unknown Token Interactions",
      severity: "WARNING",
      description: `${unknownCount} tokens with no verified metadata.`,
    });
  }

  // NEW — malicious transaction flags
  const maliciousTxs = transactions.filter((t) => t.isMalicious);
  if (maliciousTxs.length > 0) {
    const labels = [...new Set(maliciousTxs.map((t) => t.maliciousLabel))].join(", ");
    flags.push({
      label: "Malicious Wallet Interaction Detected",
      severity: "DANGER",
      description: `This wallet has interacted with ${maliciousTxs.length} flagged address(es): ${labels}. Extreme caution advised.`,
    });
  }

  const failedCount = transactions.filter((t) => t.status === "FAILED").length;
  if (failedCount > 5) {
    flags.push({
      label: "High Failed Transaction Rate",
      severity: "WARNING",
      description: `${failedCount} of the last 25 transactions failed. May indicate bot activity or suspicious patterns.`,
    });
  }

  return flags;
}
```

---

## Part 5 — The Component (`components/TransactionTimeline.tsx`)

```tsx
"use client";
import { ParsedTransaction, TransactionType } from "@/lib/types";

interface Props {
  transactions: ParsedTransaction[];
  walletAddress: string;
}

const TYPE_CONFIG: Record<TransactionType, { label: string; color: string }> = {
  SOL_TRANSFER_IN:      { label: "Received SOL",   color: "#10b981" },
  SOL_TRANSFER_OUT:     { label: "Sent SOL",        color: "#6b7280" },
  TOKEN_TRANSFER:       { label: "Token Transfer",  color: "#a78bfa" },
  SWAP:                 { label: "Swap",            color: "#f59e0b" },
  CONTRACT_INTERACTION: { label: "Contract",        color: "#3b82f6" },
  UNKNOWN:              { label: "Unknown",         color: "#4b5563" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "Just now";
}

function shortSig(sig: string): string {
  return sig.slice(0, 8) + "..." + sig.slice(-6);
}

function shortAddr(addr: string): string {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export default function TransactionTimeline({ transactions, walletAddress }: Props) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-gray-600 text-sm">
        No recent transactions found.
      </div>
    );
  }

  const maliciousCount = transactions.filter((t) => t.isMalicious).length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 uppercase tracking-wider">
          Last {transactions.length} Transactions
        </p>
        {maliciousCount > 0 && (
          <span className="text-xs font-bold px-2 py-1 rounded bg-red-500/10 text-red-400">
            ⚠ {maliciousCount} Malicious Interaction{maliciousCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Transaction list */}
      <div className="space-y-2">
        {transactions.map((tx, i) => {
          const typeConfig = TYPE_CONFIG[tx.type];
          return (
            <div
              key={i}
              className={`p-3 rounded-lg border transition-all ${
                tx.isMalicious
                  ? "bg-red-500/10 border-red-500/40"
                  : tx.status === "FAILED"
                  ? "bg-[#0d0d14] border-white/5 opacity-50"
                  : "bg-[#0d0d14] border-white/5"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Left: type badge + counterparty */}
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="shrink-0 text-xs font-bold px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: typeConfig.color + "22",
                      color: typeConfig.color,
                    }}
                  >
                    {typeConfig.label}
                  </span>
                  <div className="min-w-0">
                    {tx.counterparty ? (
                      <p className="text-xs font-mono text-gray-400 truncate">
                        {tx.isMalicious && (
                          <span className="text-red-400 mr-1">🚨</span>
                        )}
                        {shortAddr(tx.counterparty)}
                        {tx.maliciousLabel && (
                          <span className="ml-2 text-red-400 font-semibold not-italic">
                            · {tx.maliciousLabel}
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-600">No counterparty</p>
                    )}
                    <p className="text-xs font-mono text-gray-600">
                      {shortSig(tx.signature)}
                    </p>
                  </div>
                </div>

                {/* Right: amount + time */}
                <div className="text-right shrink-0">
                  {tx.amountSOL && tx.amountSOL > 0 ? (
                    <p className="text-xs font-semibold text-white">
                      {tx.type === "SOL_TRANSFER_IN" ? "+" : "-"}
                      {tx.amountSOL.toFixed(4)} SOL
                    </p>
                  ) : null}
                  <p className="text-xs text-gray-600">{timeAgo(tx.timestamp)}</p>
                  {tx.status === "FAILED" && (
                    <p className="text-xs text-red-500">Failed</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## Part 6 — Add the Tab to page.tsx

In your existing results section, add the Transaction Activity tab:

```tsx
// Add to your tab state
const [activeTab, setActiveTab] = useState<"audit" | "holdings" | "activity">("audit");

// Tab buttons
<div className="flex gap-1 border-b border-white/5 mb-4">
  {[
    { key: "audit",    label: "Security Audit" },
    { key: "holdings", label: "Token Holdings" },
    { key: "activity", label: "Transaction Activity" },
  ].map((tab) => (
    <button
      key={tab.key}
      onClick={() => setActiveTab(tab.key as any)}
      className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
        activeTab === tab.key
          ? "text-purple-400 border-b-2 border-purple-400"
          : "text-gray-600 hover:text-gray-400"
      }`}
    >
      {tab.label}
    </button>
  ))}
</div>

// Tab content
{activeTab === "activity" && result?.wallet && (
  <TransactionTimeline
    transactions={result.wallet.transactions}
    walletAddress={result.address}
  />
)}
```

---

## Part 7 — RPC Cost Reality Check

| Operation | RPC Calls | Helius Free Tier Impact |
|---|---|---|
| `getSignaturesForAddress` (limit 25) | 1 call | Minimal |
| `getParsedTransaction` × 25 | 25 calls | Low |
| **Total per wallet scan** | **~26 calls** | **Fine for MVP** |

At 100k requests/day on Helius free tier, 26 calls per scan = roughly **3,800 full wallet scans per day** before hitting limits. That's more than enough for MVP.

**Never do this:**
```typescript
// DON'T — fetches 1000 signatures then 1000 tx details = 1001 RPC calls
const sigs = await connection.getSignaturesForAddress(pubkey, { limit: 1000 });
```

**Always do this:**
```typescript
// DO — 25 signatures + 25 details = 26 RPC calls
const sigs = await connection.getSignaturesForAddress(pubkey, { limit: 25 });
```

---

## Part 8 — Graceful Failure Rules

The transaction feature must **never** block or break the main scan. Wrap every call:

```typescript
// In fetchWalletData
let transactions: ParsedTransaction[] = [];
try {
  transactions = await fetchWalletTransactions(connection, address);
} catch (err) {
  console.error("[Aegis] Transaction fetch failed silently:", err);
  // transactions stays as empty array — scan still returns
}
```

In the component, always handle the empty state:
```tsx
if (!result.wallet.transactions || result.wallet.transactions.length === 0) {
  return <p>No transaction data available.</p>;
}
```

---

## Part 9 — Expanding the Malicious Database

The initial hardcoded list is just a seed. The real value is in growing it. Three approaches:

**Option A — Static JSON file**
Move `MALICIOUS_WALLETS` to a `public/malicious.json` file. Update it manually as threats are discovered. No database needed.

**Option B — Supabase table (recommended for v2)**
```typescript
// query a supabase table instead of the hardcoded object
const { data } = await supabase
  .from("malicious_wallets")
  .select("address, label")
  .eq("address", counterpartyAddress)
  .single();
```

**Option C — Community-submitted ($AEGIS token utility)**
$AEGIS holders submit addresses for review. Governance vote approves additions. This is a Phase 3 feature.

---

## Part 10 — Implementation Checklist

- [ ] Types added to `lib/types.ts` — `ParsedTransaction`, `TransactionType`, `transactions` field on `WalletData`
- [ ] `lib/maliciousDB.ts` created with seed addresses
- [ ] `lib/transactions.ts` created — `fetchWalletTransactions` working
- [ ] `lib/solana.ts` updated — calls `fetchWalletTransactions` inside `fetchWalletData`
- [ ] `buildWalletRiskFlags` updated to factor in malicious transaction hits
- [ ] `components/TransactionTimeline.tsx` created
- [ ] `app/page.tsx` updated with three-tab layout
- [ ] Tested on a wallet with known activity — transactions populate correctly
- [ ] Tested on a fresh/empty wallet — empty state shows cleanly
- [ ] Confirmed scan still works if transaction fetch fails
- [ ] RPC call count verified — staying at ~26 calls per scan

---

## What to Tell People

When asked about transaction depth:

> Aegis scans the last 25 transactions and cross-references every counterparty address against a live malicious wallet database. Enough signal. No noise.

That's accurate, honest, and more useful than any bot that just checks mint authority.

---

*Aegis Solana — Transaction History Feature Guide v1.0*
