"use client";

import { useState, useEffect } from "react";

interface TokenIconProps {
  mint: string;
  symbol: string;
  logoUri?: string;
}

export default function TokenIcon({ mint, symbol, logoUri }: TokenIconProps) {
  const [src, setSrc] = useState<string | null>(logoUri || null);
  const [fallbackIndex, setFallbackIndex] = useState(0);

  const fallbacks = [
    `https://logo.solana.fm/logo?mint=${mint}`,
    `https://dd.dexscreener.com/ds-data/tokens/solana/${mint}.png`,
    `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${mint}/logo.png`,
  ];

  useEffect(() => {
    setSrc(logoUri || null);
    setFallbackIndex(0);
  }, [logoUri, mint]);

  const handleError = () => {
    if (fallbackIndex < fallbacks.length) {
      setSrc(fallbacks[fallbackIndex]);
      setFallbackIndex(fallbackIndex + 1);
    } else {
      setSrc(null); // Render the text fallback
    }
  };

  if (src || fallbackIndex < fallbacks.length) {
    const currentSrc = src || fallbacks[0];
    return (
      <img
        src={currentSrc}
        alt={symbol}
        className="w-9 h-9 rounded-full border border-zinc-800 shrink-0 object-cover bg-zinc-900"
        onError={handleError}
      />
    );
  }

  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-700 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-300 shrink-0">
      {symbol.slice(0, 2).toUpperCase()}
    </div>
  );
}
