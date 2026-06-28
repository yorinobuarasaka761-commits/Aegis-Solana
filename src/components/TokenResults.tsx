import { TokenData } from "@/lib/types";
import { ShieldAlert, AlertTriangle, Info, ShieldCheck, Database, FileCode2, LineChart, Droplets, ExternalLink, Activity } from "lucide-react";
import { formatUSD, formatUSDPrice } from "@/lib/prices";

export default function TokenResults({ data, tab = "audit" }: { data: TokenData; tab?: "audit" | "holdings" }) {
  return (
    <div className="space-y-6">
      {/* Holdings / Contract Info Tab */}
      {tab === "holdings" && (
        <>
          {/* Live Market Data Section (Raydium) */}
          <div className="bg-gradient-to-br from-[#0B0F1A] to-[#1a142c] border border-brand-primary/20 rounded-3xl p-6 glow-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-brand-primary flex items-center gap-2">
                <LineChart className="w-5 h-5" />
                Live Market Data
              </h3>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 text-[10px] font-extrabold uppercase tracking-widest">
                  Raydium
                </span>
                {data.dexUrl && (
                  <a 
                    href={data.dexUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-wider active-tactile"
                  >
                    Trade <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  Price (USD)
                </div>
                <div className="font-mono text-xl font-bold text-white">
                  {data.priceUsd || data.currentPriceUSD ? (
                    formatUSDPrice(data.priceUsd || data.currentPriceUSD)
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </div>
              </div>
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> 24h Volume
                </div>
                <div className="font-mono text-xl font-bold text-emerald-400">
                  ${data.volume24h ? data.volume24h.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0"}
                </div>
              </div>
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-cyan-500" /> Liquidity
                </div>
                <div className="font-mono text-xl font-bold text-cyan-400">
                  ${data.liquidity ? data.liquidity.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0"}
                </div>
              </div>
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  FDV / Market Cap
                </div>
                <div className="font-mono text-xl font-bold text-zinc-300">
                  {data.fdv || data.marketCapUSD ? (
                    `$${(data.fdv || data.marketCapUSD).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Token Supply Meta */}
          <div className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 glow-card">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-300 mb-6 flex items-center gap-2">
              <Database className="w-5 h-5 text-zinc-400" />
              Token Supply Meta
            </h3>
            <div className="space-y-5">
              <div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Circulating Supply</div>
                <div className="font-mono text-lg text-white">{data.supply.toLocaleString()} <span className="text-zinc-500 text-sm ml-1">{data.symbol}</span></div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Token Decimals</div>
                <div className="font-mono text-zinc-300">{data.decimals}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Current Price (Jupiter)</div>
                <div className="font-mono text-lg text-white">
                  {data.currentPriceUSD > 0 ? formatUSD(data.currentPriceUSD) : <span className="text-zinc-500 text-sm">Not Listed</span>}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Market Cap (Jupiter)</div>
                <div className="font-mono text-lg text-white">
                  {data.marketCapUSD > 0 ? formatUSD(data.marketCapUSD) : <span className="text-zinc-500 text-sm">Unknown</span>}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Jupiter Verification</div>
                <div className="mt-1">
                  {data.isVerified ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold uppercase tracking-widest">
                      Verified Strict
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-extrabold uppercase tracking-widest">
                      Unverified / Unknown
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Security Audit Tab */}
      {tab === "audit" && (
        <>
          {/* Smart Contract Authorities */}
          <div className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 glow-card">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-300 mb-6 flex items-center gap-2">
              <FileCode2 className="w-5 h-5 text-indigo-500" />
              Smart Contract Authorities
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-4 rounded-2xl border bg-zinc-900/50 border-zinc-800/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Mint Authority</span>
                  {data.mintAuthority ? (
                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-rose-500/20 text-rose-400 uppercase">Active</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/20 text-emerald-400 uppercase">Renounced</span>
                  )}
                </div>
                <div className="font-mono text-[10px] text-zinc-500 truncate select-all">
                  {data.mintAuthority || "None (0x0000...)"}
                </div>
              </div>

              <div className="p-4 rounded-2xl border bg-zinc-900/50 border-zinc-800/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Freeze Authority</span>
                  {data.freezeAuthority ? (
                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-rose-500/20 text-rose-400 uppercase">Active</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/20 text-emerald-400 uppercase">Renounced</span>
                  )}
                </div>
                <div className="font-mono text-[10px] text-zinc-500 truncate select-all">
                  {data.freezeAuthority || "None (0x0000...)"}
                </div>
              </div>

              <div className="p-4 rounded-2xl border bg-zinc-900/50 border-zinc-800/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Update Authority</span>
                  {data.updateAuthority ? (
                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/10 text-amber-500 uppercase">Active - Warning</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/20 text-emerald-400 uppercase">Renounced</span>
                  )}
                </div>
                <div className="font-mono text-[10px] text-zinc-500 truncate select-all">
                  {data.updateAuthority || "None (0x0000...)"}
                </div>
              </div>
            </div>
          </div>

          {/* Risk Flags Section */}
          {data.riskFlags.length > 0 ? (
            <div className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 glow-card">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-300 mb-4 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                Contract Risk Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.riskFlags.map((flag, idx) => (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-2xl border flex items-start gap-4 transition-all ${
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
                      }`}>
                        {flag.label}
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1">{flag.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-3xl p-6 flex items-center gap-4">
              <ShieldCheck className="w-8 h-8 text-emerald-500" />
              <div>
                <h3 className="text-sm font-bold text-emerald-400">Perfect Contract Score</h3>
                <p className="text-xs text-zinc-500 mt-1">This token mint is fully renounced, verified, and has no associated warning flags.</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
