"use client";

import { ParsedTransaction, TransactionType } from "@/lib/types";
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight, FileCode2, ExternalLink, Activity, ShieldAlert } from "lucide-react";

interface Props {
  transactions: ParsedTransaction[];
  walletAddress: string;
}

const TYPE_CONFIG: Record<TransactionType, { label: string; badgeColor: string; iconColor: string; timelineDotBg: string; Icon: any }> = {
  SOL_TRANSFER_IN: {
    label: "Received SOL",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    iconColor: "text-emerald-400",
    timelineDotBg: "bg-emerald-950 border-emerald-500",
    Icon: ArrowDownRight,
  },
  SOL_TRANSFER_OUT: {
    label: "Sent SOL",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    iconColor: "text-rose-400",
    timelineDotBg: "bg-rose-950 border-rose-500",
    Icon: ArrowUpRight,
  },
  TOKEN_TRANSFER: {
    label: "Token Transfer",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    iconColor: "text-purple-400",
    timelineDotBg: "bg-purple-950 border-purple-500",
    Icon: ArrowLeftRight,
  },
  SWAP: {
    label: "Swap",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    iconColor: "text-amber-400",
    timelineDotBg: "bg-amber-950 border-amber-500",
    Icon: ArrowLeftRight,
  },
  CONTRACT_INTERACTION: {
    label: "Contract",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    iconColor: "text-blue-400",
    timelineDotBg: "bg-blue-950 border-blue-500",
    Icon: FileCode2,
  },
  UNKNOWN: {
    label: "Unknown",
    badgeColor: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    iconColor: "text-zinc-400",
    timelineDotBg: "bg-zinc-800 border-zinc-700",
    Icon: FileCode2,
  },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "Just now";
}

function shortSig(sig: string): string {
  return sig.slice(0, 8) + "..." + sig.slice(-6);
}

function shortAddr(addr: string): string {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export default function TransactionTimeline({ transactions, walletAddress }: Props) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-14 text-center flex flex-col items-center justify-center gap-3 glow-card">
        <Activity className="w-12 h-12 text-zinc-800 animate-pulse" />
        <h4 className="text-zinc-400 font-bold">No Recent Activity Found</h4>
        <p className="text-xs text-zinc-600 max-w-xs">
          We couldn&apos;t resolve recent transactions for this address.
        </p>
      </div>
    );
  }

  const maliciousCount = transactions.filter((t) => t.isMalicious).length;

  return (
    <div className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 glow-card">
      {/* Header Summary Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/50 pb-4 mb-6">
        <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-300 flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-400" />
          On-Chain Transaction History (Last {transactions.length} Tx)
        </h3>
        {maliciousCount > 0 && (
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            {maliciousCount} MALICIOUS INTERACTION{maliciousCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Transaction List Timeline */}
      <div className="relative border-l border-zinc-800/80 ml-4 pl-6 space-y-6">
        {transactions.map((tx, idx) => {
          const config = TYPE_CONFIG[tx.type] || TYPE_CONFIG.UNKNOWN;
          const Icon = config.Icon;

          return (
            <div key={idx} className="relative group">
              {/* Timeline marker dot */}
              <div className={`absolute -left-[31px] top-1.5 w-3 h-3 rounded-full border-2 ${tx.isMalicious ? "bg-rose-950 border-rose-500 animate-pulse scale-110" : config.timelineDotBg} transition-all duration-300 group-hover:scale-125`} />

              {/* Card Container */}
              <div
                className={`p-4 rounded-2xl border transition-all duration-300 flex items-start justify-between gap-4 hover:-translate-y-0.5 ${
                  tx.isMalicious
                    ? "bg-rose-950/15 border-rose-500/30 hover:bg-rose-950/25"
                    : tx.status === "FAILED"
                    ? "bg-zinc-900/20 border-zinc-800/40 opacity-60 hover:opacity-85"
                    : "bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900/60"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon Box */}
                  <div className={`p-2 rounded-xl bg-zinc-950/40 border border-zinc-800/50 shrink-0 ${tx.isMalicious ? "text-rose-400 border-rose-500/30" : config.iconColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    {/* Activity Header */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-zinc-200">
                        {config.label}
                      </h4>
                      {tx.status === "FAILED" && (
                        <span className="text-[8px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          FAILED
                        </span>
                      )}
                    </div>

                    {/* Counterparty details */}
                    {tx.counterparty ? (
                      <p className="font-mono text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
                        {tx.isMalicious && (
                          <span className="text-rose-400 font-bold" title={tx.maliciousLabel}>🚨 Flagged:</span>
                        )}
                        <span className="text-zinc-300 select-all">{shortAddr(tx.counterparty)}</span>
                        {tx.maliciousLabel && (
                          <span className="ml-1.5 text-xs text-rose-400 font-semibold not-italic">
                            · {tx.maliciousLabel}
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-500 mt-1">No counterparty resolved</p>
                    )}

                    {/* Details row */}
                    <div className="flex items-center gap-4 mt-2.5 flex-wrap text-[10px] font-mono text-zinc-500">
                      <span>Tx: <span className="text-zinc-400 select-all">{shortSig(tx.signature)}</span></span>
                      <span>Time: <span className="text-zinc-400">{timeAgo(tx.timestamp)}</span></span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Badges & SOL amounts */}
                <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest border ${tx.isMalicious ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : config.badgeColor}`}>
                      {tx.type.replace("_", " ")}
                    </span>
                    <a
                      href={`https://solscan.io/tx/${tx.signature}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-zinc-500 hover:text-white transition-colors"
                      title="View Tx on Solscan"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {tx.amountSOL && tx.amountSOL > 0 ? (
                    <p className={`font-mono text-xs font-bold mt-2 ${tx.type === "SOL_TRANSFER_IN" ? "text-emerald-400" : "text-rose-400"}`}>
                      {tx.type === "SOL_TRANSFER_IN" ? "+" : "-"}
                      {tx.amountSOL.toFixed(4)} SOL
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
