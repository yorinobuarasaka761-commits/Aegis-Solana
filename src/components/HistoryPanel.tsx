"use client";

import { useState } from "react";
import { History, Wallet, Coins, Trash2, RotateCcw, Clock } from "lucide-react";
import { ScanResult } from "@/lib/types";

export interface HistoryItem {
    address: string;
    score: number;
    type: "wallet" | "token";
    timestamp: string;
    fullData?: ScanResult;
}

interface HistoryPanelProps {
    history: HistoryItem[];
    onSelect: (address: string, type: "wallet" | "token", forceRefresh?: boolean) => void;
    onDelete: (index: number) => void;
    onClearAll: () => void;
}

type TypeFilter = "all" | "wallet" | "token";

export default function HistoryPanel({ history, onSelect, onDelete, onClearAll }: HistoryPanelProps) {
    const [filter, setFilter] = useState<TypeFilter>("all");

    // Filter history based on selected type
    const filteredHistory = history.filter((item) => {
        if (filter === "all") return true;
        return item.type === filter;
    });

    const truncateAddress = (addr: string) => {
        if (addr.length <= 12) return addr;
        return `${addr.substring(0, 6)}...${addr.substring(addr.length - 6)}`;
    };

    return (
        <div className="w-full bg-[#0B0F1A]/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl glow-card shadow-2xl overflow-hidden h-full flex flex-col">
            {/* Header section */}
            <div className="px-6 py-5 border-b border-zinc-800/80 bg-[#0e1424]/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-brand-primary" />
                    <h3 className="text-base font-bold text-white uppercase tracking-wider">Historical Audit Logs</h3>
                </div>
                {history.length > 0 && (
                    <button
                        onClick={onClearAll}
                        className="text-[10px] text-zinc-500 hover:text-rose-400 font-extrabold uppercase tracking-widest transition-colors"
                    >
                        Clear All
                    </button>
                )}
            </div>

            {/* Filter Pills */}
            <div className="p-4 border-b border-zinc-800/50 flex items-center gap-2">
                <button
                    onClick={() => setFilter("all")}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${
                        filter === "all"
                            ? "bg-zinc-800 border-zinc-700 text-white"
                            : "bg-zinc-950/20 border-zinc-900/60 text-zinc-500 hover:border-zinc-800 hover:text-zinc-400"
                    }`}
                >
                    All ({history.length})
                </button>
                <button
                    onClick={() => setFilter("wallet")}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border flex items-center justify-center gap-1.5 transition-all ${
                        filter === "wallet"
                            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                            : "bg-zinc-950/20 border-zinc-900/60 text-zinc-500 hover:border-zinc-800 hover:text-zinc-400"
                    }`}
                >
                    <Wallet className="w-3.5 h-3.5" />
                    Wallets
                </button>
                <button
                    onClick={() => setFilter("token")}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider border flex items-center justify-center gap-1.5 transition-all ${
                        filter === "token"
                            ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                            : "bg-zinc-950/20 border-zinc-900/60 text-zinc-500 hover:border-zinc-800 hover:text-zinc-400"
                    }`}
                >
                    <Coins className="w-3.5 h-3.5" />
                    Tokens
                </button>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto max-h-[350px] sm:max-h-none scrollbar p-4 space-y-3">
                {filteredHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-zinc-500 space-y-3">
                        <Clock className="w-7 h-7 text-zinc-700 animate-pulse" />
                        <p className="text-xs font-semibold leading-normal">
                            No past scans logged under this category. Perform scans to build history.
                        </p>
                    </div>
                ) : (
                    filteredHistory.map((item, index) => {
                        let scoreColor = "text-emerald-400";
                        let scoreBg = "bg-emerald-500/10";
                        if (item.score > 50) {
                            scoreColor = "text-rose-500";
                            scoreBg = "bg-rose-500/10";
                        } else if (item.score > 20) {
                            scoreColor = "text-amber-500";
                            scoreBg = "bg-amber-500/10";
                        }

                        return (
                            <div
                                key={index}
                                className="p-3 bg-zinc-950/40 border border-zinc-800/40 rounded-2xl flex items-center justify-between gap-3 hover-scale hover:border-zinc-700 transition-all group"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    {/* Icon badge */}
                                    <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-400">
                                        {item.type === "wallet" ? <Wallet className="w-4 h-4 text-emerald-400" /> : <Coins className="w-4 h-4 text-amber-500" />}
                                    </div>
                                    <div className="min-w-0">
                                        <div
                                            onClick={() => onSelect(item.address, item.type)}
                                            className="text-xs font-semibold text-zinc-200 hover:text-white cursor-pointer truncate transition-colors"
                                        >
                                            {truncateAddress(item.address)}
                                        </div>
                                        <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mt-0.5">
                                            {item.timestamp}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Score bubble */}
                                    <span className={`w-8 h-8 rounded-lg ${scoreBg} ${scoreColor} font-bold text-[10px] flex items-center justify-center border border-white/5`}>
                                        {item.score}
                                    </span>

                                    {/* Action Buttons visible on hover */}
                                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => onSelect(item.address, item.type, true)}
                                            title="Reload scan"
                                            className="p-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                // Find actual index in parent history array
                                                const parentIndex = history.findIndex(h => h.address === item.address && h.timestamp === item.timestamp);
                                                if (parentIndex !== -1) onDelete(parentIndex);
                                            }}
                                            title="Remove from history"
                                            className="p-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-zinc-400 hover:text-rose-400 hover:border-rose-950 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
