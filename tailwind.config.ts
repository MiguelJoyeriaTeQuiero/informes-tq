import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Identidad de marca Te Quiero
        snorkel: {
          DEFAULT: "#00557F", // azul principal oscuro
          50: "#eef6fb",
          100: "#d4e8f3",
          200: "#a6d0e8",
          300: "#6fb2d8",
          400: "#2f8dc2",
          500: "#0099f2", // azul vibrante (logo)
          600: "#0a6fa8",
          700: "#00557F",
          800: "#063f5d",
          900: "#0a2f44",
        },
        brand: {
          blue: "#0099F2",
          dark: "#00557F",
          sand: "#E8E3DF",
          gold: "#C8A164",
        },
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
        display: ["var(--font-zodiak)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,85,127,0.06), 0 8px 24px -8px rgba(0,85,127,0.12)",
        glow: "0 0 0 1px rgba(0,153,242,0.12), 0 12px 40px -12px rgba(0,153,242,0.35)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
