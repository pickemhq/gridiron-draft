import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        field: {
          950: "#0a1a10",
          900: "#0f2417",
          800: "#163420",
          700: "#1f4a2c",
          600: "#2c6339",
        },
        chalk: "#f4f1e8",
        hash: "#3f6b4a",
        clock: {
          amber: "#e8a13c",
          red: "#c0432f",
        },
        brass: "#c9a86a",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        yard: "repeating-linear-gradient(90deg, rgba(244,241,232,0.035) 0px, rgba(244,241,232,0.035) 2px, transparent 2px, transparent 88px)",
      },
    },
  },
  plugins: [],
};
export default config;
