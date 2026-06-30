"use client";

import { useState, useEffect } from "react";

interface TokenIconProps {
  mint: string;
  symbol: string;
  logoUri?: string;
}

export default function TokenIcon({ mint, symbol, logoUri }: TokenIconProps) {
  const [urlIndex, setUrlIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  // Build the list of URLs we want to try in order
  const urls: string[] = [];
  if (logoUri && logoUri.trim() !== "") {
    urls.push(logoUri);
  }
  urls.push(`https://logo.solana.fm/logo?mint=${mint}`);
  urls.push(`https://dd.dexscreener.com/ds-data/tokens/solana/${mint}.png`);
  urls.push(`https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${mint}/logo.png`);

  useEffect(() => {
    setUrlIndex(0);
    setFailed(false);
  }, [mint, logoUri]);

  const handleError = () => {
    if (urlIndex + 1 < urls.length) {
      setUrlIndex((prev) => prev + 1);
    } else {
      setFailed(true);
    }
  };

  if (!failed && urls.length > 0) {
    return (
      <img
        src={urls[urlIndex]}
        alt={symbol}
        className="w-9 h-9 rounded-full border border-zinc-800 shrink-0 object-cover bg-zinc-900"
        onError={handleError}
      />
    );
  }

  // Fallback text circle
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-700 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-300 shrink-0">
      {symbol.slice(0, 2).toUpperCase()}
    </div>
  );
}
