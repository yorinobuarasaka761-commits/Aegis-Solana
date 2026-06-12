"use client";

import { useRef, useState, useEffect } from "react";
import { 
  ShieldCheck, Database, Globe, Network, ArrowRightLeft, 
  FileText, ShieldAlert, ArrowDown, Activity as RadarIcon,
  Search, Shield, Coins, Wallet
} from "lucide-react";
import MatrixBackground from "@/components/MatrixBackground";
import LiveTicker from "@/components/LiveTicker";
import ThemeToggle from "@/components/ThemeToggle";

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const PAST_SCANS = [
  {
    id: "gusic",
    title: "Staring Cat (Gusic)",
    badge: "Token Audit",
    badgeColor: "text-amber-400 border-amber-500/20 bg-amber-500/10",
    image: "/gusic-scan.png",
    address: "FZn8XbGgp3MMfKELH3k5JxzMHqL8jdMrFfEV37pcpump",
    risk: "15 LOW RISK",
    riskColor: "text-emerald-400",
    icon: Coins,
    description: "SPL Token audit displaying renounced authorities, creator holdings, and active Raydium pool liquidity mapping."
  },
  {
    id: "usdc",
    title: "USDC Stablecoin",
    badge: "Safe Override",
    badgeColor: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
    image: "/usdc-scan.png",
    address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    risk: "0 SAFE",
    riskColor: "text-emerald-400",
    icon: Shield,
    description: "Verified stablecoin contract. Automated risk system overrides standard technical audits to prevent false positives."
  },
  {
    id: "token2022",
    title: "Token-2022 Contract",
    badge: "Mint Audit",
    badgeColor: "text-indigo-400 border-indigo-500/20 bg-indigo-500/10",
    image: "/token-2022-scan.png",
    address: "GVa4jr163EaBG1fv5hKFQbePKPojsoawuxdozcMSpump",
    risk: "15 LOW RISK",
    riskColor: "text-emerald-400",
    icon: Search,
    description: "Next-gen Solana Token-2022 program owner validation, total circulating supply, and freeze authority verification."
  },
  {
    id: "wallet",
    title: "Active Wallet Audit",
    badge: "Vulnerability Trace",
    badgeColor: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
    image: "/wallet-scan.png",
    address: "9zqre5sRRdFvKqyTyvEd1jcKDRF4g47s7mZSGUnQpump",
    risk: "0 SAFE",
    riskColor: "text-emerald-400",
    icon: Wallet,
    description: "Security footprint scanner audit checking the last 20 transaction signatures for mixer or hacker interactions."
  }
];





