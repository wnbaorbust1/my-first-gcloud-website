import type { Config } from "tailwindcss";

/**
 * Legacy Command Center — Tailwind theme
 *
 * Brand tokens are defined as CSS variables in app/globals.css (so they can
 * respond to future theming/dark-mode work) and simply mapped in here.
 *
 * Course accent hues are intentionally NOT hardcoded as a fixed palette.
 * Each of the 8 subjects gets one unique accent hue used only for that
 * course's small tag/icon (never a full background). Those are defined
 * per-course as CSS variables (--accent-<course>) once curriculum data
 * exists, and consumed via the `course` color group below.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--ink) / <alpha-value>)",
        cream: "rgb(var(--cream) / <alpha-value>)",
        "rose-gold": "rgb(var(--rose-gold) / <alpha-value>)",
        "gold-leaf": "rgb(var(--gold-leaf) / <alpha-value>)",
        slate: "rgb(var(--slate) / <alpha-value>)",
        course: {
          money: "var(--accent-money-matters)",
          dollars: "var(--accent-dollars-and-sense)",
          algebra: "var(--accent-algebra-1)",
          biology: "var(--accent-biology)",
          english: "var(--accent-english-1)",
          history: "var(--accent-us-history)",
          accounting1: "var(--accent-accounting-1)",
          accounting2: "var(--accent-accounting-2)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "ledger-line":
          "linear-gradient(to right, rgb(var(--rose-gold)) 0%, rgb(var(--rose-gold)) 100%)",
      },
      keyframes: {
        "page-turn": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "stamp-land": {
          "0%": { opacity: "0", transform: "scale(1.4)" },
          "60%": { opacity: "1", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "page-turn": "page-turn 0.25s ease-out",
        "stamp-land": "stamp-land 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
