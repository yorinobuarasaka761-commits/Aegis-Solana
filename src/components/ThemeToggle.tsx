"use client";

import { useTheme } from "./ThemeProvider";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] hover:border-[var(--border-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all duration-200 active-tactile flex items-center justify-center group"
      title={`Switch to ${theme === "dark" ? "Cyber-Aqua" : "Dark"} theme`}
      aria-label={`Switch to ${theme === "dark" ? "Cyber-Aqua" : "Dark"} theme`}
    >
      <div className="relative w-4 h-4">
        {/* Sun/Aqua icon */}
        <Sun
          className={`w-4 h-4 absolute inset-0 transition-all duration-300 ${
            theme === "light"
              ? "opacity-100 rotate-0 scale-100 text-cyan-400"
              : "opacity-0 rotate-90 scale-50"
          }`}
        />
        {/* Moon icon */}
        <Moon
          className={`w-4 h-4 absolute inset-0 transition-all duration-300 ${
            theme === "dark"
              ? "opacity-100 rotate-0 scale-100 text-purple-400"
              : "opacity-0 -rotate-90 scale-50"
          }`}
        />
      </div>
    </button>
  );
}
