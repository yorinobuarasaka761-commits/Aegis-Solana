import { Connection, PublicKey, ParsedTransactionWithMeta } from "@solana/web3.js";
import { ParsedTransaction, TransactionType } from "./types";
import { checkMalicious, addMaliciousAddress } from "./maliciousDB";

const LIMIT = 25; // never raise this without RPC credit analysis

export async function fetchWalletTransactions(
  connection: Connection,
  address: string
): Promise<ParsedTransaction[]> {
  const pubkey = new PublicKey(address);

  // Step 1: Get the last 25 transaction signatures with retry logic
  let signatures;
  let retries = 3;
  let delayMs = 500;
  
  while (retries > 0) {
    try {
      signatures = await connection.getSignaturesForAddress(pubkey, {
        limit: LIMIT,
      });
      break;
    } catch (err: any) {
      const isRateLimit = err.message?.includes("429") || err.message?.includes("Too many requests") || err.code === 429;
      if (isRateLimit && retries > 1) {
        retries--;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2;
      } else {
        console.error("[Aegis] getSignaturesForAddress failed:", err);
        return []; // fail gracefully — never crash the whole scan
      }
    }
  }

  if (!signatures || signatures.length === 0) return [];

  // Step 2: Fetch full transaction details
  let results: ParsedTransaction[] = [];
  try {
    const sigStrings = signatures.map((s) => s.signature);
    
    // Retry with backoff for 429s
    let txs: any[] = [];
    for (const sig of sigStrings) {
      let tx = null;
      let retries = 3;
      let delayMs = 500;
      while (retries > 0) {
        try {
          tx = await connection.getParsedTransaction(sig, {
            maxSupportedTransactionVersion: 0,
          });
          break;
        } catch (err: any) {
          const isRateLimit = err.message?.includes("429") || err.message?.includes("Too many requests") || err.code === 429;
          if (isRateLimit && retries > 1) {
            retries--;
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            delayMs *= 2;
          } else {
            console.error(`Failed to fetch parsed tx ${sig}:`, err.message);
            break;
          }
        }
      }
      if (tx) {
        txs.push(tx);
      } else {
        txs.push(null); // Keep array aligned with signatures
      }
      await new Promise((r) => setTimeout(r, 100)); // 100ms delay between each tx
    }

    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i];
      if (!tx) continue;
      const sig = signatures[i];
      const parsed = parseTx(tx, address, sig.signature, sig.blockTime ?? null);
      if (parsed) results.push(parsed);
    }
  } catch (err) {
    console.error("[Aegis] getParsedTransactions failed after retries:", err);
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

    if (maliciousCheck.isMalicious) {
      addMaliciousAddress(
        walletAddress,
        `Auto-flagged: Interacted with ${maliciousCheck.label || "Flagged Threat"}`
      );
    }

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
  const JUPITER = "JUP6LkbZbjS1ingcZ3tLUZoi5QNyVTaV4"; // JUPITER Program ID or routing ID
  // Wait, let's also check for general Jupiter router
  const JUP_MAIN = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
  const accountKeys = tx.transaction.message.accountKeys.map((k) =>
    typeof k === "string" ? k : k.pubkey.toBase58()
  );
  if (accountKeys.includes(JUPITER) || accountKeys.includes(JUP_MAIN)) return "SWAP";

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
