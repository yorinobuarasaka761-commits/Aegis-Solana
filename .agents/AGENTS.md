# Aegis Solana Development Guidelines

## 1. Solana Token Metadata Fetching & Verification
* **Resilient Hostnames**: Do not fetch token lists from `token.jup.ag` or `tokens.jup.ag` inside server-side environments (Node.js). These subdomains are often blocked at the ISP/local DNS level, triggering `getaddrinfo ENOTFOUND` errors.
* **Jupiter V2 Search API**: Instead, utilize the active and unblocked `https://api.jup.ag/tokens/v2/search?query=[MINTS]` endpoint.
* **Batch Resolution**: Always resolve wallet holding metadata in batches. You can query up to 25–30 mint addresses in a single request by joining them with commas: `https://api.jup.ag/tokens/v2/search?query=mint1,mint2,mint3...`.
* **Multi-Tiered Fallback Sequence**: When resolving token metadata, prioritize:
  1. Jupiter V2 Search API (provides verified status, symbols, names, and IPFS icons).
  2. DexScreener API (for active pair details).
  3. Metaplex Metadata PDA account lookup.
  4. Token-2022 native metadata extension (`getTokenMetadata` from `@solana/spl-token`).

## 2. Robust Client-Side Logo Loading
* **Client-Side CDNs**: To resolve missing logos without bloating server-side payloads, use client-side image loaders that query public CDNs directly from the browser:
  1. `https://logo.solana.fm/logo?mint=${mint}`
  2. `https://dd.dexscreener.com/ds-data/tokens/solana/${mint}.png`
  3. `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${mint}/logo.png`
* **Broken Image Prevention**: When using multiple URL fallbacks in React, update the active URL index in state on `onError`. If all URLs fail, **completely unmount/hide the `img` element** and render a clean CSS abbreviation circle (e.g. `div` with text). Leaving a broken `img` element in the DOM will cause browsers to render a cracked/broken image icon overlaying the fallback letters.
