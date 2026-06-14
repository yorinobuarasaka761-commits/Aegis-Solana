"use client";

import { TokenTrade } from "@/lib/types";
import { TrendingUp, ExternalLink, Copy, Check, ShoppingCart, RefreshCw, AlertCircle } from "lucide-react";
import { useState } from "react";

interface TokenTradesPanelProps {
  trades: TokenTrade[];
  tokenSymbol: string;
  priceUsd?: number;
  isRefreshing?: boolean;
  refreshedAt?: Date | null;
  error?: string | null;
}

function fmtNum(n: number, opts?: Intl.NumberFormatOptions) {
  return n.toLocaleString(undefined, opts);
}

function truncate(addr: string) {
  return `${addr.slice(0, 5)}...${addr.slice(-4)}`;
}

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} title="Copy address" className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors">
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function dexColor(name: string) {
  const n = name.toLowerCase();
  if (n.includes("raydium"))  return "bg-violet-500/10 text-violet-400 border-violet-500/20";
  if (n.includes("pump"))     return "bg-orange-500/10 text-orange-400 border-orange-500/20";
  if (n.includes("orca"))     return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
  if (n.includes("jupiter"))  return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (n.includes("meteora"))  return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  if (n.includes("lifinity")) return "bg-pink-500/10 text-pink-400 border-pink-500/20";
  return "bg-zinc-800 text-zinc-400 border-zinc-700";
}

