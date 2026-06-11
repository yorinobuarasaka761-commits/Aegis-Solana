import { NextRequest, NextResponse } from "next/server";
import { isValidPublicKey, detectAddressType, fetchWalletData, fetchTokenData } from "@/lib/solana";
import { calculateRiskScore, getRiskLabel } from "@/lib/riskScoring";
import { ScanResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();
    if (!address || !isValidPublicKey(address.trim())) {
      return NextResponse.json({ error: "Invalid Solana address" }, { status: 400 });
    }

    const trimmed = address.trim();
    const addressType = await detectAddressType(trimmed);

    if (addressType === "unknown" || addressType === "program") {
      return NextResponse.json({
        address: trimmed,
        type: addressType,
        riskScore: 0,
        riskLabel: "LOW",
        scannedAt: new Date().toISOString(),
        error: addressType === "unknown" 
          ? "Address has no on-chain data — may never have been funded." 
          : "This is a program/smart contract, not a wallet or token mint.",
      } as ScanResult);
    }

    const result: ScanResult = {
      address: trimmed,
      type: addressType,
      riskScore: 0,
      riskLabel: "LOW",
      scannedAt: new Date().toISOString(),
    };

    if (addressType === "wallet") {
      const walletData = await fetchWalletData(trimmed);
      result.wallet = walletData;
      result.riskScore = calculateRiskScore(walletData.riskFlags);
      result.riskLabel = getRiskLabel(result.riskScore);
    }

    if (addressType === "token") {
      const tokenData = await fetchTokenData(trimmed);
      result.token = tokenData;
      result.riskScore = calculateRiskScore(tokenData.riskFlags);
      result.riskLabel = getRiskLabel(result.riskScore);
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const errorObj = err as Error;
    console.error("Scan API Error:", errorObj);
    if (errorObj.message?.includes("429")) {
      return NextResponse.json(
        { error: "RPC rate limit hit. Retry in a few seconds." }, 
        { status: 429 }
      );
    }
    return NextResponse.json({ error: errorObj.message || "Scan failed." }, { status: 500 });
  }
}
