import { NextRequest, NextResponse } from "next/server";
import { isValidPublicKey, detectAddressType, fetchWalletData, fetchTokenData, fetchRecentActivity, fetchTokenTrades, connection } from "@/lib/solana";
import { calculateRiskScore, getRiskLabel } from "@/lib/riskScoring";
import { ScanResult } from "@/lib/types";
import { checkMalicious } from "@/lib/maliciousDB";
import { getMaliciousAddressInfo } from "@/lib/maliciousAddresses";

export async function POST(req: NextRequest) {
  try {
    const { address, mode } = await req.json();
    if (!address || !isValidPublicKey(address.trim())) {
      return NextResponse.json({ error: "Invalid Solana address" }, { status: 400 });
    }

    const trimmed = address.trim();
    let addressType = await detectAddressType(trimmed);

    // Override unknown address type if the address itself is in our malicious registry
    const maliciousCheck = checkMalicious(trimmed);
    if (addressType === "unknown" && maliciousCheck.isMalicious) {
      const malInfo = getMaliciousAddressInfo(trimmed);
      if (malInfo && malInfo.type === "scam_token") {
        addressType = "token";
      } else {
        addressType = "wallet";
      }
    }

    // Validate mode if user explicitly specified wallet or token
    if (mode === "wallet" && addressType !== "wallet") {
      return NextResponse.json(
        { error: `Address is not a Wallet. Detected as a ${addressType === "unknown" ? "unfunded account" : addressType}.` },
        { status: 400 }
      );
    }
    if (mode === "token" && addressType !== "token") {
      return NextResponse.json(
        { error: `Address is not a Token Mint. Detected as a ${addressType === "unknown" ? "unfunded account" : addressType}.` },
        { status: 400 }
      );
    }

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
      result.recentActivity = await fetchRecentActivity(trimmed, connection);
    }

    if (addressType === "token") {
      const tokenData = await fetchTokenData(trimmed);
      result.token = tokenData;
      result.riskScore = calculateRiskScore(tokenData.riskFlags);
      result.riskLabel = getRiskLabel(result.riskScore);
      // Fetch recent buys from the AMM pool (parallel with no extra cost)
      result.tokenTrades = await fetchTokenTrades(
        trimmed,
        tokenData.symbol,
        tokenData.pairAddress ?? null,
        connection
      );
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

