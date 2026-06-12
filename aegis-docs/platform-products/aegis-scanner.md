# Aegis Scanner

The Aegis Scanner is our flagship product. It is a real-time, on-chain risk intelligence engine capable of analyzing both wallets and token contracts with precision. 

### Automated Address Detection
Every Solana address is a public key. Aegis queries the Solana mainnet RPC and reads the program owner field to automatically determine the type of address submitted:
* **System Program owner:** Identified as a Wallet
* **Token Program owner:** Identified as an SPL Token Mint
* **Token-2022 Program owner:** Identified as a Token-2022 Mint
* **Other:** Identified as a Smart Contract or Program

### Wallet Scanning Infrastructure
When a user submits a wallet address, Aegis performs a deep audit:
1. Fetches the SOL balance.
2. Retrieves all SPL token accounts owned by the wallet.
3. Enriches token metadata using verified registries such as the Jupiter token list.
4. Flags frozen token accounts, unverified tokens, and high-risk holdings.
5. Cross-references the wallet's interaction history against the Malicious Wallet Intelligence Database.
6. Calculates a final, deterministic risk score based on all accumulated signals.

### Token Contract Scanning
When a token mint address is submitted, Aegis evaluates the contract's security posture:
1. Fetches raw mint data, including total supply, decimals, and authority designations.
2. Evaluates the mint authority status to determine if the deployer can infinitely print tokens.
3. Evaluates the freeze authority status to determine if the deployer can freeze holder accounts.
4. Pulls metadata from Metaplex and Jupiter to verify authenticity.
5. Assesses the total supply size and verification status.
6. Generates a comprehensive risk score.

### The Risk Scoring Engine
Risk scores are deterministic and calculated exclusively from on-chain signals. 

**Severity Modifiers:**
* **Active Mint Authority:** Danger (+30 points)
* **Active Freeze Authority:** Danger (+30 points)
* **Known Malicious Interaction:** Danger (+30 points)
* **Unverified Token:** Warning (+15 points)
* **Renounced Authorities:** Info (-10 points)

**Score Classifications:**
* **0 to 20 (LOW):** Clean signals. Users may proceed with standard caution.
* **21 to 50 (MEDIUM):** Some risk indicators are present. Users should review the contract details before transacting.
* **51 to 75 (HIGH):** Multiple risk signals detected. High caution is advised.
* **76 to 100 (CRITICAL):** Severe security risks identified. Interaction is strongly discouraged.
