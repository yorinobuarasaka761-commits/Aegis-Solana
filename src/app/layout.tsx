import type { Metadata } from "next";
import { Barlow_Condensed, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import ThemeProvider from "@/components/ThemeProvider";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Aegis Solana - Advanced Wallet & Token Risk Scanner",
  description: "Real-time deep analysis tool for Solana wallet portfolios and smart contracts. Protect your assets from honeypots, rug pulls, and malicious mixers.",
  metadataBase: new URL("https://www.aegissolana.xyz"),
  openGraph: {
    title: "Aegis Solana - Advanced Wallet & Token Risk Scanner",
    description: "Real-time deep analysis tool for Solana wallet portfolios and smart contracts. Protect your assets from honeypots, rug pulls, and malicious mixers.",
    url: "https://www.aegissolana.xyz",
    siteName: "Aegis Solana",
    images: [
      {
        url: "/wallet-scan.png",
        width: 1200,
        height: 630,
        alt: "Aegis Solana Advanced Terminal Scan Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aegis Solana - Advanced Wallet & Token Risk Scanner",
    description: "Real-time deep analysis tool for Solana wallet portfolios and smart contracts. Protect your assets from honeypots, rug pulls, and malicious mixers.",
    creator: "@Aegis_solana",
    images: ["/wallet-scan.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body
        className={`${ibmPlexSans.variable} ${barlowCondensed.variable} ${ibmPlexMono.variable} antialiased relative overflow-x-hidden`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          {/* --- Global Animated Background --- */}
          <div
            className="fixed inset-0 -z-50 pointer-events-none overflow-hidden"
            style={{ backgroundColor: "var(--background)" }}
          >
            {/* Animated Drifting Grid */}
            <div 
              className="absolute inset-0 animate-grid-drift"
              style={{
                backgroundImage: `linear-gradient(to right, var(--grid-line-color) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line-color) 1px, transparent 1px)`,
                backgroundSize: "48px 48px",
                opacity: "var(--grid-opacity)",
              }}
            />
            {/* Glowing Aura Orb 1 - Violet */}
            <div
              className="absolute top-[-10%] left-[-10%] w-[60%] aspect-square rounded-full blur-[130px] animate-aurora"
              style={{ backgroundColor: "var(--aurora-violet)" }}
            />
            {/* Glowing Aura Orb 2 - Emerald */}
            <div
              className="absolute bottom-[10%] right-[-10%] w-[50%] aspect-square rounded-full blur-[120px] animate-aurora"
              style={{ backgroundColor: "var(--aurora-emerald)", animationDelay: "-6s" }}
            />
            {/* Glowing Aura Orb 3 - Indigo */}
            <div
              className="absolute top-[40%] right-[15%] w-[45%] aspect-square rounded-full blur-[140px] animate-aurora"
              style={{ backgroundColor: "var(--aurora-indigo)", animationDelay: "-12s" }}
            />
          </div>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
