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
          base: "#0a0705",
          walnut: "#150d08",
          cork: "#281b12",
          surface: "#101622",
          card: "#181411",
          border: "#332218",
          accent: "#f59e0b",
          "accent-hover": "#fbbf24",
          "accent-dark": "#d97706",
          ember: "#dc5000",
          cream: "#ffedd7",
          parchment: "#f7f0df",
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
        'tabletop-card': '0 12px 28px -6px rgba(0, 0, 0, 0.8), 0 4px 6px -2px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 237, 215, 0.15)',
        'tactile-btn': '0 4px 0 #180d07, 0 8px 16px rgba(0, 0, 0, 0.6)',
        'tactile-pressed': '0 1px 0 #180d07, 0 2px 4px rgba(0, 0, 0, 0.4)',
        'wood-rim': 'inset 0 2px 3px rgba(255, 237, 215, 0.12), inset 0 -4px 8px rgba(0, 0, 0, 0.9), 0 16px 32px rgba(0, 0, 0, 0.85)',
        'spotlight': '0 0 50px -10px rgba(220, 80, 0, 0.35)',
      },
    },
  },
  plugins: [],
};
export default config;
