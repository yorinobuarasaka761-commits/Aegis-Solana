"use client";

import { useEffect, useState } from "react";

interface TickerItem {
  label: string;
  value: string;
  color: string;
}

const FALLBACK_ITEMS: TickerItem[] = [
  { label: "SOL PRICE", value: "Loading...", color: "text-zinc-500" },
  { label: "ACTIVE RPC", value: "MAINNET-BETA", color: "text-emerald-400" },
  { label: "ENGINE", value: "AEGIS/v1.3.0", color: "text-[var(--brand-primary)] font-bold" },
];

export default function LiveTicker() {
  const [items, setItems] = useState<TickerItem[]>(FALLBACK_ITEMS);

  useEffect(() => {
    let mounted = true;

    const fetchTicker = async () => {
      try {
        const res = await fetch("/api/ticker");
        if (res.ok) {
          const data = await res.json();
          if (mounted && data.items?.length > 0) {
            setItems(data.items);
          }
        }
      } catch (err) {
        console.error("Ticker fetch failed:", err);
      }
    };

    fetchTicker();

    // Refresh every 30 seconds
    const interval = setInterval(fetchTicker, 30_000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="w-full bg-[var(--surface-base)]/90 border-b border-[var(--border-subtle)] overflow-hidden select-none py-2">
      <div className="flex relative w-full overflow-hidden">
        {/* First rolling group */}
        <div className="animate-marquee whitespace-nowrap flex gap-12 text-[9px] font-mono tracking-[0.2em] uppercase py-0.5 pr-12 shrink-0">
          {items.map((item, index) => (
            <span key={index} className="inline-flex items-center gap-2">
              <span className="text-[var(--text-dimmed)] font-bold">•</span>
              <span className="text-[var(--text-muted)]">{item.label}:</span>
              <span className={item.color}>{item.value}</span>
            </span>
          ))}
        </div>
        {/* Second rolling group (duplicate for seamless loop) */}
        <div className="animate-marquee whitespace-nowrap flex gap-12 text-[9px] font-mono tracking-[0.2em] uppercase py-0.5 pr-12 shrink-0" aria-hidden="true">
          {items.map((item, index) => (
            <span key={`dup-${index}`} className="inline-flex items-center gap-2">
              <span className="text-[var(--text-dimmed)] font-bold">•</span>
              <span className="text-[var(--text-muted)]">{item.label}:</span>
              <span className={item.color}>{item.value}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
