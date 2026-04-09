import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        foreground: "#f0f0f0",
        muted: "#171717",
        border: "#2b2b2b",
        accent: "#f59e0b",
        critical: "#ef4444",
        high: "#f59e0b",
        medium: "#eab308"
      },
      fontFamily: {
        display: ["var(--font-syne)"],
        mono: ["var(--font-jetbrains-mono)"]
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(255,255,255,0.08), 0 24px 80px rgba(0,0,0,0.35)"
      }
    }
  },
  plugins: []
};

export default config;

