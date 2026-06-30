"use client";
import { WalletData } from "@/lib/types";
import {
  ShieldAlert, AlertTriangle, Info, Coins, ShieldCheck,
  ExternalLink, DollarSign, ArrowUpRight, ArrowDownRight,
  Activity, Wallet, TrendingUp, Copy, CheckCheck,
} from "lucide-react";
import { useState } from "react";
import { formatUSDPrice } from "@/lib/prices";
import TokenIcon from "@/components/TokenIcon";


function fmt(n: number, decimals = 2) {
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtCompact(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${fmt(n)}`;
}

export default function WalletResults({ data, address, tab = "audit" }: { data: WalletData; address: string; tab?: "audit" | "holdings" }) {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const solProportion = data.totalValueUSD > 0 ? (data.solBalanceUSD / data.totalValueUSD) * 100 : 0;

  return (
    <div className="space-y-6">

      {/* Price Feed Status Warning */}
      {data.totalValueUSD === 0 && data.tokenHoldings.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 text-amber-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="text-xs">Price data temporarily unavailable. Portfolio value and token valuations are not loaded.</span>
        </div>
      )}

      {/* ── Overview Header Card (Solscan-style) ── */}
      <div className="bg-[#0B0F1A]/90 backdrop-blur-xl border border-zinc-800/80 rounded-3xl overflow-hidden glow-card">
        {/* Address Bar */}
        <div className="px-6 pt-6 pb-4 border-b border-zinc-800/50 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-primary to-indigo-600 flex items-center justify-center shadow-lg">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">Wallet Address</div>
              <div className="font-mono text-sm text-zinc-200 flex items-center gap-2">
                <span className="hidden md:inline">{address}</span>
                <span className="md:hidden">{address.slice(0, 8)}...{address.slice(-8)}</span>
                <button
                  onClick={copyAddress}
                  className="text-zinc-500 hover:text-white transition-colors active-tactile"
                  title="Copy address"
                >
                  {copied ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={`https://solscan.io/account/${address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zinc-500 hover:text-brand-primary transition-colors active-tactile"
                  title="View on Solscan"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 divide-x divide-y md:divide-y-0 divide-zinc-800/50">
          <div className="px-6 py-5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Total Portfolio
            </div>
            <div className="text-2xl font-mono font-bold text-white">{fmtCompact(data.totalValueUSD)}</div>
            <div className="text-xs text-zinc-500 mt-1">≈ {fmt(data.totalValueUSD)} USD</div>
          </div>

          <div className="px-6 py-5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1">
              <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" alt="SOL" className="w-3 h-3 rounded-full" /> SOL Balance
            </div>
            <div className="text-2xl font-mono font-bold text-white">{fmt(data.solBalance, 4)}</div>
            <div className="text-xs text-zinc-500 mt-1">${fmt(data.solBalanceUSD)} USD</div>
          </div>
        </div>

        {/* Portfolio allocation bar */}
        {tab === "holdings" && data.totalValueUSD > 0 && (
          <div className="px-6 pb-5 pt-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Portfolio Allocation</div>
            <div className="h-2 rounded-full bg-zinc-900 overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-[#9945FF] to-[#14F195] transition-all duration-500"
                style={{ width: `${solProportion}%` }}
                title={`SOL: ${solProportion.toFixed(1)}%`}
              />
              {data.tokenHoldings.map((t, i) => {
                const pct = (t.valueUSD / data.totalValueUSD) * 100;
                const colors = ["#F59E0B", "#3B82F6", "#EC4899", "#10B981", "#8B5CF6", "#F97316"];
                return (
                  <div
                    key={i}
                    className="h-full"
                    style={{ width: `${pct}%`, backgroundColor: colors[i % colors.length] }}
                    title={`${t.symbol}: ${pct.toFixed(1)}%`}
                  />
                );
              })}
            </div>
            <div className="flex gap-4 mt-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#9945FF] to-[#14F195]" />
                <span className="text-[10px] text-zinc-500">SOL ({solProportion.toFixed(1)}%)</span>
              </div>
              {data.tokenHoldings.slice(0, 5).map((t, i) => {
                const pct = (t.valueUSD / data.totalValueUSD) * 100;
                const colors = ["#F59E0B", "#3B82F6", "#EC4899", "#10B981", "#8B5CF6"];
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                    <span className="text-[10px] text-zinc-500">{t.symbol} ({pct.toFixed(1)}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Risk Flags ── */}
      {tab === "audit" && (
        data.riskFlags.length > 0 ? (
          <div className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 glow-card">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-300 mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              Wallet Risk Flags
            </h3>
            <div className="space-y-3">
              {data.riskFlags.map((flag, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border flex items-start gap-4 transition-all hover:-translate-y-0.5 ${
                    flag.severity === "DANGER" ? "bg-rose-500/10 border-rose-500/20" :
                    flag.severity === "WARNING" ? "bg-amber-500/10 border-amber-500/20" :
                    "bg-emerald-500/10 border-emerald-500/20"
                  }`}
                >
                  <div className="mt-0.5">
                    {flag.severity === "DANGER" && <ShieldAlert className="w-5 h-5 text-rose-500" />}
                    {flag.severity === "WARNING" && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                    {flag.severity === "INFO" && <Info className="w-5 h-5 text-emerald-500" />}
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${
                      flag.severity === "DANGER" ? "text-rose-400" :
                      flag.severity === "WARNING" ? "text-amber-400" :
                      "text-emerald-400"
                    }`}>{flag.label}</h4>
                    <p className="text-xs text-zinc-400 mt-1">{flag.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-5 flex items-center gap-4">
            <ShieldCheck className="w-8 h-8 text-emerald-500 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-emerald-400">No Risk Flags Detected</h3>
              <p className="text-xs text-zinc-500 mt-0.5">This wallet appears to have a clean on-chain record based on current metrics.</p>
            </div>
          </div>
        )
      )}

      {/* ── Security & Interactions Sub-Panel ── */}
      {tab === "audit" && (
        <div className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 glow-card">
        <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-300 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-400" />
          Security Footprint & Interactions (Last 25 Tx)
        </h3>
        
        {data.recentInteractions && data.recentInteractions.length > 0 ? (
          <div className="space-y-3">
            {data.recentInteractions.map((interaction, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl border bg-zinc-900/40 border-zinc-800/80 flex items-start justify-between gap-4 transition-all hover:bg-zinc-900/60"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {interaction.type === "drainer" || interaction.type === "attacker" ? (
                      <ShieldAlert className="w-5 h-5 text-rose-500" />
                    ) : interaction.type === "mixer" ? (
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                    ) : (
                      <Info className="w-5 h-5 text-indigo-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-200">
                      {interaction.name}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">{interaction.description}</p>
                    <div className="flex items-center gap-4 mt-2 flex-wrap text-[10px] font-mono text-zinc-500">
                      <span>Address: <span className="text-zinc-400 select-all">{interaction.address.slice(0, 8)}...{interaction.address.slice(-8)}</span></span>
                      {interaction.timestamp && <span>Time: <span className="text-zinc-400">{interaction.timestamp}</span></span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest border ${
                    interaction.type === "drainer" || interaction.type === "attacker" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                    interaction.type === "mixer" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                    "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                  }`}>
                    {interaction.type}
                  </span>
                  {interaction.signature && interaction.signature !== "Active Holding" && (
                    <a
                      href={`https://solscan.io/tx/${interaction.signature}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-zinc-500 hover:text-white transition-colors"
                      title="View Tx on Solscan"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 flex items-center gap-4">
            <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-emerald-400">Interaction Scan Clear</h4>
              <p className="text-[11px] text-zinc-500 mt-0.5">No recent transactions or token holdings associated with known mixers, drainers, or scam contracts detected.</p>
            </div>
          </div>
        )}
      </div>
      )}

      {/* ── Token Holdings Table ── */}
      {tab === "holdings" && (
        <div className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl overflow-hidden glow-card">
        <div className="px-6 py-5 border-b border-zinc-800/50 flex items-center justify-between">
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-300 flex items-center gap-2">
            <Coins className="w-5 h-5 text-brand-primary" />
            Token Holdings
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
              {data.tokenHoldings.length} assets · ≥$10
            </span>
          </div>
        </div>

        {data.tokenHoldings.length > 0 ? (
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
                {data.tokenHoldings.map((token, idx) => {
                  const pct = data.totalValueUSD > 0 ? (token.valueUSD / data.totalValueUSD) * 100 : 0;
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
                          {token.balance.toLocaleString(undefined, { maximumFractionDigits: token.decimals > 4 ? 4 : token.decimals })}
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
            <h4 className="text-zinc-400 font-bold">No Meaningful Holdings</h4>
            <p className="text-xs text-zinc-600 max-w-xs">
              This wallet holds no SPL tokens with a current value above $10.
              Dust tokens are automatically filtered.
            </p>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
