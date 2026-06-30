const JUPITER_PRICE_URL = "https://api.jup.ag/price/v3";

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
      // Cache wallet scans (multiple mints) for 30 seconds; single scans for 120 seconds
      const revalidate = chunk.length === 1 ? 120 : 30;
      const res = await fetch(`${JUPITER_PRICE_URL}?ids=${ids}`, {
        next: { revalidate },
      });

      if (!res.ok) continue;

      const data = (await res.json()) as Record<
        string,
        { usdPrice?: number } | null | undefined
      >;

      for (const [mint, info] of Object.entries(data)) {
        const price = info?.usdPrice ?? 0;
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

// ── Format USD price (for small token prices) ────────────────────
export function formatUSDPrice(value: number): string {
  if (value === 0) return "$0.00";
  if (value >= 1) {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  const str = value.toString();
  let leadingZeros = 0;
  if (str.includes("e-")) {
    const exponent = parseInt(str.split("e-")[1], 10);
    leadingZeros = exponent - 1;
  } else {
    const match = str.match(/^0\.(0+)/);
    leadingZeros = match ? match[1].length : 0;
  }
  
  const precision = Math.max(6, leadingZeros + 4);
  const formatted = value.toFixed(precision);
  
  let trimmed = formatted.replace(/0+$/, "");
  if (trimmed.endsWith(".")) {
    trimmed += "00";
  } else if (trimmed.split(".")[1]?.length === 1) {
    trimmed += "0";
  }
  
  return `$${trimmed}`;
}

// ── Utility ─────────────────────────────────────────────────────
function chunkArray<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}
