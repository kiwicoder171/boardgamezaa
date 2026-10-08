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
          base: "#070b14",
          surface: "#0d1524",
          card: "#111a2d",
          border: "#1e293b",
          accent: "#f59e0b",
          "accent-hover": "#fbbf24",
          "accent-dark": "#d97706",
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
        'tabletop-card': '0 10px 25px -5px rgba(0, 0, 0, 0.7), 0 4px 6px -2px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
        'tactile-btn': '0 4px 0 #1e1b4b, 0 6px 12px rgba(0, 0, 0, 0.4)',
        'tactile-pressed': '0 1px 0 #1e1b4b, 0 2px 4px rgba(0, 0, 0, 0.4)',
        'wood-rim': 'inset 0 2px 4px rgba(255, 255, 255, 0.15), inset 0 -3px 6px rgba(0, 0, 0, 0.8), 0 12px 24px rgba(0, 0, 0, 0.7)',
      },
    },
  },
  plugins: [],
};
export default config;
