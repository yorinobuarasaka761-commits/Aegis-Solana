import { RiskFlag, TokenHolding, MaliciousInteraction, ParsedTransaction } from "./types";
import { checkMalicious } from "./maliciousDB";
import { getMaliciousAddressInfo, THREAT_CATEGORIES } from "./maliciousAddresses";

export function calculateRiskScore(flags: RiskFlag[]): number {
  let score = 0;
  // If the scanned wallet itself is flagged as malicious, immediately trigger a critical/maximum score
  if (flags.some(f => f.label === "Flagged Malicious Wallet Address")) {
    return 100;
  }
  for (const flag of flags) {
    if (flag.severity === "DANGER") score += 30;
    if (flag.severity === "WARNING") score += 15;
    if (flag.severity === "INFO" && flag.label.includes("Renounced")) score -= 10;
  }
  return Math.max(0, Math.min(100, score));
}

export function getRiskLabel(score: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (score <= 20) return "LOW";
  if (score <= 50) return "MEDIUM";
  if (score <= 75) return "HIGH";
  return "CRITICAL";
}

export function buildWalletRiskFlags(
  holdings: TokenHolding[],
  recentInteractions: MaliciousInteraction[] = [],
  transactions: ParsedTransaction[] = [],
  address?: string
): RiskFlag[] {
  const flags: RiskFlag[] = [];

  if (address) {
    const maliciousCheck = checkMalicious(address);
    if (maliciousCheck.isMalicious) {
      const malInfo = getMaliciousAddressInfo(address);
      flags.push({
        label: "Flagged Malicious Wallet Address",
        severity: "DANGER",
        description: `This scanned wallet itself is flagged as a known threat: ${maliciousCheck.label ?? "Malicious Entity"}. Do NOT interact or send funds.`,
      });
      if (malInfo) {
        flags.push({
          label: `Registry Flagged: ${THREAT_CATEGORIES[malInfo.type]?.label || "Malicious Activity"}`,
          severity: "DANGER",
          description: malInfo.description || "Address flagged for malicious activity on Solana.",
        });
      }
    }
  }
  
  const hasFrozen = holdings.some((h) => h.isFrozen);
  if (hasFrozen) {
    flags.push({
      label: "Frozen token account in wallet",
      severity: "DANGER",
      description: "Wallet contains one or more frozen token accounts.",
    });
  }

  const unknownTokensCount = holdings.filter((h) => h.name === "Unknown Token" || h.symbol === "???").length;
  if (unknownTokensCount >= 5) {
    flags.push({
      label: "5+ unknown tokens in wallet",
      severity: "WARNING",
      description: "Wallet has an unusually high number of unverified/unknown tokens.",
    });
  }

  // Malicious interactions flags
  if (recentInteractions.length > 0) {
    const mixerCount = recentInteractions.filter((i) => i.type === "mixer").length;
    const drainerCount = recentInteractions.filter((i) => i.type === "drainer" || i.type === "attacker").length;
    const phishingCount = recentInteractions.filter((i) => i.type === "phishing").length;
    const scamCount = recentInteractions.filter((i) => i.type === "scam_token").length;
    const mevCount = recentInteractions.filter((i) => i.type === "mev_bot").length;
    const sanctionedCount = recentInteractions.filter((i) => i.type === "sanctioned").length;

    if (drainerCount > 0) {
      flags.push({
        label: "Interacted with Wallet Drainer/Attacker",
        severity: "DANGER",
        description: `Detected recent interaction(s) with ${drainerCount} known wallet drainer or malicious attacker address.`,
      });
    }

    if (mixerCount > 0) {
      flags.push({
        label: "Mixer/Laundering Activity",
        severity: "DANGER",
        description: `Wallet interacted with ${mixerCount} known privacy mixer or high-risk no-KYC exchange.`,
      });
    }

    if (phishingCount > 0) {
      flags.push({
        label: "Phishing Operation Interaction",
        severity: "DANGER",
        description: `Wallet interacted with ${phishingCount} known phishing operation(s). Check recent approvals immediately.`,
      });
    }

    if (scamCount > 0) {
      flags.push({
        label: "Holds scam/phishing tokens",
        severity: "DANGER",
        description: `Wallet holds ${scamCount} known scam or phishing token(s). Do NOT visit websites listed in token names.`,
      });
    }

    if (sanctionedCount > 0) {
      flags.push({
        label: "OFAC/Sanctioned Entity Contact",
        severity: "DANGER",
        description: `Wallet transacted with ${sanctionedCount} sanctioned or state-linked address(es). May have legal implications.`,
      });
    }

    if (mevCount > 0) {
      flags.push({
        label: "MEV Bot Interaction",
        severity: "WARNING",
        description: `Wallet was targeted by ${mevCount} known MEV/sandwich bot(s). Consider using MEV protection for future swaps.`,
      });
    }
  }

  // NEW — malicious transaction flags from dev guide
  const maliciousTxs = transactions.filter((t) => t.isMalicious);
  if (maliciousTxs.length > 0) {
    const labels = [...new Set(maliciousTxs.map((t) => t.maliciousLabel))].filter(Boolean).join(", ");
    // Avoid duplicate flags if we already caught it in recentInteractions
    if (!flags.some(f => f.label === "Malicious Wallet Interaction Detected" || f.label === "Interacted with Wallet Drainer/Attacker")) {
      flags.push({
        label: "Malicious Wallet Interaction Detected",
        severity: "DANGER",
        description: `This wallet has interacted with ${maliciousTxs.length} flagged address(es): ${labels}. Extreme caution advised.`,
      });
    }
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

export function assessTokenRisk(isFrozen: boolean, meta: unknown): "SAFE" | "CAUTION" | "DANGER" {
  if (isFrozen) return "DANGER";
  if (!meta) return "CAUTION";
  return "SAFE";
}

export function buildTokenRiskFlags({
  mintAuthority,
  freezeAuthority,
  updateAuthority,
  supply,
  isVerified,
}: {
  mintAuthority: string | null;
  freezeAuthority: string | null;
  updateAuthority: string | null;
  supply: number;
  isVerified: boolean;
}): RiskFlag[] {
  const flags: RiskFlag[] = [];

  if (mintAuthority) {
    flags.push({
      label: isVerified ? "Mint authority active (Audited)" : "Mint authority still active",
      severity: isVerified ? "INFO" : "DANGER",
      description: isVerified
        ? "Mint authority is active, but the token is verified and audited by Jupiter."
        : "The creator can still mint more tokens, diluting supply.",
    });
  } else {
    flags.push({
      label: "Mint authority is inactive",
      severity: "INFO",
      description: "Token supply is fixed.",
    });
  }

  if (freezeAuthority) {
    flags.push({
      label: isVerified ? "Freeze authority active (Audited)" : "Freeze authority still active",
      severity: isVerified ? "INFO" : "DANGER",
      description: isVerified
        ? "Freeze authority is active, but the token is verified and audited by Jupiter."
        : "The creator can freeze holders' tokens.",
    });
  } else {
    flags.push({
      label: "Freeze authority is inactive",
      severity: "INFO",
      description: "Token balances cannot be frozen.",
    });
  }

  if (updateAuthority && updateAuthority !== "None") {
    flags.push({
      label: "Active Update Authority",
      severity: "WARNING",
      description: "Token metadata (name, symbol, logo) can be changed by the creator.",
    });
  } else {
    flags.push({
      label: "Update authority is inactive",
      severity: "INFO",
      description: "Token metadata is locked and cannot be modified.",
    });
  }

  const allRevoked = 
    (!mintAuthority || mintAuthority === "None") &&
    (!freezeAuthority || freezeAuthority === "None") &&
    (!updateAuthority || updateAuthority === "None");

  if (allRevoked) {
    flags.push({
      label: "All Authorities Renounced",
      severity: "INFO",
      description: "Mint, freeze, and update authorities are all inactive/renounced, ensuring high structural safety.",
    });
  }

  if (!isVerified) {
    flags.push({
      label: "Token not in Jupiter verified list",
      severity: "WARNING",
      description: "This token is not strictly verified by Jupiter.",
    });
  }

  if (supply > 1_000_000_000_000) {
    flags.push({
      label: "Supply > 1 trillion",
      severity: "WARNING",
      description: "Unusually high token supply.",
    });
  }

  return flags;
}
