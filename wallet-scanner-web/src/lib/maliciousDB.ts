import { MALICIOUS_ADDRESSES } from "./maliciousAddresses";

// Known malicious addresses on Solana (from Dev Guide)
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

// Dynamic memory list of auto-flagged addresses
export const DYNAMIC_MALICIOUS_WALLETS: Record<string, string> = {};

export function addMaliciousAddress(address: string, label: string) {
  DYNAMIC_MALICIOUS_WALLETS[address] = label;
}

export function checkMalicious(address: string): {
  isMalicious: boolean;
  label?: string;
} {
  // 1. Check dynamic list
  const dynamicLabel = DYNAMIC_MALICIOUS_WALLETS[address];
  if (dynamicLabel) {
    return { isMalicious: true, label: dynamicLabel };
  }

  // 2. Check guide's seed list
  const label = MALICIOUS_WALLETS[address];
  if (label) {
    return { isMalicious: true, label };
  }

  // 3. Check the main registry in maliciousAddresses.ts
  const mainRegistryInfo = MALICIOUS_ADDRESSES[address];
  if (mainRegistryInfo) {
    return { isMalicious: true, label: mainRegistryInfo.name };
  }

  return { isMalicious: false };
}
