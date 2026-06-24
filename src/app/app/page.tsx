"use client";

import { useState, useEffect } from "react";
import InputSection from "@/components/InputSection";
import RiskGauge from "@/components/RiskGauge";
import WalletResults from "@/components/WalletResults";
import TokenResults from "@/components/TokenResults";
import HistoryPanel, { HistoryItem } from "@/components/HistoryPanel";
import HoldingsList from "@/components/HoldingsList";
import TransactionTimeline from "@/components/TransactionTimeline";
import TokenTradesPanel from "@/components/TokenTradesPanel";
import { 
  Database, Network, FileText, AlertCircle, ArrowLeft, Activity
} from "lucide-react";
import { ScanResult } from "@/lib/types";
import Link from "next/link";
import LiveTicker from "@/components/LiveTicker";
import ThemeToggle from "@/components/ThemeToggle";

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);



const DEFAULT_PRELOADED_RESULT: ScanResult = {
  address: "FZn8XbGgp3MMfKELH3k5JxzMHqL8jdMrFfEV37pcpump",
  type: "token",
  riskScore: 15,
  riskLabel: "LOW",
  scannedAt: new Date().toISOString(),
  recentActivity: [],
  tokenTrades: [], // Populated live via /api/trades — no fake data
  token: {
    name: "Staring Cat",
    symbol: "Gusic",
    decimals: 6,
    supply: 999994383.44,
    mintAuthority: null,
    freezeAuthority: null,
    updateAuthority: null,
    isVerified: false,
    metadataUri: "https://cdn.dexscreener.com/cms/images/WQYDu_UesChDqbuz?width=800&height=800&quality=95&format=auto",
    priceUsd: 0.00006881,
    volume24h: 167506.48,
    liquidity: 27573.79,
    fdv: 68818,
    dexUrl: "https://dexscreener.com/solana/69dnb69d4pqfbe3x45zqd3q3ub1oambsxzizvnyixahh",
    pairAddress: "69dnb69d4pqfbe3x45zqd3q3ub1oambsxzizvnyixahh",
    riskFlags: [
      { label: "Mint authority renounced", severity: "INFO", description: "Token supply is fixed." },
      { label: "Freeze authority renounced", severity: "INFO", description: "Token balances cannot be frozen." },
      { label: "Token not in Jupiter verified list", severity: "WARNING", description: "This token is not strictly verified by Jupiter." }
    ]
  }
};

