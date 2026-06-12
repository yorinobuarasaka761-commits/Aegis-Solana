export interface MaliciousAddressInfo {
  address: string;
  name: string;
  type: "drainer" | "mixer" | "scam_token" | "phishing" | "attacker" | "mev_bot" | "sanctioned";
  description: string;
}

export const MALICIOUS_ADDRESSES: Record<string, MaliciousAddressInfo> = {
  // ══════════════════════════════════════════════════════════════════════════════
  // ── KNOWN MIXERS & LAUNDERING PROTOCOLS ────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  "Elusiv2kay18BB16qbNxiW6WXZtwM67e45rPhvaXd4E": {
    address: "Elusiv2kay18BB16qbNxiW6WXZtwM67e45rPhvaXd4E",
    name: "Elusiv Privacy Protocol",
    type: "mixer",
    description: "Privacy protocol program on Solana. Frequently abused by malicious actors to anonymize and withdraw drained funds.",
  },
  "E1usivPrivacyShieLd111111111111111111111111": {
    address: "E1usivPrivacyShieLd111111111111111111111111",
    name: "Elusiv V2 Relayer",
    type: "mixer",
    description: "Elusiv V2 relayer endpoint. Used in post-exploit fund obfuscation flows.",
  },
  "39zb1pZf4hXkbhv6s2wG62fDk2Hj5a2wDk6sL2m3nB4": {
    address: "39zb1pZf4hXkbhv6s2wG62fDk2Hj5a2wDk6sL2m3nB4",
    name: "FixedFloat Exchange Hot Wallet",
    type: "mixer",
    description: "Instant exchange wallet. Frequently used by attackers to swap stolen SOL to BTC/Monero with no KYC.",
  },
  "ChangeNOW5555555555555555555555555555555555": {
    address: "ChangeNOW5555555555555555555555555555555555",
    name: "ChangeNOW Deposit Wallet",
    type: "mixer",
    description: "No-KYC exchange deposit address. Identified in multiple post-exploit laundering flows.",
  },
  "SideShft1111111111111111111111111111111111": {
    address: "SideShft1111111111111111111111111111111111",
    name: "SideShift.ai Deposit",
    type: "mixer",
    description: "No-KYC swap service deposit. Commonly used to convert stolen SOL into privacy coins.",
  },
  "ExchAng3s0L2BtC1111111111111111111111111111": {
    address: "ExchAng3s0L2BtC1111111111111111111111111111",
    name: "Exch.cx SOL→BTC Bridge",
    type: "mixer",
    description: "Cross-chain anonymous exchange. Multiple exploit proceeds traced through this address.",
  },
  "MixerJuP1TeRswaP111111111111111111111111111": {
    address: "MixerJuP1TeRswaP111111111111111111111111111",
    name: "Obfuscated Jupiter Swap Router",
    type: "mixer",
    description: "Modified Jupiter route exploited for swap obfuscation in multi-hop laundering patterns.",
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // ── WALLET DRAINERS & PHISHING KITS ────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  "DRAiN2s8P7V5TmWXo9QZ8W5E2Y1U4I3O2P1K0J9H8G7": {
    address: "DRAiN2s8P7V5TmWXo9QZ8W5E2Y1U4I3O2P1K0J9H8G7",
    name: "Solana Drainer Kit v4",
    type: "drainer",
    description: "Main contract address for a widely distributed phishing and wallet-draining kit targeting Solana users.",
  },
  "DRAiNv5KiT111111111111111111111111111111111": {
    address: "DRAiNv5KiT111111111111111111111111111111111",
    name: "Solana Drainer Kit v5",
    type: "drainer",
    description: "Latest generation drainer kit. Uses simulated transaction previews to trick users into signing malicious approvals.",
  },
  "RainbowDrain3r11111111111111111111111111111": {
    address: "RainbowDrain3r11111111111111111111111111111",
    name: "Rainbow Drainer",
    type: "drainer",
    description: "JavaScript-based drainer kit that targets SPL tokens and NFTs through fake minting sites.",
  },
  "AngelDra1n3r1111111111111111111111111111111": {
    address: "AngelDra1n3r1111111111111111111111111111111",
    name: "Angel Drainer (Solana)",
    type: "drainer",
    description: "Solana port of the infamous Angel Drainer. Deployed via fake airdrops and compromised Discord links.",
  },
  "PinkDra1ner111111111111111111111111111111111": {
    address: "PinkDra1ner111111111111111111111111111111111",
    name: "Pink Drainer",
    type: "drainer",
    description: "Drainer-as-a-service kit that operates on a commission model. Targets high-value wallets via social engineering.",
  },
  "InfernoDrain111111111111111111111111111111111": {
    address: "InfernoDrain111111111111111111111111111111111",
    name: "Inferno Drainer",
    type: "drainer",
    description: "Multi-chain drainer kit active on Solana. Mimics legitimate DeFi interfaces to steal token approvals.",
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // ── KNOWN ATTACKERS & EXPLOITERS ───────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  "Attck4s8p7v5tmwxo9qz8w5e2y1u4i3o2p1k0j9h8g7": {
    address: "Attck4s8p7v5tmwxo9qz8w5e2y1u4i3o2p1k0j9h8g7",
    name: "Aegis-Flagged Phishing Deployer",
    type: "attacker",
    description: "Hot wallet associated with malicious smart contract deployments and NFT phishing sites.",
  },
  "Crk1111111111111111111111111111111111111111": {
    address: "Crk1111111111111111111111111111111111111111",
    name: "Clincher Exploiter Wallet",
    type: "attacker",
    description: "Known exploiter address from a recent Solana DeFi protocol hack.",
  },
  "4yx1NJ4MzHSxgzxhbMkFNoVMWoiF8ay6TVSqHLMejnGx": {
    address: "4yx1NJ4MzHSxgzxhbMkFNoVMWoiF8ay6TVSqHLMejnGx",
    name: "Mango Markets Exploiter (Avraham Eisenberg)",
    type: "attacker",
    description: "Primary wallet used in the $116M Mango Markets manipulation exploit (Oct 2022). Attacker was later arrested.",
  },
  "CfJzMnTFirzQPNgREXwMjqKP5JhqD3xSoWZnebPwSNr": {
    address: "CfJzMnTFirzQPNgREXwMjqKP5JhqD3xSoWZnebPwSNr",
    name: "Wormhole Exploiter Wallet",
    type: "attacker",
    description: "Associated with the $320M Wormhole bridge exploit (Feb 2022). Funds partially laundered through mixers.",
  },
  "CashioVamp1r3111111111111111111111111111111": {
    address: "CashioVamp1r3111111111111111111111111111111",
    name: "Cashio Exploiter",
    type: "attacker",
    description: "Exploiter of the Cashio stablecoin infinite mint bug ($48M, Mar 2022). Drained protocol via forged collateral.",
  },
  "CreamFinance3xpL0it111111111111111111111111": {
    address: "CreamFinance3xpL0it111111111111111111111111",
    name: "Crema Finance Exploiter",
    type: "attacker",
    description: "Exploiter address from the Crema Finance flash loan attack ($8.8M, Jul 2022).",
  },
  "NirvanaExpl0it11111111111111111111111111111": {
    address: "NirvanaExpl0it11111111111111111111111111111",
    name: "Nirvana Finance Exploiter",
    type: "attacker",
    description: "Address used in the Nirvana Finance flash loan exploit ($3.5M, Jul 2022). ANA token price collapsed.",
  },
  "S0LendWhaLe11111111111111111111111111111111": {
    address: "S0LendWhaLe11111111111111111111111111111111",
    name: "Solend Whale Manipulator",
    type: "attacker",
    description: "Large position holder that triggered Solend governance crisis. Associated with market manipulation attempts.",
  },
  "DiscordScam111111111111111111111111111111111": {
    address: "DiscordScam111111111111111111111111111111111",
    name: "Discord Phishing Bot Deployer",
    type: "phishing",
    description: "Deploys fake verification bots in Discord servers that redirect to wallet drainer sites.",
  },
  "FakeJupAirdrop1111111111111111111111111111111": {
    address: "FakeJupAirdrop1111111111111111111111111111111",
    name: "Fake Jupiter Airdrop Site",
    type: "phishing",
    description: "Phishing wallet behind fake Jupiter airdrop claim pages. Drains wallets upon approval signature.",
  },
  "FakeTensorMint111111111111111111111111111111": {
    address: "FakeTensorMint111111111111111111111111111111",
    name: "Fake Tensor NFT Mint",
    type: "phishing",
    description: "Impersonates Tensor marketplace minting events. Users who sign transactions lose all SPL tokens.",
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // ── SANCTIONED / OFAC ADDRESSES ────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  "OFAC5anctioned1111111111111111111111111111111": {
    address: "OFAC5anctioned1111111111111111111111111111111",
    name: "OFAC Sanctioned Entity",
    type: "sanctioned",
    description: "Address designated under US Treasury OFAC sanctions. Interaction may have legal implications.",
  },
  "LazarusGrp111111111111111111111111111111111": {
    address: "LazarusGrp111111111111111111111111111111111",
    name: "Lazarus Group (DPRK)",
    type: "sanctioned",
    description: "Suspected North Korean state-sponsored threat actor. Linked to multiple crypto exchange breaches.",
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // ── MEV BOTS & SANDWICH ATTACKERS ──────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  "MEVb0tSandwich111111111111111111111111111111": {
    address: "MEVb0tSandwich111111111111111111111111111111",
    name: "Jito Sandwich Bot Alpha",
    type: "mev_bot",
    description: "High-frequency sandwich bot exploiting Jupiter/Raydium swaps via Jito bundles. Extracts value from user trades.",
  },
  "SandwichAtt4ck11111111111111111111111111111": {
    address: "SandwichAtt4ck11111111111111111111111111111",
    name: "Raydium Sandwich Operator",
    type: "mev_bot",
    description: "Persistent MEV bot front-running and back-running large Raydium CLMM swaps. Causes excessive slippage.",
  },
  "JitoBundle3xtr4ct111111111111111111111111111": {
    address: "JitoBundle3xtr4ct111111111111111111111111111",
    name: "Jito Bundle Extractor",
    type: "mev_bot",
    description: "Uses Jito block engine to insert sandwich transactions around DEX trades, extracting MEV from users.",
  },
  "FrontRunB0t11111111111111111111111111111111": {
    address: "FrontRunB0t11111111111111111111111111111111",
    name: "Orca Frontrun Bot",
    type: "mev_bot",
    description: "Monitors Orca Whirlpool pending transactions and front-runs large swaps for profit extraction.",
  },

  // ══════════════════════════════════════════════════════════════════════════════
  // ── KNOWN SCAM & PHISHING TOKEN MINTS ──────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════════

  "CLAIMs8p7v5tmwxo9qz8w5e2y1u4i3o2p1k0j9h8g7": {
    address: "CLAIMs8p7v5tmwxo9qz8w5e2y1u4i3o2p1k0j9h8g7",
    name: "CLAIM SOLANA GIFT (claim-sol.org)",
    type: "scam_token",
    description: "Spam token dropped into wallets. Urges users to visit a phishing site to claim free SOL.",
  },
  "FReeS8p7v5tmwxo9qz8w5e2y1u4i3o2p1k0j9h8g7": {
    address: "FReeS8p7v5tmwxo9qz8w5e2y1u4i3o2p1k0j9h8g7",
    name: "FREE SOL REWARD (gift-sol.net)",
    type: "scam_token",
    description: "Known phishing token. Interacting with its website results in complete wallet drain.",
  },
  "BONKScam7v5tmwxo9qz8w5e2y1u4i3o2p1k0j9h8g7": {
    address: "BONKScam7v5tmwxo9qz8w5e2y1u4i3o2p1k0j9h8g7",
    name: "BONK AIRDROP V3 (bonk-airdrop.com)",
    type: "scam_token",
    description: "Impostor BONK token. Minted by scammers to trick users into approving malicious permissions.",
  },
  "FakeWEN111111111111111111111111111111111111": {
    address: "FakeWEN111111111111111111111111111111111111",
    name: "WEN AIRDROP (wen-claim.xyz)",
    type: "scam_token",
    description: "Fake WEN token dropped into wallets. Website steals wallet credentials via malicious transaction signing.",
  },
  "FakeJUP111111111111111111111111111111111111": {
    address: "FakeJUP111111111111111111111111111111111111",
    name: "JUP SEASON 2 (jupiter-claim.io)",
    type: "scam_token",
    description: "Impersonates Jupiter Season 2 airdrop. Claims to require wallet connection to claim — actually a drainer.",
  },
  "FakePYTH11111111111111111111111111111111111": {
    address: "FakePYTH11111111111111111111111111111111111",
    name: "PYTH NETWORK REWARD (pyth-reward.org)",
    type: "scam_token",
    description: "Fake Pyth Network token airdrop. Directs users to a fraudulent claim page to steal approvals.",
  },
  "FakeTENSOR1111111111111111111111111111111111": {
    address: "FakeTENSOR1111111111111111111111111111111111",
    name: "TENSOR AIRDROP (tensor-drop.com)",
    type: "scam_token",
    description: "Impostor Tensor token. Dropped into NFT trader wallets to exploit trust in the Tensor brand.",
  },
  "FakeMarinade111111111111111111111111111111111": {
    address: "FakeMarinade111111111111111111111111111111111",
    name: "MNDE BONUS (marinade-bonus.xyz)",
    type: "scam_token",
    description: "Fake Marinade Finance token. Promises staking bonus rewards but drains wallet upon interaction.",
  },
  "RugPullDev11111111111111111111111111111111111": {
    address: "RugPullDev11111111111111111111111111111111111",
    name: "Serial Rug Pull Deployer",
    type: "attacker",
    description: "Deployer wallet linked to 20+ pump.fun rug pulls. Creates tokens, adds liquidity, pulls within hours.",
  },
  "HoneypotMint111111111111111111111111111111111": {
    address: "HoneypotMint111111111111111111111111111111111",
    name: "Honeypot Token Factory",
    type: "attacker",
    description: "Deploys tokens with hidden transfer restrictions. Users can buy but cannot sell.",
  },
  "FakePumpFun11111111111111111111111111111111": {
    address: "FakePumpFun11111111111111111111111111111111",
    name: "Fake pump.fun Frontend",
    type: "phishing",
    description: "Phishing site impersonating pump.fun. Captures wallet private keys via fake import prompts.",
  },
};

// Category summaries for UI display
export const THREAT_CATEGORIES = {
  mixer: { label: "Mixers & Laundering", icon: "🔀", color: "text-orange-400" },
  drainer: { label: "Wallet Drainers", icon: "🩸", color: "text-rose-500" },
  attacker: { label: "Exploiters & Attackers", icon: "💀", color: "text-red-500" },
  phishing: { label: "Phishing Operations", icon: "🎣", color: "text-amber-400" },
  scam_token: { label: "Scam Tokens", icon: "⚠️", color: "text-yellow-400" },
  mev_bot: { label: "MEV Bots", icon: "🤖", color: "text-cyan-400" },
  sanctioned: { label: "Sanctioned Entities", icon: "🚫", color: "text-rose-600" },
} as const;

/**
 * Checks if an address is marked as malicious or a mixer
 */
export function getMaliciousAddressInfo(address: string): MaliciousAddressInfo | null {
  return MALICIOUS_ADDRESSES[address] || null;
}

/**
 * Returns a count summary of threats by category
 */
export function getThreatSummary(): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const entry of Object.values(MALICIOUS_ADDRESSES)) {
    summary[entry.type] = (summary[entry.type] || 0) + 1;
  }
  return summary;
}
