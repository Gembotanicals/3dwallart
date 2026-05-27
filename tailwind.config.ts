import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#101417",
        panel: "#171c20",
        panel2: "#1d2429",
        line: "#2c353b",
        ink: "#e7ecee",
        dim: "#8a979e",
        accent: "#ff5c2b",
        accent2: "#36e0c0",
        grid: "#1a2126",
        warn: "#ffb020",
      },
      fontFamily: {
        sans: ["Archivo", "sans-serif"],
        heading: ["'Archivo Black'", "sans-serif"],
        mono: ["'Space Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
