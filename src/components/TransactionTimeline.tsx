"use client";

import { TransactionActivity } from "@/lib/types";
import { ArrowUpRight, ArrowDownRight, ArrowLeftRight, FileCode2, ExternalLink, Activity } from "lucide-react";

interface TransactionTimelineProps {
  activities: TransactionActivity[];
}

export default function TransactionTimeline({ activities }: TransactionTimelineProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-14 text-center flex flex-col items-center justify-center gap-3 glow-card">
        <Activity className="w-12 h-12 text-zinc-800 animate-pulse" />
        <h4 className="text-zinc-400 font-bold">No Recent Activity Found</h4>
        <p className="text-xs text-zinc-600 max-w-xs">
          We couldn&apos;t resolve recent signatures or transfers for this address.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0F1A]/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 glow-card">
      <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-300 mb-6 flex items-center gap-2">
        <Activity className="w-5 h-5 text-indigo-400" />
        On-Chain Transaction History (Last 10 Tx)
      </h3>

      <div className="relative border-l border-zinc-800/80 ml-4 pl-6 space-y-6">
        {activities.map((act, idx) => {
          let badgeColor = "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
          let Icon = FileCode2;
          let iconColor = "text-zinc-400";
          let timelineDotBg = "bg-zinc-800 border-zinc-700";

          if (act.type === "transfer_in") {
            badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            Icon = ArrowDownRight;
            iconColor = "text-emerald-400";
            timelineDotBg = "bg-emerald-950 border-emerald-500";
          } else if (act.type === "transfer_out") {
            badgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/20";
            Icon = ArrowUpRight;
            iconColor = "text-rose-400";
            timelineDotBg = "bg-rose-950 border-rose-500";
          } else if (act.type === "swap") {
            badgeColor = "bg-purple-500/10 text-purple-400 border-purple-500/20";
            Icon = ArrowLeftRight;
            iconColor = "text-purple-400";
            timelineDotBg = "bg-purple-950 border-purple-500";
          }

          return (
            <div key={idx} className="relative group">
              {/* Timeline marker */}
              <div className={`absolute -left-[31px] top-1.5 w-3 h-3 rounded-full border-2 ${timelineDotBg} transition-all duration-300 group-hover:scale-125`} />

              <div className="p-4 rounded-2xl border bg-zinc-900/40 border-zinc-800/80 flex items-start justify-between gap-4 transition-all hover:bg-zinc-900/60 hover:-translate-y-0.5">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-xl bg-zinc-950/40 border border-zinc-800/50 ${iconColor} shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-200">
                      {act.typeName}
                    </h4>
                    {act.amount && (
                      <p className="font-mono text-xs text-white font-semibold mt-1">
                        {act.amount}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 flex-wrap text-[10px] font-mono text-zinc-500">
                      <span>Status: <span className={act.status === "success" ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>{act.status}</span></span>
                      <span>Time: <span className="text-zinc-400">{act.timestamp}</span></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest border ${badgeColor}`}>
                    {act.type.replace("_", " ")}
                  </span>
                  <a
                    href={`https://solscan.io/tx/${act.signature}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 text-zinc-500 hover:text-white transition-colors"
                    title="View Tx on Solscan"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