// Skeleton row while loading
function SkeletonRow({ idx }: { idx: number }) {
  return (
    <tr className="border-b border-zinc-800/20" style={{ opacity: 1 - idx * 0.15 }}>
      {[40, 140, 80, 70, 60, 70, 24].map((w, i) => (
        <td key={i} className="px-4 py-4">
          <div className={`h-3 rounded-full bg-zinc-800 animate-pulse`} style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

export default function TokenTradesPanel({
  trades,
  tokenSymbol,
  priceUsd,
  isRefreshing = false,
  refreshedAt = null,
  error = null,
}: TokenTradesPanelProps) {

  // Show skeleton rows while initial load is in progress (no trades yet + refreshing)
  const showSkeleton = isRefreshing && trades.length === 0;

  if (!showSkeleton && (!trades || trades.length === 0)) {
    return (
      <div className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-14 text-center flex flex-col items-center justify-center gap-3 glow-card">
        {error ? (
          <>
            <AlertCircle className="w-12 h-12 text-amber-500/80 animate-pulse" />
            <h4 className="text-zinc-400 font-bold">Live Feed Rate Limited</h4>
            <p className="text-xs text-amber-400/80 max-w-md font-mono">
              {error}
            </p>
            <p className="text-[10px] text-zinc-500">
              The application is automatically retrying to establish connection.
            </p>
          </>
        ) : isRefreshing ? (
          <>
            <RefreshCw className="w-10 h-10 text-zinc-600 animate-spin" />
            <h4 className="text-zinc-400 font-bold">Fetching live trades…</h4>
            <p className="text-xs text-zinc-600">Querying on-chain pool data via Helius</p>
          </>
        ) : (
          <>
            <ShoppingCart className="w-12 h-12 text-zinc-800 animate-pulse" />
            <h4 className="text-zinc-400 font-bold">No Recent Buys Found</h4>
            <p className="text-xs text-zinc-600 max-w-xs">
              No liquidity pool detected for this token, or no buy transactions found in recent pool history.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl overflow-hidden glow-card">
      {error && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 text-xs text-amber-400/90 flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Notice: {error} (auto-retry in progress)</span>
        </div>
      )}
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800/50 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-300">
            Recent Buys
          </h3>
          <span className="text-xs font-bold text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
            {trades.length} trades
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Live pulsing dot */}
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isRefreshing ? "bg-amber-400 animate-ping" : "bg-emerald-400 animate-pulse"}`} />
            <span className={`text-[9px] font-extrabold uppercase tracking-widest ${isRefreshing ? "text-amber-400" : "text-emerald-400"}`}>
              {isRefreshing ? "Syncing…" : "Live"}
            </span>
          </div>

          {/* Last updated */}
          {refreshedAt && !isRefreshing && (
            <span className="text-[9px] font-mono text-zinc-600">
              Updated {timeAgo(refreshedAt)}
            </span>
          )}

          {/* Refresh interval notice */}
          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-zinc-900 text-zinc-500 border border-zinc-800">
            Auto · 30s
          </span>

          {/* Source tags */}
          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-violet-500/10 text-violet-400 border border-violet-500/20">
            Multi-DEX
          </span>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-zinc-800 text-zinc-400 border border-zinc-700">
            Helius
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800/50 bg-zinc-900/30">
              <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">#</th>
              <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Buyer Wallet</th>
              <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 text-right">
                {tokenSymbol} Received
              </th>
              <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 text-right">SOL Spent</th>
              {priceUsd && priceUsd > 0 && (
                <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 text-right">USD Value</th>
              )}
              <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">DEX</th>
              <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 text-right">Time</th>
              <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 text-center">Tx</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/30">
            {showSkeleton
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} idx={i} />)
              : trades.map((trade, idx) => {
                  const usdValue = priceUsd && priceUsd > 0 ? trade.tokenAmount * priceUsd : undefined;
                  return (
                    <tr
                      key={trade.signature}
                      className={`hover:bg-white/[0.025] transition-colors group ${
                        idx === 0 && !isRefreshing ? "bg-emerald-500/[0.03]" : ""
                      }`}
                    >
                      {/* Rank */}
                      <td className="px-5 py-4 text-xs text-zinc-600 font-mono">{idx + 1}</td>

                      {/* Buyer */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                            style={{ background: `hsl(${(trade.buyer.charCodeAt(3) * 37) % 360}, 55%, 28%)` }}
                          >
                            {trade.buyer.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-mono text-xs text-zinc-200">{truncate(trade.buyer)}</div>
                            <div className="flex items-center gap-0.5 mt-0.5">
                              <CopyButton text={trade.buyer} />
                              <a
                                href={`https://solscan.io/account/${trade.buyer}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
                                title="View on Solscan"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Token received */}
                      <td className="px-4 py-4 text-right">
                        <div className="font-mono text-sm font-bold text-emerald-400">
                          +{fmtNum(trade.tokenAmount, { maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[9px] text-zinc-600 font-mono mt-0.5">{trade.tokenSymbol}</div>
                      </td>

                      {/* SOL spent */}
                      <td className="px-4 py-4 text-right">
                        {trade.solAmount !== undefined && trade.solAmount > 0 ? (
                          <div className="font-mono text-sm text-zinc-300">
                            {fmtNum(trade.solAmount, { maximumFractionDigits: 4 })}
                            <span className="text-zinc-500 text-[10px] ml-1">SOL</span>
                          </div>
                        ) : (
                          <span className="text-zinc-600 text-sm font-mono">—</span>
                        )}
                      </td>

                      {/* USD value */}
                      {priceUsd && priceUsd > 0 && (
                        <td className="px-4 py-4 text-right">
                          <div className="font-mono text-sm text-zinc-300">
                            {usdValue !== undefined && usdValue > 0
                              ? `$${fmtNum(usdValue, { maximumFractionDigits: 2 })}`
                              : <span className="text-zinc-600">—</span>}
                          </div>
                        </td>
                      )}

                      {/* DEX badge */}
                      <td className="px-4 py-4">
                        {trade.dexName ? (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest border whitespace-nowrap ${dexColor(trade.dexName)}`}>
                            {trade.dexName}
                          </span>
                        ) : (
                          <span className="text-zinc-700 text-[9px] font-mono">—</span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="px-4 py-4 text-right">
                        <div className="text-[10px] font-mono text-zinc-500 max-w-[110px] text-right leading-tight">
                          {trade.timestamp}
                        </div>
                      </td>

                      {/* Tx link */}
                      <td className="px-5 py-4 text-center">
                        <a
                          href={`https://solscan.io/tx/${trade.signature}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center p-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:border-violet-500 transition-colors"
                          title="View Transaction on Solscan"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-zinc-800/30 flex items-center justify-between">
        <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
          AMM pool ledger · On-chain verified · Buys only
        </span>
        <div className="flex items-center gap-1.5">
          {isRefreshing && (
            <RefreshCw className="w-2.5 h-2.5 text-amber-400 animate-spin" />
          )}
          <span className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest">
            {isRefreshing ? "Refreshing…" : refreshedAt ? `Last: ${timeAgo(refreshedAt)}` : "Awaiting data"}
          </span>
        </div>
      </div>
    </div>
  );
}
