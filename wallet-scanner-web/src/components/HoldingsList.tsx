"use client";

import { useState } from "react";
import { TokenHolding } from "@/lib/types";
import { Coins, Search, ArrowUpRight, ArrowDownRight, TrendingUp, ExternalLink } from "lucide-react";
import { formatUSDPrice } from "@/lib/prices";

import TokenIcon from "@/components/TokenIcon";

interface HoldingsListProps {
  holdings: TokenHolding[];
  totalValueUSD: number;
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function HoldingsList({ holdings, totalValueUSD }: HoldingsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | "warning_danger" | "safe">("all");

  const filtered = holdings.filter((token) => {
    // 1. Search term filter
    const matchesSearch =
      token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.mint.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Risk filter
    if (riskFilter === "warning_danger") {
      return token.riskLevel === "CAUTION" || token.riskLevel === "DANGER" || token.isFrozen;
    }
    if (riskFilter === "safe") {
      return token.riskLevel === "SAFE" && !token.isFrozen;
    }
    return true;
  });

  return (
    <div className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl overflow-hidden glow-card">
      {/* Header section with title and stats */}
      <div className="px-6 py-5 border-b border-zinc-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-brand-primary" />
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-300">
            Token Holdings
          </h3>
          <span className="text-xs font-bold text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
            {filtered.length} assets
          </span>
        </div>

        {/* Filter controls container */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search bar inside header */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name or symbol..."
              className="py-1.5 pl-9 pr-3 text-xs bg-zinc-950/40 border border-zinc-800 rounded-xl focus:outline-none focus:border-brand-primary text-white font-medium w-full sm:w-48 placeholder:text-zinc-600 focus:ring-1 focus:ring-brand-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Risk Filter pills */}
          <div className="flex bg-zinc-950/20 border border-zinc-800/50 rounded-xl p-0.5 text-[10px] font-bold uppercase tracking-wider">
            <button
              onClick={() => setRiskFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                riskFilter === "all"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setRiskFilter("warning_danger")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                riskFilter === "warning_danger"
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/10"
                  : "text-zinc-500 hover:text-rose-400"
              }`}
            >
              Warning/Danger
            </button>
            <button
              onClick={() => setRiskFilter("safe")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                riskFilter === "safe"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10"
                  : "text-zinc-500 hover:text-emerald-400"
              }`}
            >
              Safe
            </button>
          </div>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/50 bg-zinc-900/30">
                <th className="px-6 py-3 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">#</th>
                <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Asset</th>
                <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 text-right">Price</th>
                <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 text-right">24h</th>
                <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 text-right">Balance</th>
                <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 text-right">Value (USD)</th>
                <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 text-right">Portfolio %</th>
                <th className="px-6 py-3 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/30">
              {filtered.map((token, idx) => {
                const pct = totalValueUSD > 0 ? (token.valueUSD / totalValueUSD) * 100 : 0;
                const isUp = token.change24h !== undefined && token.change24h >= 0;
                const hasChange = token.change24h !== undefined;
                return (
                  <tr key={idx} className="hover:bg-white/[0.025] transition-colors group">
                    <td className="px-6 py-4 text-xs text-zinc-600 font-mono">{idx + 1}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <TokenIcon mint={token.mint} symbol={token.symbol} logoUri={token.logoUri} />
                        <div>
                          <div className="text-sm font-bold text-zinc-100">{token.symbol}</div>
                          <div className="text-[11px] text-zinc-500 truncate max-w-[140px]">{token.name}</div>
                          <div className="text-[9px] font-mono text-zinc-700 mt-0.5">{token.mint.slice(0,8)}…{token.mint.slice(-4)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <div className="font-mono text-sm text-zinc-300">
                        {token.priceUsd > 0 ? (
                          formatUSDPrice(token.priceUsd)
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      {hasChange ? (
                        <div className={`flex items-center justify-end gap-1 text-sm font-bold ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                          {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          {Math.abs(token.change24h!).toFixed(2)}%
                        </div>
                      ) : (
                        <span className="text-zinc-600 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <div className="font-mono text-sm text-zinc-300">
                        {token.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <div className="font-mono text-sm font-bold text-emerald-400">
                        {token.valueUSD > 0 ? `$${fmt(token.valueUSD)}` : <span className="text-zinc-600">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-primary/70 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-xs font-mono text-zinc-400 w-10 text-right">{pct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest border ${
                          token.isFrozen ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                          token.riskLevel === "DANGER" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                          token.riskLevel === "CAUTION" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        }`}>
                          {token.isFrozen ? "FROZEN" : token.riskLevel}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {token.dexUrl && (
                            <a href={token.dexUrl} target="_blank" rel="noreferrer"
                              className="p-1.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary hover:bg-brand-primary/20 transition-colors"
                              title="Trade on Raydium">
                              <TrendingUp className="w-3 h-3" />
                            </a>
                          )}
                          <a href={`https://solscan.io/token/${token.mint}`} target="_blank" rel="noreferrer"
                            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white transition-colors"
                            title="View on Solscan">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-14 text-center flex flex-col items-center justify-center gap-3">
          <Coins className="w-12 h-12 text-zinc-800" />
          <h4 className="text-zinc-400 font-bold">No Match Found</h4>
          <p className="text-xs text-zinc-600 max-w-xs">
            No assets match your search term or risk filter query.
          </p>
        </div>
      )}
    </div>
  );
}