export default function Home() {
    // Scroll reference for preview section
    const previewRef = useRef<HTMLDivElement>(null);
    const [activeScanId, setActiveScanId] = useState("gusic");

    const [activeSection, setActiveSection] = useState("");

    const activeScan = PAST_SCANS.find(s => s.id === activeScanId) || PAST_SCANS[0];

    useEffect(() => {
        const observerOptions = {
            root: null,
            rootMargin: "-40% 0px -50% 0px", // focus area in center of viewport
            threshold: 0,
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.id);
                }
            });
        }, observerOptions);

        const sections = ["features", "engine", "scanner-preview"];
        sections.forEach((id) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const observerOptions = {
            root: null,
            rootMargin: "0px 0px -10% 0px", // triggers when 10% of element is in view
            threshold: 0.05,
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                }
            });
        }, observerOptions);

        const targets = document.querySelectorAll(".reveal-section");
        targets.forEach((t) => observer.observe(t));

        return () => observer.disconnect();
    }, []);

    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
        e.preventDefault();
        const element = document.getElementById(targetId);
        if (element) {
            const headerOffset = 90;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.scrollY - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
        }
    };

    const scrollToPreview = () => {
        const element = document.getElementById("scanner-preview");
        if (element) {
            const headerOffset = 90;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.scrollY - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
        }
    };

    return (
        <div className="min-h-screen bg-[#06080F] text-zinc-100 font-sans antialiased selection:bg-brand-primary/30 selection:text-white">
            
            {/* --- Navigation Bar --- */}
            <header className="border-b border-white/[0.05] bg-[#070A12]/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3 sm:py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="relative w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(139,92,246,0.2)] shrink-0">
                            <img src="/logo.png" alt="Aegis Logo" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <span className="font-barlow font-bold text-base sm:text-lg tracking-wider text-white">
                                AEGIS<span className="bg-gradient-to-r from-brand-primary to-purple-400 bg-clip-text text-transparent ml-0.5">SOLANA</span>
                            </span>
                            <div className="text-[7px] sm:text-[8px] text-zinc-500 font-mono font-bold uppercase tracking-[0.2em] -mt-0.5">
                                Risk Prevention Engine
                            </div>
                        </div>
                    </div>
                    
                    <nav className="hidden md:flex items-center gap-8 text-xs font-mono uppercase tracking-widest">
                        <a 
                            href="#features" 
                            onClick={(e) => handleNavClick(e, "features")}
                            className={`transition-colors active-tactile border-b py-1 ${
                                activeSection === "features" 
                                    ? "text-white font-bold border-brand-primary" 
                                    : "text-zinc-400 hover:text-white border-transparent"
                            }`}
                        >
                            Features
                        </a>
                        <a 
                            href="#engine" 
                            onClick={(e) => handleNavClick(e, "engine")}
                            className={`transition-colors active-tactile border-b py-1 ${
                                activeSection === "engine" 
                                    ? "text-white font-bold border-brand-primary" 
                                    : "text-zinc-400 hover:text-white border-transparent"
                            }`}
                        >
                            Risk Stack
                        </a>
                        <a 
                            href="#scanner-preview" 
                            onClick={(e) => handleNavClick(e, "scanner-preview")}
                            className={`transition-colors active-tactile border-b py-1 ${
                                activeSection === "scanner-preview" 
                                    ? "text-white font-bold border-brand-primary" 
                                    : "text-zinc-400 hover:text-white border-transparent"
                            }`}
                        >
                            Scan Preview
                        </a>
                    </nav>
                    
                    <div className="flex items-center gap-1.5 sm:gap-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981]">
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
                        <button 
                            disabled
                            className="h-9 px-3 sm:px-4 rounded-xl text-xs font-barlow font-bold uppercase tracking-widest text-zinc-500 bg-zinc-900/40 border border-zinc-800/80 cursor-not-allowed shadow-none shrink-0 flex items-center justify-center"
                        >
                            <span className="hidden sm:inline">Launch App [Inactive]</span>
                            <span className="sm:hidden">Launch</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* --- Live Market & Scanner Ticker Marquee --- */}
            <LiveTicker />

            {/* --- Hero Section --- */}
            <section className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden border-b border-white/[0.05]">
                {/* Visual grid overlay */}
                <div 
                    className="absolute inset-0 pointer-events-none opacity-[0.03] animate-grid-drift"
                    style={{
                        backgroundImage: `linear-gradient(to right, #8b5cf6 1px, transparent 1px), linear-gradient(to bottom, #8b5cf6 1px, transparent 1px)`,
                        backgroundSize: "32px 32px",
                    }}
                />
                <div className="absolute inset-0 bg-radial-[circle_at_70%_50%,_rgba(139,92,246,0.05)_0%,_transparent_60%] pointer-events-none" />
                <MatrixBackground />

                <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
                        <div className="space-y-8 text-left">
                            <h1 className="font-barlow font-extrabold text-white leading-[0.95] tracking-tight text-5xl md:text-7xl uppercase">
                                Automated Risk <br />
                                <span className="text-zinc-500">Shield for the</span> <br />
                                <span className="bg-gradient-to-r from-brand-primary to-purple-400 bg-clip-text text-transparent">Solana Network.</span>
                            </h1>
                            
                            <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-xl">
                                Non-custodial real-time security auditing, freeze authority checks, automated dust portfolio filtration, and direct transaction history scanning for drainers and mixers.
                            </p>

                            <div className="flex flex-col sm:flex-row items-start gap-4">
                                <button 
                                    disabled
                                    className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-xs font-barlow font-bold uppercase tracking-widest text-zinc-500 bg-zinc-900/40 border border-zinc-800/80 cursor-not-allowed shadow-none"
                                >
                                    Open Scanner Terminal [Inactive]
                                    <ArrowRightLeft className="w-4 h-4 text-zinc-500" />
                                </button>
                                <button 
                                    onClick={scrollToPreview}
                                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-xs font-barlow font-bold uppercase tracking-widest text-zinc-400 border border-white/[0.12] hover:text-white hover:border-white/[0.25] transition-all duration-150 active-tactile"
                                >
                                    Show Scan Preview
                                    <ArrowDown className="w-4 h-4 text-zinc-400" />
                                </button>
                            </div>

                            <div className="pt-8 border-t border-white/[0.05] flex items-center flex-wrap gap-x-4 gap-y-2">
                                <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em]">Primitives</span>
                                <span className="text-zinc-700">/</span>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] text-zinc-300 font-mono tracking-widest uppercase">
                                    <span className="px-2 py-1 rounded bg-white/[0.03] border border-white/[0.05]">[AUDIT.01]</span>
                                    <span className="px-2 py-1 rounded bg-white/[0.03] border border-white/[0.05]">[MIXER-CHECK.02]</span>
                                    <span className="px-2 py-1 rounded bg-white/[0.03] border border-white/[0.05]">[DUST-FILTER.03]</span>
                                </div>
                            </div>
                        </div>

                        {/* Animated Tech Radar SVG graphic */}
                        <div className="relative w-full aspect-square max-w-[480px] mx-auto lg:max-w-none flex items-center justify-center">
                            <div className="absolute inset-0 bg-radial-[circle_at_center,_rgba(139,92,246,0.12)_0%,_transparent_75%] opacity-40 holo-glow" />
                            {/* Tech grid lines */}
                            <div 
                                className="absolute inset-0 pointer-events-none opacity-20"
                                style={{
                                    backgroundImage: `linear-gradient(to right, #8b5cf6 1px, transparent 1px), linear-gradient(to bottom, #8b5cf6 1px, transparent 1px)`,
                                    backgroundSize: "48px 48px",
                                    maskImage: "radial-gradient(circle, black, transparent)",
                                    WebkitMaskImage: "radial-gradient(circle, black, transparent)"
                                }}
                            />
                            <svg viewBox="0 0 500 500" className="w-full h-full relative z-10 text-brand-primary/20">
                                {/* Radar concentric circles */}
                                <circle cx="250" cy="250" r="230" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 8" />
                                <circle cx="250" cy="250" r="180" fill="none" stroke="currentColor" strokeWidth="1" />
                                <circle cx="250" cy="250" r="120" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" />
                                <circle cx="250" cy="250" r="60" fill="none" stroke="currentColor" strokeWidth="1.5" />
                                
                                {/* Radar crosshairs */}
                                <line x1="20" y1="250" x2="480" y2="250" stroke="currentColor" strokeWidth="0.5" />
                                <line x1="250" y1="20" x2="250" y2="480" stroke="currentColor" strokeWidth="0.5" />
                                
                                {/* Scanning sweep line */}
                                <g className="origin-center animate-[spin_8s_linear_infinite]">
                                    <line x1="250" y1="250" x2="250" y2="20" stroke="#8b5cf6" strokeWidth="2" />
                                    <polygon points="250,250 250,20 180,30 250,250" fill="url(#sweepGrad)" opacity="0.3" />
                                </g>
                                
                                {/* Scanned ping nodes */}
                                <g>
                                    <circle cx="150" cy="120" r="4" fill="#10b981" className="animate-ping opacity-60" />
                                    <circle cx="150" cy="120" r="3" fill="#10b981" className="animate-radar-ping" style={{ animationDelay: '0.5s' }} />
                                    <text x="160" y="123" fill="#10b981" className="text-[10px] font-mono font-bold tracking-wider">SECURE_NODE</text>
                                    
                                    <circle cx="360" cy="180" r="5" fill="#ef4444" className="animate-ping opacity-60" />
                                    <circle cx="360" cy="180" r="4" fill="#ef4444" className="animate-radar-ping" style={{ animationDelay: '1.2s' }} />
                                    <text x="372" y="184" fill="#ef4444" className="text-[10px] font-mono font-bold tracking-wider">ATTACKER_MIXER</text>
                                    
                                    <circle cx="210" cy="340" r="4.5" fill="#f59e0b" className="animate-ping opacity-60" />
                                    <circle cx="210" cy="340" r="3.5" fill="#f59e0b" className="animate-radar-ping" style={{ animationDelay: '1.8s' }} />
                                    <text x="222" y="344" fill="#f59e0b" className="text-[10px] font-mono font-bold tracking-wider">UNVERIFIED_MINT</text>
                                </g>

                                <defs>
                                    <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
                                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.15" />
                                        <stop offset="100%" stopColor="#06080f" stopOpacity="0" />
                                    </radialGradient>
                                    <linearGradient id="sweepGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            
                            {/* Overlay details box */}
                            <div className="absolute bottom-5 left-5 font-mono border border-white/[0.08] bg-[#06080F]/90 backdrop-blur-sm px-4 py-3 rounded-xl text-[9px] tracking-[0.15em] uppercase text-[#A1A1AA] space-y-1 z-20">
                                <div><span className="text-zinc-600 inline-block min-w-[90px]">status:</span> <span className="text-emerald-400 font-bold">active shield</span></div>
                                <div><span className="text-zinc-600 inline-block min-w-[90px]">protocol:</span> <span className="text-white">aegis/v1.2.4</span></div>
                                <div><span className="text-zinc-600 inline-block min-w-[90px]">seed database:</span> <span className="text-white">loaded (9 entries)</span></div>
                                <div><span className="text-zinc-600 inline-block min-w-[90px]">scan range:</span> <span className="text-indigo-400">solana-mainnet</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Metrics Banner --- */}
            <section className="border-b border-white/[0.05] bg-[#070A12]/40 reveal-section">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.05]">
                        <div className="py-8 sm:px-10 first:pl-0 last:pr-0">
                            <div className="text-white font-barlow font-bold text-4xl leading-none mb-1">0s</div>
                            <div className="text-zinc-500 font-mono text-[9px] uppercase tracking-widest">Configuration Needed</div>
                        </div>
                        <div className="py-8 sm:px-10 first:pl-0 last:pr-0">
                            <div className="text-white font-barlow font-bold text-4xl leading-none mb-1">20 Tx</div>
                            <div className="text-zinc-500 font-mono text-[9px] uppercase tracking-widest">Recent Signature Scan Depth</div>
                        </div>
                        <div className="py-8 sm:px-10 first:pl-0 last:pr-0">
                            <div className="text-white font-barlow font-bold text-4xl leading-none mb-1">100%</div>
                            <div className="text-zinc-500 font-mono text-[9px] uppercase tracking-widest">Non-Custodial & Public-Key Only</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Features Grid Section --- */}
            <section id="features" className="py-28 max-w-7xl mx-auto px-6 reveal-section">
                <div className="mb-16">
                    <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.24em] mb-4">Core Engine Capabilities</p>
                    <h2 className="font-barlow font-extrabold text-white leading-[0.95] tracking-tight text-3xl md:text-5xl uppercase">
                        Comprehensive Security Analysis <br />
                        <span className="text-zinc-500">In a Single Endpoint.</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-transparent rounded-2xl overflow-visible">
                    
                    <div className="group glow-card-neon p-8 flex flex-col justify-between min-h-[200px] rounded-2xl">
                        <div>
                            <div className="mb-5 text-[#8b5cf6]"><RadarIcon className="w-6 h-6" /></div>
                            <h3 className="font-barlow font-bold text-xl uppercase tracking-wider text-white mb-2">Real-Time Token Auditor</h3>
                            <p className="text-zinc-400 text-xs leading-relaxed">Instantly checks token mint authority status, freeze authority settings, total on-chain supply metrics, and live Raydium market pools.</p>
                        </div>
                        <div className="mt-6 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">Standard SPL & Token-2022</span>
                        </div>
                    </div>

                    <div className="group glow-card-neon p-8 flex flex-col justify-between min-h-[200px] rounded-2xl">
                        <div>
                            <div className="mb-5 text-indigo-400"><Globe className="w-6 h-6" /></div>
                            <h3 className="font-barlow font-bold text-xl uppercase tracking-wider text-white mb-2">Low-Credit Wallet Scanner</h3>
                            <p className="text-zinc-400 text-xs leading-relaxed">Performs lightweight, credit-friendly queries to batch-fetch and verify the wallet&apos;s last 20 recent on-chain signatures for mixer interactions.</p>
                        </div>
                        <div className="mt-6 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse"></span>
                            <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">Low RPC Load</span>
                        </div>
                    </div>

                    <div className="group glow-card-neon p-8 flex flex-col justify-between min-h-[200px] rounded-2xl">
                        <div>
                            <div className="mb-5 text-rose-500"><ShieldAlert className="w-6 h-6" /></div>
                            <h3 className="font-barlow font-bold text-xl uppercase tracking-wider text-white mb-2">Mixer & Attack Registry</h3>
                            <p className="text-zinc-400 text-xs leading-relaxed">Cross-references wallet interaction trails and assets against a seeded local database of known drainers, privacy protocols, and hackers.</p>
                        </div>
                        <div className="mt-6 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                            <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">Dynamic Attacker Flags</span>
                        </div>
                    </div>

                    <div className="group glow-card-neon p-8 flex flex-col justify-between min-h-[200px] rounded-2xl">
                        <div>
                            <div className="mb-5 text-amber-500"><Database className="w-6 h-6" /></div>
                            <h3 className="font-barlow font-bold text-xl uppercase tracking-wider text-white mb-2">Portfolio Dust Filtration</h3>
                            <p className="text-zinc-400 text-xs leading-relaxed">Filters out low-value spam and phishing token drops (under $10 USD) automatically, giving you an accurate valuation of real active holdings.</p>
                        </div>
                        <div className="mt-6 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse"></span>
                            <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">Clean Portfolio Views</span>
                        </div>
                    </div>

                    <div className="group glow-card-neon p-8 flex flex-col justify-between min-h-[200px] rounded-2xl">
                        <div>
                            <div className="mb-5 text-emerald-400"><ShieldCheck className="w-6 h-6" /></div>
                            <h3 className="font-barlow font-bold text-xl uppercase tracking-wider text-white mb-2">Jupiter Smart Overrides</h3>
                            <p className="text-zinc-400 text-xs leading-relaxed">Trusted, audited token contracts (USDC, USDT, SOL) bypass raw risk flags to prevent false positives and reflect their true safety score.</p>
                        </div>
                        <div className="mt-6 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">0% False Positives</span>
                        </div>
                    </div>

                    <div className="group glow-card-neon p-8 flex flex-col justify-between min-h-[200px] rounded-2xl">
                        <div>
                            <div className="mb-5 text-indigo-400"><FileText className="w-6 h-6" /></div>
                            <h3 className="font-barlow font-bold text-xl uppercase tracking-wider text-white mb-2">Local History Caching</h3>
                            <p className="text-zinc-400 text-xs leading-relaxed">Saves recently scanned wallet and token data locally in your browser so you can revisit profiles and details instantly without scanning credits.</p>
                        </div>
                        <div className="mt-6 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse"></span>
                            <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">Session Persistence</span>
                        </div>
                    </div>

                </div>
            </section>

            {/* --- Architectural Primitives Section --- */}
            <section id="engine" className="relative py-28 border-t border-white/[0.05] overflow-hidden reveal-section">
                <div className="absolute inset-0 bg-radial-[circle_at_50%_0%,_rgba(139,92,246,0.03)_0%,_transparent_60%] pointer-events-none" />
                <div className="relative z-10 max-w-7xl mx-auto px-6">
                    <div className="mb-16">
                        <div className="flex items-center gap-3 mb-5">
                            <span className="inline-block w-7 h-px bg-white/40"></span>
                            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.24em]">[01.Analysis Primitives]</p>
                        </div>
                        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                            <h2 className="font-barlow font-extrabold text-white leading-[0.95] tracking-tight text-3xl md:text-5xl uppercase">
                                Multi-Layered <br />
                                <span className="text-zinc-500">Security Architecture.</span>
                            </h2>
                            <p className="text-zinc-400 text-sm max-w-sm leading-relaxed lg:text-right">
                                Aegis blends real-time on-chain calls with local attacker registries and audited verified list mappings to evaluate any address in seconds.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-transparent rounded-2xl overflow-visible">
                        
                        <article className="group relative glow-card-neon p-8 overflow-hidden flex flex-col justify-between min-h-[350px] rounded-2xl">
                            <div>
                                <div className="flex items-center justify-between mb-8">
                                    <span className="flex items-center gap-2 text-[9px] text-zinc-500 font-mono uppercase tracking-[0.22em]"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>[PILLAR.01]</span>
                                    <span className="text-[9px] text-zinc-600 font-mono tracking-[0.12em]">01 / 03</span>
                                </div>
                                <h3 className="font-barlow font-extrabold text-2xl uppercase tracking-wider text-white mb-2">On-Chain Metadata Check</h3>
                                <p className="text-[10px] text-indigo-400 font-mono uppercase tracking-[0.22em] mb-4">Direct State Inspection</p>
                                <p className="text-zinc-400 text-xs leading-relaxed mb-6">Fetches raw account details from the Solana RPC. Identifies mint authorities, freeze authorities, total circulating supplies, and program owners to map out structural trust flags.</p>
                            </div>
                            <div className="border-t border-white/[0.05] pt-5">
                                <p className="text-[9px] text-zinc-600 font-mono uppercase tracking-[0.2em] mb-2">Metrics Inspected</p>
                                <ul className="space-y-1 text-[10px] text-zinc-400 font-mono tracking-wider">
                                    <li>· mintAuthority (renounced/active)</li>
                                    <li>· freezeAuthority (renounced/active)</li>
                                    <li>· programOwner (legacy/Token-2022)</li>
                                </ul>
                            </div>
                        </article>

                        <article className="group relative glow-card-neon p-8 overflow-hidden flex flex-col justify-between min-h-[350px] rounded-2xl">
                            <div>
                                <div className="flex items-center justify-between mb-8">
                                    <span className="flex items-center gap-2 text-[9px] text-zinc-500 font-mono uppercase tracking-[0.22em]"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>[PILLAR.02]</span>
                                    <span className="text-[9px] text-zinc-600 font-mono tracking-[0.12em]">02 / 03</span>
                                </div>
                                <h3 className="font-barlow font-extrabold text-2xl uppercase tracking-wider text-white mb-2">Security Footprint Trace</h3>
                                <p className="text-[10px] text-amber-400 font-mono uppercase tracking-[0.22em] mb-4">Interaction Profiling</p>
                                <p className="text-zinc-400 text-xs leading-relaxed mb-6">Queries recent signatures to identify transactional touchpoints. Attacker addresses, mixers, and exploit contracts in the transaction&apos;s history flag immediate risk, shifting security scores.</p>
                            </div>
                            <div className="border-t border-white/[0.05] pt-5">
                                <p className="text-[9px] text-zinc-600 font-mono uppercase tracking-[0.2em] mb-2">Metrics Inspected</p>
                                <ul className="space-y-1 text-[10px] text-zinc-400 font-mono tracking-wider">
                                    <li>· recent transaction keys (last 20)</li>
                                    <li>· known mixers / laundering pools</li>
                                    <li>· wallet drainers & exploits</li>
                                </ul>
                            </div>
                        </article>

                        <article className="group relative glow-card-neon p-8 overflow-hidden flex flex-col justify-between min-h-[350px] rounded-2xl">
                            <div>
                                <div className="flex items-center justify-between mb-8">
                                    <span className="flex items-center gap-2 text-[9px] text-zinc-500 font-mono uppercase tracking-[0.22em]"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>[PILLAR.03]</span>
                                    <span className="text-[9px] text-zinc-600 font-mono tracking-[0.12em]">03 / 03</span>
                                </div>
                                <h3 className="font-barlow font-extrabold text-2xl uppercase tracking-wider text-white mb-2">Market Liquidity Audit</h3>
                                <p className="text-[10px] text-emerald-400 font-mono uppercase tracking-[0.22em] mb-4">Market Presence Checks</p>
                                <p className="text-zinc-400 text-xs leading-relaxed mb-6">Queries decentralized market presence through DexScreener APIs. Identifies active liquidity pools, FDVs, and volume levels. Empty, locked, or isolated pools trigger instant warnings.</p>
                            </div>
                            <div className="border-t border-white/[0.05] pt-5">
                                <p className="text-[9px] text-zinc-600 font-mono uppercase tracking-[0.2em] mb-2">Metrics Inspected</p>
                                <ul className="space-y-1 text-[10px] text-zinc-400 font-mono tracking-wider">
                                    <li>· active market pools (Raydium)</li>
                                    <li>· locked liquidity volume USD</li>
                                    <li>· price fluctuations & FDV</li>
                                </ul>
                            </div>
                        </article>

                    </div>
                </div>
            </section>

            {/* --- Scanner Past Showcase Section --- */}
            <section id="scanner-preview" ref={previewRef} className="py-24 border-t border-white/[0.05] bg-[#070A12]/30 relative reveal-section">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center space-y-3 mb-16">
                        <span className="px-3 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-widest border border-brand-primary/30 bg-brand-primary/10 text-brand-primary">
                            Interactive App Preview
                        </span>
                        <h2 className="font-barlow font-extrabold text-white leading-none text-4xl md:text-5xl uppercase">
                            Past Scan Showcase
                        </h2>
                        <p className="text-xs text-zinc-400 max-w-xl mx-auto tracking-wider font-mono">
                            SELECT A PROFILE BELOW TO PREVIEW RECENT COMPLETED SCAN AUDITS
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Tab selectors */}
                        <div className="lg:col-span-4 flex flex-col gap-3">
                            {PAST_SCANS.map((scan) => {
                                const Icon = scan.icon;
                                const isActive = scan.id === activeScanId;
                                return (
                                    <button
                                        key={scan.id}
                                        onClick={() => setActiveScanId(scan.id)}
                                        className={`w-full text-left p-5 rounded-2xl border transition-all duration-200 cursor-pointer active-tactile ${
                                            isActive
                                                ? "border-brand-primary bg-brand-primary/5 shadow-[0_0_20px_rgba(139,92,246,0.1)] text-white"
                                                : "border-white/[0.04] bg-[#0A0D16]/40 text-zinc-400 hover:border-white/[0.12] hover:bg-[#0A0D16]/70 hover:text-zinc-200"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-lg ${isActive ? "bg-brand-primary/20 text-brand-primary" : "bg-white/5 text-zinc-500"}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <span className="font-barlow font-bold text-base tracking-wide uppercase">
                                                    {scan.title}
                                                </span>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-extrabold uppercase tracking-wider border ${scan.badgeColor}`}>
                                                {scan.badge}
                                            </span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-mono text-[9px] text-zinc-500 truncate">{scan.address}</p>
                                            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans mt-2">{scan.description}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Interactive browser mockup preview */}
                        <div className="lg:col-span-8">
                            <div className="group relative rounded-3xl border border-white/[0.08] bg-[#070A12]/60 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-brand-primary/30">
                                
                                {/* Top window bar */}
                                <div className="flex items-center justify-between px-4 py-3 bg-[#0B0F19] border-b border-white/[0.05]">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                                    </div>
                                    <div className="flex-1 max-w-md mx-auto px-3 py-1 rounded-lg bg-[#06080F] border border-white/[0.04] text-[9px] font-mono text-zinc-500 flex items-center justify-center gap-1.5">
                                        <span className="text-emerald-500">🔒</span>
                                        <span>aegis.shield/scan/{activeScan.address.substring(0, 16)}...</span>
                                    </div>
                                    <div className="w-12"></div> {/* Spacer */}
                                </div>

                                {/* Mockup image layout */}
                                <div className="relative aspect-auto lg:aspect-[16/10] min-h-[380px] lg:min-h-0 w-full overflow-hidden bg-[#06080F]/95 select-none text-left flex">
                                    <div className="w-full h-full filter transition-all duration-300 group-hover:blur-[2px] group-hover:opacity-30 flex text-zinc-100 font-sans text-[10px]">
                                        {/* Sidebar */}
                                        <div className="hidden md:flex w-[26%] bg-[#080B13] border-r border-white/[0.04] p-3 flex-col justify-between shrink-0">
                                            <div className="space-y-4">
                                                <div>
                                                    <span className="text-[7.5px] font-mono font-bold tracking-wider text-zinc-500 uppercase">
                                                        Historical Audits
                                                    </span>
                                                    <div className="text-[7px] text-zinc-600 font-mono mt-0.5">Logs</div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {PAST_SCANS.map((s) => (
                                                        <div 
                                                            key={s.id} 
                                                            className={`p-2 rounded-xl border text-[8px] flex items-center justify-between font-mono ${
                                                                s.id === activeScan.id 
                                                                    ? "bg-brand-primary/10 border-brand-primary/20 text-white" 
                                                                    : "bg-black/20 border-white/[0.02] text-zinc-500"
                                                            }`}
                                                        >
                                                            <span className="truncate max-w-[55px]">{s.address.substring(0, 8)}...</span>
                                                            <span className={`text-[7px] px-1 bg-black/40 rounded ${s.id === 'wallet' || s.id === 'usdc' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                                {s.risk.split(' ')[0]}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="text-[7px] text-zinc-600 font-mono tracking-wider">
                                                AEGIS CORE V1.2
                                            </div>
                                        </div>

                                        {/* Main Panel */}
                                        <div className="flex-1 bg-[#06080F] p-4 overflow-y-auto space-y-4">
                                            <div>
                                                <h3 className="font-barlow font-bold text-sm tracking-wide uppercase text-white leading-none">
                                                    Real-Time Address Risk Scanner
                                                </h3>
                                                <p className="text-[8px] text-zinc-500 mt-1">
                                                    Input a Solana public key or token contract to run instant security audits.
                                                </p>
                                            </div>

                                            {/* Search box mock */}
                                            <div className="flex gap-2">
                                                <div className="flex-1 bg-[#090C15] border border-white/[0.05] rounded-xl px-3 py-2 font-mono text-[8.5px] text-zinc-300 flex items-center truncate">
                                                    {activeScan.address}
                                                </div>
                                                <button className="bg-brand-primary text-[#06080F] text-[8.5px] font-barlow font-bold uppercase px-3.5 py-2 rounded-xl shrink-0">
                                                    Initiate Scan
                                                </button>
                                            </div>

                                            {/* Results row */}
                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                                {/* Risk Card */}
                                                <div className="col-span-1 sm:col-span-4 bg-[#0B0F1A] border border-white/[0.04] rounded-2xl p-3 flex flex-col items-center justify-center text-center">
                                                    <div className="relative w-16 h-10 flex items-center justify-center">
                                                        <div className="absolute inset-0 border-4 border-zinc-800 rounded-t-full border-b-0" />
                                                        <div className={`absolute inset-0 border-4 rounded-t-full border-b-0 ${activeScan.id === 'gusic' || activeScan.id === 'token2022' ? 'border-amber-500' : 'border-emerald-500'}`} style={{ clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)' }} />
                                                        <span className="text-sm font-mono font-bold mt-4">{activeScan.risk.split(' ')[0]}</span>
                                                    </div>
                                                    <span className="text-[7px] font-mono text-zinc-500 mt-2 uppercase tracking-wider">Risk Score</span>
                                                    <span className={`text-[8px] font-bold mt-0.5 ${activeScan.riskColor}`}>{activeScan.risk.split(' ').slice(1).join(' ')}</span>
                                                </div>

                                                {/* Profile metadata */}
                                                <div className="col-span-1 sm:col-span-8 bg-[#0B0F1A] border border-white/[0.04] rounded-2xl p-3 flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex items-center justify-between border-b border-white/[0.04] pb-1.5 mb-1.5">
                                                            <span className="text-[7.5px] font-mono text-zinc-500 uppercase tracking-wider">Scan Profile Metadata</span>
                                                            <span className="text-[7px] px-2 py-0.5 bg-brand-primary/10 text-brand-primary rounded font-mono uppercase tracking-wider">
                                                                {activeScan.id === 'wallet' ? 'Personal Wallet' : 'Token Mint Contract'}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-[7.5px] font-mono text-zinc-400">
                                                            <div>
                                                                <span className="text-zinc-600 block text-[6px] uppercase mb-0.5">Verified Address</span>
                                                                <span className="truncate block select-all">{activeScan.address.substring(0, 10)}...{activeScan.address.substring(activeScan.address.length - 6)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-zinc-600 block text-[6px] uppercase mb-0.5">{activeScan.id === 'wallet' ? 'SOL Balance' : 'Token Descriptor'}</span>
                                                                <span className="block">{activeScan.id === 'wallet' ? '0.0173 SOL' : activeScan.title}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-[6.5px] text-zinc-500 font-mono flex justify-between border-t border-white/[0.04] pt-1.5 mt-1.5">
                                                        <span>Status: Live On-Chain Data</span>
                                                        <span className="text-brand-primary font-bold">Audit Verified Successfully</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Tabs & Details */}
                                            <div className="space-y-2">
                                                <div className="flex border-b border-white/[0.04] gap-4 text-[7.5px]">
                                                    <span className="font-mono font-bold border-b-2 border-brand-primary pb-1 text-white uppercase">
                                                        {activeScan.id === 'wallet' ? 'Wallet Audit' : 'Contract Audit'}
                                                    </span>
                                                    {activeScan.id === 'wallet' && <span className="font-mono text-zinc-500 pb-1 uppercase">Token Portfolio</span>}
                                                </div>

                                                {/* Audit Details Card */}
                                                <div className="bg-[#0B0F1A]/80 border border-white/[0.04] rounded-2xl p-3 space-y-3">
                                                    <div className="flex items-center gap-2.5 border-b border-white/[0.04] pb-2">
                                                        <div className="w-6 h-6 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                                                            <activeScan.icon className="w-3.5 h-3.5" />
                                                        </div>
                                                        <div>
                                                            <div className="text-[6.5px] text-zinc-500 font-mono uppercase leading-none mb-0.5">{activeScan.id === 'wallet' ? 'Wallet Address' : 'Token Address'}</div>
                                                            <div className="text-[8.5px] font-mono text-zinc-200 select-all truncate max-w-[200px]">{activeScan.address}</div>
                                                        </div>
                                                    </div>

                                                    {activeScan.id === 'wallet' ? (
                                                        // Wallet audit mockup results
                                                        <div className="space-y-3">
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="p-2.5 bg-black/30 rounded-xl border border-white/[0.02]">
                                                                    <div className="text-[6px] text-zinc-500 uppercase font-mono mb-0.5">Total Portfolio</div>
                                                                    <div className="text-xs font-mono font-bold text-white">$14.29</div>
                                                                </div>
                                                                <div className="p-2.5 bg-black/30 rounded-xl border border-white/[0.02]">
                                                                    <div className="text-[6px] text-zinc-500 uppercase font-mono mb-0.5">SOL Balance</div>
                                                                    <div className="text-xs font-mono font-bold text-white">0.0173 SOL</div>
                                                                </div>
                                                            </div>
                                                            <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center gap-2.5">
                                                                <span className="text-emerald-400 text-xs font-bold">✓</span>
                                                                <div>
                                                                    <div className="text-[7.5px] font-bold text-emerald-400">No Risk Flags Detected</div>
                                                                    <div className="text-[6.5px] text-zinc-500 mt-0.5">This wallet appears to have a clean on-chain record.</div>
                                                                </div>
                                                            </div>
                                                            <div className="p-2.5 bg-black/30 border border-white/[0.04] rounded-xl">
                                                                <div className="text-[7.5px] font-bold text-zinc-300 uppercase font-mono mb-1">Security Footprint & Interactions</div>
                                                                <div className="text-[6.5px] text-zinc-500">No mixers, drainers, or attacker contracts detected in the last 20 transactions.</div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        // Token audit mockup results
                                                        <div className="space-y-3">
                                                            {/* Live market data */}
                                                            <div className="p-2.5 bg-gradient-to-br from-[#0B0F1A] to-purple-950/20 border border-brand-primary/10 rounded-xl">
                                                                <div className="text-[7.5px] font-bold text-brand-primary uppercase tracking-wider mb-2">Live Market Data (Raydium)</div>
                                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[8.5px]">
                                                                    <div>
                                                                        <span className="text-[6.5px] text-zinc-500 block uppercase mb-0.5">Price USD</span>
                                                                        <span className="text-white font-bold">{activeScan.id === 'gusic' ? '$0.000068' : activeScan.id === 'usdc' ? '$1.00' : '$0.00035'}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[6.5px] text-zinc-500 block uppercase mb-0.5">24h Vol</span>
                                                                        <span className="text-emerald-400 font-bold">{activeScan.id === 'gusic' ? '$167K' : activeScan.id === 'usdc' ? '$3.4B' : '$5.5K'}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[6.5px] text-zinc-500 block uppercase mb-0.5">Liquidity</span>
                                                                        <span className="text-cyan-400 font-bold">{activeScan.id === 'gusic' ? '$27K' : activeScan.id === 'usdc' ? '$842M' : '$42K'}</span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[6.5px] text-zinc-500 block uppercase mb-0.5">FDV</span>
                                                                        <span className="text-zinc-300 font-bold">{activeScan.id === 'gusic' ? '$68K' : activeScan.id === 'usdc' ? '$42.1B' : '$349K'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Authorities */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[8px]">
                                                                <div className="p-2 bg-black/30 border border-white/[0.02] rounded-xl flex justify-between items-center px-3">
                                                                    <span className="text-zinc-400">Mint Authority</span>
                                                                    <span className={`px-1.5 py-0.5 rounded text-[6.5px] font-extrabold ${activeScan.id === 'usdc' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                                        {activeScan.id === 'usdc' ? 'ACTIVE' : 'RENOUNCED'}
                                                                    </span>
                                                                </div>
                                                                <div className="p-2 bg-black/30 border border-white/[0.02] rounded-xl flex justify-between items-center px-3">
                                                                    <span className="text-zinc-400">Freeze Authority</span>
                                                                    <span className={`px-1.5 py-0.5 rounded text-[6.5px] font-extrabold ${activeScan.id === 'usdc' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                                        {activeScan.id === 'usdc' ? 'ACTIVE' : 'RENOUNCED'}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Risk Analysis */}
                                                            <div className="p-2.5 bg-black/30 border border-white/[0.04] rounded-xl">
                                                                <div className="text-[7.5px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">Contract Risk Flag Analysis</div>
                                                                <div className="space-y-1">
                                                                    {activeScan.id === 'usdc' ? (
                                                                        <div className="text-[6.5px] text-emerald-400 font-bold flex items-center gap-1">
                                                                            <span>✓</span> <span>Jupiter Smart Override - Verified Safe stablecoin contract</span>
                                                                        </div>
                                                                    ) : (
                                                                        <>
                                                                            <div className="text-[6.5px] text-emerald-400 flex items-center gap-1">
                                                                                <span>✓</span> <span>Mint authority renounced (supply fixed)</span>
                                                                            </div>
                                                                            <div className="text-[6.5px] text-emerald-400 flex items-center gap-1">
                                                                                <span>✓</span> <span>Freeze authority renounced (cannot lock balances)</span>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Hover overlay redirects to app */}
                                    <div className="absolute inset-0 bg-[#06080F]/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex flex-col items-center justify-center gap-4 text-center p-6">
                                        <div className="relative w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center border border-white/10 shadow-[0_0_30px_rgba(139,92,246,0.3)] animate-pulse shrink-0">
                                            <img src="/logo.png" alt="Aegis Logo" className="w-full h-full object-cover" />
                                        </div>
                                        <h3 className="font-barlow font-bold text-2xl uppercase tracking-wider text-white">Ready to Scan Live?</h3>
                                        <p className="text-xs text-zinc-400 max-w-xs font-mono">Launch the scanner terminal to perform audits on mainnet</p>
                                        <button 
                                            disabled
                                            className="mt-2 px-6 py-3 rounded-xl text-xs font-barlow font-bold uppercase tracking-widest text-zinc-500 bg-zinc-900/40 border border-zinc-800/80 cursor-not-allowed"
                                        >
                                            Terminal Inactive [Offline Preview]
                                        </button>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    {/* Bottom Launch App CTA */}
                    <div className="mt-16 text-center">
                        <button 
                            disabled
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-xs font-barlow font-bold uppercase tracking-widest text-zinc-500 bg-zinc-900/40 border border-zinc-800/80 cursor-not-allowed shadow-none"
                        >
                            Launch Scanner Terminal [Inactive]
                            <ArrowRightLeft className="w-4 h-4 text-zinc-500" />
                        </button>
                    </div>
                </div>
            </section>

            {/* --- Footer --- */}
            <footer className="border-t border-white/[0.05] bg-[#06080F] py-12 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <div className="relative w-6 h-6 rounded-lg overflow-hidden flex items-center justify-center border border-white/5 shrink-0">
                            <img src="/logo.png" alt="Aegis Logo" className="w-full h-full object-cover" />
                        </div>
                        <span className="font-barlow font-bold text-sm tracking-wider text-white">
                            AEGIS<span className="text-zinc-500">SOLANA</span>
                        </span>
                    </div>

                    <div className="flex items-center flex-col md:flex-row gap-6">
                        <a
                            href="https://x.com/Aegis_solana"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[10px] text-zinc-400 hover:text-purple-400 transition-colors uppercase tracking-widest flex items-center gap-2 active-tactile"
                        >
                            <XIcon className="w-3.5 h-3.5 text-[#8b5cf6]" />
                            @Aegis_solana
                        </a>
                        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest text-center md:text-right">
                            © 2026 Aegis Solana · Open Source Audits · Non-Custodial
                        </div>
                    </div>
                </div>
            </footer>

        </div>
    );
}
