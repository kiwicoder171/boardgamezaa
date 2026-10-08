import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/games/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        tabletop: {
          base: "#090a0c",
          surface: "#111215",
          card: "#16171a",
          border: "#222429",
          "border-subtle": "#191b1f",
          accent: "#ffffff",
          "accent-hover": "#f4f4f5",
        },
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
        fantasy: ["'Cinzel'", "Georgia", "serif"],
        scifi: ["'Orbitron'", "system-ui", "sans-serif"],
        typewriter: ["'Special Elite'", "'Courier Prime'", "monospace"],
        serifDisplay: ["'Playfair Display'", "Georgia", "serif"],
      },
      boxShadow: {
        'tabletop-card': '0 1px 2px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'minimal-card': '0 1px 3px rgba(0, 0, 0, 0.5), 0 12px 24px -8px rgba(0, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
};
export default config;
