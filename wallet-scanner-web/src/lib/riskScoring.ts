import { RiskFlag, TokenHolding, MaliciousInteraction } from "./types";

export function calculateRiskScore(flags: RiskFlag[]): number {
  let score = 0;
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
  recentInteractions: MaliciousInteraction[] = []
): RiskFlag[] {
  const flags: RiskFlag[] = [];
  
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
  supply,
  isVerified,
}: {
  mintAuthority: string | null;
  freezeAuthority: string | null;
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
      label: "Mint authority renounced",
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
      label: "Freeze authority renounced",
      severity: "INFO",
      description: "Token balances cannot be frozen.",
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
