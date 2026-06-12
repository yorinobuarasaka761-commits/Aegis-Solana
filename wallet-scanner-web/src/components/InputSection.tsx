"use client";

import { useState, useEffect } from "react";
import { Search, Compass, Wallet, Coins } from "lucide-react";

interface InputSectionProps {
    onScan: (address: string, mode: "auto" | "wallet" | "token") => void;
    isLoading: boolean;
    initialAddress?: string;
}

type ScanMode = "auto" | "wallet" | "token";

export default function InputSection({ onScan, isLoading, initialAddress }: InputSectionProps) {
    const [address, setAddress] = useState(initialAddress || "");
    const [mode, setMode] = useState<ScanMode>("auto");

    useEffect(() => {
        if (initialAddress !== undefined) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setAddress(initialAddress);
        }
    }, [initialAddress]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (address.trim() && !isLoading) {
            onScan(address.trim(), mode);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Quick-select Pills for Auto-detection */}
            <div className="flex justify-center items-center gap-2 flex-wrap">
                <button
                    type="button"
                    onClick={() => setMode("auto")}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-all duration-300 active-tactile ${
                        mode === "auto"
                            ? "bg-brand-primary/20 border-brand-primary text-brand-primary shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                            : "bg-zinc-950/40 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                    }`}
                >
                    <Compass className="w-3.5 h-3.5" />
                    Auto-Detect
                </button>
                <button
                    type="button"
                    onClick={() => setMode("wallet")}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-all duration-300 active-tactile ${
                        mode === "wallet"
                            ? "bg-emerald-500/10 border-emerald-500/80 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                            : "bg-zinc-950/40 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                    }`}
                >
                    <Wallet className="w-3.5 h-3.5" />
                    Wallet
                </button>
                <button
                    type="button"
                    onClick={() => setMode("token")}
                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-all duration-300 active-tactile ${
                        mode === "token"
                            ? "bg-amber-500/10 border-amber-500/80 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                            : "bg-zinc-950/40 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                    }`}
                >
                    <Coins className="w-3.5 h-3.5" />
                    Token
                </button>
            </div>

            <form onSubmit={handleSubmit} className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-0">
                <div className="relative w-full shadow-[0_4px_30px_rgba(0,0,0,0.4)] rounded-2xl">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                        <Search className="w-5 h-5 text-zinc-500" />
                    </div>
                    <input
                        type="text"
                        className="w-full py-4 pl-12 pr-4 sm:pr-36 text-sm sm:text-base bg-[#090C15]/80 backdrop-blur-xl border border-zinc-800/80 rounded-2xl focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all placeholder:text-zinc-500 text-white font-medium"
                        placeholder={
                            mode === "auto"
                                ? "Paste Solana address..."
                                : mode === "wallet"
                                ? "Paste wallet address..."
                                : "Paste token mint address..."
                        }
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !address.trim()}
                        className="hidden sm:block absolute right-2.5 top-2.5 bottom-2.5 px-5 bg-gradient-to-r from-brand-primary to-indigo-600 hover:from-brand-primary/95 hover:to-indigo-600/95 text-white text-sm font-semibold rounded-xl transition-all hover:shadow-[0_0_15px_rgba(139,92,246,0.25)] hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none active-tactile"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                Scanning...
                            </span>
                        ) : (
                            "Scan"
                        )}
                    </button>
                </div>
                {/* Mobile-only full-width button */}
                <button
                    type="submit"
                    disabled={isLoading || !address.trim()}
                    className="sm:hidden w-full py-4 bg-gradient-to-r from-brand-primary to-indigo-600 text-white text-sm font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active-tactile flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            Auditing...
                        </>
                    ) : (
                        <><Search className="w-4 h-4" /> Initiate Scan</>
                    )}
                </button>
            </form>
        </div>
    );
}
