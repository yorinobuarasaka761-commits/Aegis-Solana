import { NextResponse } from "next/server";
import { getThreatSummary } from "@/lib/maliciousAddresses";

const SOL_MINT = "So11111111111111111111111111111111111111112";

export const revalidate = 30; // ISR: revalidate every 30 seconds

export async function GET() {
  try {
    const [solData, tpsData, threatSummary] = await Promise.allSettled([
      fetchSolPrice(),
      fetchSolanaTps(),
      Promise.resolve(getThreatSummary()),
    ]);

    const sol = solData.status === "fulfilled" ? solData.value : { price: 0, change24h: 0 };
    const tps = tpsData.status === "fulfilled" ? tpsData.value : 0;
    const threats = threatSummary.status === "fulfilled" ? threatSummary.value : {};

    const totalThreats = Object.values(threats).reduce((a, b) => a + b, 0);

    const items = [
      { label: "SOL PRICE", value: sol.price > 0 ? `$${sol.price.toFixed(2)}` : "—", color: "text-zinc-300" },
      {
        label: "SOL 24H",
        value: sol.change24h !== 0 ? `${sol.change24h > 0 ? "+" : ""}${sol.change24h.toFixed(2)}%` : "—",
        color: sol.change24h >= 0 ? "text-emerald-400" : "text-rose-400",
      },
      { label: "TPS", value: tps > 0 ? tps.toLocaleString() : "—", color: "text-emerald-400 font-bold" },
      { label: "THREAT DATABASE", value: `${totalThreats} ENTRIES`, color: "text-zinc-300" },
      { label: "DRAINERS TRACKED", value: `${threats["drainer"] || 0}`, color: "text-rose-400 font-bold" },
      { label: "MIXERS TRACKED", value: `${threats["mixer"] || 0}`, color: "text-orange-400 font-bold" },
      { label: "MEV BOTS FLAGGED", value: `${threats["mev_bot"] || 0}`, color: "text-cyan-400 font-bold" },
      { label: "SCAM TOKENS", value: `${threats["scam_token"] || 0}`, color: "text-amber-400 font-bold" },
      { label: "MINT AUTHORITY", value: "RENOUNCED", color: "text-[#10b981] font-bold" },
      { label: "FREEZE AUTHORITY", value: "RENOUNCED", color: "text-[#10b981] font-bold" },
      { label: "ACTIVE RPC", value: "MAINNET-BETA", color: "text-emerald-400" },
      { label: "ENGINE", value: "AEGIS/v1.3.0", color: "text-brand-primary font-bold" },
    ];

    return NextResponse.json({
      items,
      raw: { solPrice: sol.price, solChange24h: sol.change24h, tps, totalThreats },
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Ticker API error:", err);
    return NextResponse.json({ items: [], raw: {}, fetchedAt: new Date().toISOString() }, { status: 500 });
  }
}

async function fetchSolPrice(): Promise<{ price: number; change24h: number }> {
  // Try Jupiter first (fast, no rate limits)
  try {
    const r = await fetch(`https://lite-api.jup.ag/price/v2?ids=${SOL_MINT}`, {
      next: { revalidate: 30 },
    } as RequestInit);
    if (r.ok) {
      const d = await r.json();
      const price = parseFloat(d?.data?.[SOL_MINT]?.price ?? "0");
      if (price > 0) {
        // Jupiter doesn't give 24h change, try CoinGecko for that
        const change = await fetchSolChange24h();
        return { price, change24h: change };
      }
    }
  } catch {}

  // Fallback: CoinGecko
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true",
      { next: { revalidate: 60 } } as RequestInit
    );
    if (r.ok) {
      const d = await r.json();
      return {
        price: d?.solana?.usd ?? 0,
        change24h: d?.solana?.usd_24h_change ?? 0,
      };
    }
  } catch {}

  return { price: 0, change24h: 0 };
}

async function fetchSolChange24h(): Promise<number> {
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true",
      { next: { revalidate: 60 } } as RequestInit
    );
    if (r.ok) {
      const d = await r.json();
      return d?.solana?.usd_24h_change ?? 0;
    }
  } catch {}
  return 0;
}

async function fetchSolanaTps(): Promise<number> {
  try {
    const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
    const r = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getRecentPerformanceSamples",
        params: [1],
      }),
    });
    if (r.ok) {
      const d = await r.json();
      const sample = d?.result?.[0];
      if (sample) {
        return Math.round(sample.numTransactions / sample.samplePeriodSecs);
      }
    }
  } catch {}
  return 0;
}
