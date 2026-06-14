import { NextRequest, NextResponse } from "next/server";
import { isValidPublicKey, fetchTokenTrades, connection } from "@/lib/solana";
import { TokenTrade } from "@/lib/types";

/**
 * POST /api/trades
 * Lightweight endpoint that ONLY fetches recent buy trades for a token.
 * Used for auto-polling (every 30s) without re-running the full security scan.
 *
 * Body: { tokenAddress: string, pairAddress?: string, tokenSymbol?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { tokenAddress, pairAddress, tokenSymbol } = await req.json();

    if (!tokenAddress || !isValidPublicKey(tokenAddress.trim())) {
      return NextResponse.json({ error: "Invalid token address" }, { status: 400 });
    }

    const trades: TokenTrade[] = await fetchTokenTrades(
      tokenAddress.trim(),
      tokenSymbol || "TOKEN",
      pairAddress || null,
      connection
    );

    return NextResponse.json({
      trades,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errMsg = (err as Error).message || "Failed to fetch trades";
    console.error("Trades API error:", errMsg);
    if (errMsg.includes("429")) {
      return NextResponse.json({ error: "Rate limited. Retry in a moment." }, { status: 429 });
    }
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