export default function ScannerApp() {
    const [result, setResult] = useState<ScanResult | null>(DEFAULT_PRELOADED_RESULT);
    const [isLoading, setIsLoading] = useState(false);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);
    
    // UI Navigation States
    const [activeTab, setActiveTab] = useState<"audit" | "holdings" | "activity">("audit");

    // Trade refresh state
    const [tradesRefreshedAt, setTradesRefreshedAt] = useState<Date | null>(null);
    const [isRefreshingTrades, setIsRefreshingTrades] = useState(false);
    const [tradesError, setTradesError] = useState<string | null>(null);

    // ── Auto-refresh token trades every 30 seconds ─────────────────────────
    useEffect(() => {
        if (!result || result.type !== "token" || activeTab !== "activity") return;

        const tokenAddress = result.address;
        const pairAddress = result.token?.pairAddress;
        const tokenSymbol = result.token?.symbol || "TOKEN";

        const fetchTrades = async () => {
            setIsRefreshingTrades(true);
            try {
                const res = await fetch("/api/trades", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tokenAddress, pairAddress, tokenSymbol }),
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.trades && Array.isArray(data.trades)) {
                        setResult((prev) => prev ? { ...prev, tokenTrades: data.trades } : prev);
                        setTradesRefreshedAt(new Date());
                        setTradesError(null);
                    }
                } else {
                    const data = await res.json().catch(() => ({}));
                    setTradesError(data.error || "Failed to fetch recent trades.");
                }
            } catch (e) {
                console.error("Trade refresh failed:", e);
                setTradesError("Connection lost. Retrying...");
            } finally {
                setIsRefreshingTrades(false);
            }
        };

        // Fetch immediately when switching to activity tab
        fetchTrades();

        // Then poll every 30 seconds
        const interval = setInterval(fetchTrades, 30_000);
        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [result?.address, activeTab, result?.type]);
    // ──────────────────────────────────────────────────────────────────────

    // Load history on mount
    useEffect(() => {
        const storedHistory = localStorage.getItem("aegis_scan_history");
        if (storedHistory) {
            try {
                setHistory(JSON.parse(storedHistory));
            } catch (e) {
                console.error("Failed to parse history:", e);
            }
        }
    }, []);

    // Save history helper
    const saveHistory = (newHistory: HistoryItem[]) => {
        setHistory(newHistory);
        localStorage.setItem("aegis_scan_history", JSON.stringify(newHistory));
    };

    const handleScan = async (address: string, mode: "auto" | "wallet" | "token" = "auto") => {
        setIsLoading(true);
        setError(null);
        setResult(null);
        setTradesError(null);
        setTradesRefreshedAt(null);

        try {
            const res = await fetch("/api/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address, mode }),
            });
            
            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || "Failed to scan address.");
            }
            
            setResult(data);
            setActiveTab("audit");
            if (data.type !== "unknown" && data.type !== "program") {
                const newHistoryItem: HistoryItem = {
                    address: data.address,
                    score: data.riskScore,
                    type: data.type,
                    timestamp: "Just now",
                    fullData: data
                };

                const filteredHistory = history.filter(h => h.address !== data.address);
                saveHistory([newHistoryItem, ...filteredHistory].slice(0, 10)); // Limit to 10 logs
            }
            
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : "An error occurred while scanning.";
            setError(errorMsg);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectHistory = (address: string, type: "wallet" | "token", forceRefresh: boolean = false) => {
        const cachedItem = history.find(h => h.address === address);
        if (cachedItem && cachedItem.fullData && !forceRefresh) {
            setResult(cachedItem.fullData);
            setActiveTab("audit");
            return;
        }
        handleScan(address, type);
    };

    const handleDeleteHistory = (index: number) => {
        const newHistory = [...history];
        newHistory.splice(index, 1);
        saveHistory(newHistory);
    };

    const handleClearHistory = () => {
        saveHistory([]);
    };

    return (
        <div className="min-h-screen bg-[#06080F] text-zinc-100 font-sans antialiased selection:bg-brand-primary/30 selection:text-white">
            
            {/* Header */}
            <header className="border-b border-white/[0.05] bg-[#070A12]/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3 sm:py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link href="/" className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/5 transition-colors text-zinc-400 hover:text-white mr-1 sm:mr-2 active-tactile -ml-2 shrink-0" title="Back to home">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center border border-white/10 shadow-md shrink-0">
                            <img src="/logo.png" alt="Aegis Logo" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <span className="font-barlow font-bold text-sm sm:text-base tracking-wider text-white">
                                AEGIS<span className="bg-gradient-to-r from-brand-primary to-purple-400 bg-clip-text text-transparent ml-0.5">SHIELD</span>
                            </span>
                            <div className="text-[7px] sm:text-[7.5px] text-zinc-500 font-mono font-bold uppercase tracking-[0.2em] -mt-0.5">
                                Interactive Terminal
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 sm:gap-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
                        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981]">
                            <Network className="w-3.5 h-3.5" />
                            Mainnet RPC Active
                        </div>
                        <ThemeToggle />
                        <a
                            href="https://aegis-solana.gitbook.io/aegissolana/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-9 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-hover)] hover:text-purple-400 bg-[var(--surface-elevated)] hover:bg-[var(--surface-card-hover)] text-[var(--text-muted)] transition-all duration-150 active-tactile shrink-0"
                        >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Docs</span>
                        </a>
                        <a
                            href="https://x.com/Aegis_solana"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-9 h-9 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-hover)] bg-[var(--surface-elevated)] hover:bg-[var(--surface-card-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all duration-150 active-tactile flex items-center justify-center shrink-0"
                            title="Official X @Aegis_solana"
                        >
                            <XIcon className="w-4 h-4 text-purple-400" />
                        </a>
                    </div>
                </div>
            </header>

            {/* --- Live Market & Scanner Ticker Marquee --- */}
            <LiveTicker />

            {/* Dashboard Workspace */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
                    {/* Left Panel: Local History Logs */}
                    <div className="lg:col-span-1 order-2 lg:order-1">
                        <HistoryPanel
                            history={history}
                            onSelect={handleSelectHistory}
                            onDelete={handleDeleteHistory}
                            onClearAll={handleClearHistory}
                        />
                    </div>

                    {/* Right Panel: Search & Results */}
                    <div className="lg:col-span-3 space-y-6 order-1 lg:order-2">
                        {/* Scanner Search Input */}
                        <InputSection 
                            onScan={(addr, mode) => handleScan(addr, mode)} 
                            isLoading={isLoading} 
                            initialAddress={result?.address}
                        />

                        {/* Scan Error Banner */}
                        {error && (
                            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center gap-2 text-xs font-mono tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.05)]">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Scanner Loading State */}
                        {isLoading && (
                            <div className="h-[350px] relative border border-white/[0.06] bg-[#0B0F1A]/80 backdrop-blur-xl rounded-3xl flex flex-col items-center justify-center gap-4 overflow-hidden">
                                <div className="scan-laser" />
                                <div className="relative w-12 h-12 rounded-full border-2 border-brand-primary border-t-transparent animate-spin flex items-center justify-center" />
                                <div className="text-center">
                                    <p className="font-mono text-xs text-white uppercase tracking-widest animate-pulse">Running Multi-Layered Audits...</p>
                                    <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-1">Inspecting Ledger</p>
                                </div>
                            </div>
                        )}

                        {/* Scan Results Viewport */}
                        {result && !isLoading && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                                
                                {/* Top Stats Summary Card */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Risk Gauge */}
                                    <div className="md:col-span-1 bg-[#0B0F1A]/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 glow-card flex flex-col items-center justify-center">
                                        <RiskGauge score={result.riskScore} label={result.riskLabel} />
                                    </div>

                                    {/* Metadata */}
                                    <div className="md:col-span-2 bg-[#0B0F1A]/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 glow-card flex flex-col justify-between">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between border-b border-zinc-800/50 pb-3">
                                                <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                                                    Scan Profile Metadata
                                                </span>
                                                <span className={`px-2.5 py-1 rounded-xl text-[9px] font-mono font-extrabold uppercase tracking-widest border ${
                                                    result.type === "wallet"
                                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                        : result.type === "token" ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                                        : "bg-zinc-800 text-zinc-400 border-zinc-700"
                                                }`}>
                                                    {result.type === "wallet" ? "Personal Wallet" : result.type === "token" ? "Token Mint Contract" : "Unknown / Program"}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                                <div className="space-y-1">
                                                    <span className="text-zinc-500 font-mono uppercase tracking-wider text-[8px]">
                                                        Verified On-Chain Address
                                                    </span>
                                                    <p className="font-mono text-zinc-300 select-all truncate text-[11px]">
                                                        {result.address}
                                                    </p>
                                                </div>
                                                
                                                {result.type === "unknown" && (
                                                    <div className="space-y-1">
                                                        <span className="text-zinc-500 font-mono uppercase tracking-wider text-[8px]">
                                                            System Status
                                                        </span>
                                                        <p className="font-bold text-amber-400 text-[11px] font-mono">
                                                            No Data Found
                                                        </p>
                                                    </div>
                                                )}

                                                {result.type === "wallet" && result.wallet && (
                                                    <div className="space-y-1">
                                                        <span className="text-zinc-500 font-mono uppercase tracking-wider text-[8px]">
                                                            Current SOL Balance
                                                        </span>
                                                        <p className="font-bold text-white font-mono text-[11px]">
                                                            {result.wallet.solBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL
                                                        </p>
                                                    </div>
                                                )}

                                                {result.type === "token" && result.token && (
                                                    <div className="space-y-1">
                                                        <span className="text-zinc-500 font-mono uppercase tracking-wider text-[8px]">
                                                            Token Profile Descriptor
                                                        </span>
                                                        <p className="font-bold text-white font-mono text-[11px]">
                                                            {result.token.name} ({result.token.symbol})
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="space-y-1">
                                                    <span className="text-zinc-500 font-mono uppercase tracking-wider text-[8px]">
                                                        Scan Timestamp
                                                    </span>
                                                    <p className="font-mono text-zinc-400 truncate text-[11px]">
                                                         {mounted && result ? new Date(result.scannedAt).toLocaleString() : ""}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Security Stamp Footer */}
                                        <div className="mt-6 pt-4 border-t border-zinc-800/40 flex items-center justify-between text-[8px] font-mono text-zinc-500 uppercase tracking-widest">
                                            <span>Scan status: Live On-Chain Data</span>
                                            {result.error ? (
                                                <span className="text-rose-500 font-bold">{result.error}</span>
                                            ) : (
                                                <span className="text-brand-primary font-bold">Audit verified successfully</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Dashboards tabs for details */}
                                {(result.type === "wallet" || result.type === "token") && (
                                    <div className="space-y-6">
                                        <div className="flex border-b border-zinc-800/80 gap-6">
                                            <button
                                                onClick={() => setActiveTab("audit")}
                                                className={`pb-4 text-[10px] font-mono font-extrabold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 active-tactile ${
                                                    activeTab === "audit"
                                                        ? "border-brand-primary text-white"
                                                        : "border-transparent text-zinc-500 hover:text-zinc-300"
                                                }`}
                                            >
                                                <FileText className="w-4 h-4" />
                                                Security Audit
                                            </button>
                                            
                                            <button
                                                onClick={() => setActiveTab("holdings")}
                                                className={`pb-4 text-[10px] font-mono font-extrabold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 active-tactile ${
                                                    activeTab === "holdings"
                                                        ? "border-brand-primary text-white"
                                                        : "border-transparent text-zinc-500 hover:text-zinc-300"
                                                }`}
                                            >
                                                <Database className="w-4 h-4" />
                                                {result.type === "token" ? "Contract Info" : "Holdings Portfolio"}
                                            </button>

                                            <button
                                                onClick={() => setActiveTab("activity")}
                                                className={`pb-4 text-[10px] font-mono font-extrabold uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 active-tactile ${
                                                    activeTab === "activity"
                                                        ? "border-brand-primary text-white"
                                                        : "border-transparent text-zinc-500 hover:text-zinc-300"
                                                }`}
                                            >
                                                <Activity className="w-4 h-4" />
                                                Recent Activity
                                            </button>
                                        </div>

                                        {/* Viewport content */}
                                        <div className="transition-all duration-300 min-h-[300px]">
                                            {activeTab === "audit" && result.type === "wallet" && result.wallet && (
                                                <div className="animate-in fade-in duration-300">
                                                    <WalletResults data={result.wallet} address={result.address} tab="audit" />
                                                </div>
                                            )}
                                            {activeTab === "holdings" && result.type === "wallet" && result.wallet && (
                                                <div className="animate-in fade-in duration-300">
                                                    <HoldingsList holdings={result.wallet.tokenHoldings} totalValueUSD={result.wallet.totalValueUSD} />
                                                </div>
                                            )}
                                            {activeTab === "activity" && result.type === "wallet" && result.wallet && (
                                                <div className="animate-in fade-in duration-300">
                                                    <TransactionTimeline
                                                        transactions={result.wallet.transactions || []}
                                                        walletAddress={result.address}
                                                    />
                                                </div>
                                            )}

                                            {activeTab === "audit" && result.type === "token" && result.token && (
                                                <div className="animate-in fade-in duration-300">
                                                     <TokenResults data={result.token} tab="audit" />
                                                </div>
                                            )}
                                            {activeTab === "holdings" && result.type === "token" && result.token && (
                                                <div className="animate-in fade-in duration-300">
                                                     <TokenResults data={result.token} tab="holdings" />
                                                </div>
                                            )}
                                            {activeTab === "activity" && result.type === "token" && (
                                                <div className="animate-in fade-in duration-300">
                                                    <TokenTradesPanel 
                                                        trades={result.tokenTrades || []} 
                                                        tokenSymbol={result.token?.symbol || "TOKEN"}
                                                        priceUsd={result.token?.priceUsd}
                                                        isRefreshing={isRefreshingTrades}
                                                        refreshedAt={tradesRefreshedAt}
                                                        error={tradesError}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/[0.05] bg-[#06080F] py-8 px-6 mt-20">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="relative w-6 h-6 rounded-lg overflow-hidden flex items-center justify-center border border-white/5 shrink-0">
                            <img src="/logo.png" alt="Aegis Logo" className="w-full h-full object-cover" />
                        </div>
                        <span className="font-barlow font-bold text-xs tracking-wider text-white">
                            AEGIS<span className="text-zinc-500">SOLANA</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-6">
                        <a
                            href="https://x.com/Aegis_solana"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[9px] text-zinc-400 hover:text-purple-400 transition-colors uppercase tracking-widest flex items-center gap-2 active-tactile"
                        >
                            <XIcon className="w-3.5 h-3.5 text-[#8b5cf6]" />
                            @Aegis_solana
                        </a>
                        <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                            © 2026 Aegis Shield · Secure Web3 Audits
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
