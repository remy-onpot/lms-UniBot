import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class", // Fixed: Changed from ["class"] to "class"
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Your Custom Palette
        blue: {
          500: "#3B82F6",
          600: "#2563EB", // Trust Blue
        },
        orange: {
          500: "#F97316", // CTA / Pop
        },
        slate: {
          50: "#F8FAFC", // Background
          200: "#E2E8F0", // Borders
          800: "#1E293B", // Dark text
        },
        indigo: {
          50: "#EEF2FF", // Icy background
          200: "#C7D2FE", // Muted borders
          400: "#818CF8", // Soft
          600: "#4F46E5", // HERO Color
          950: "#1E1B4B", // Midnight
        },
        // Semantic aliases for easier use
        primary: {
          DEFAULT: "#4F46E5", // Indigo 600
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#2563EB", // Blue 600
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#F97316", // Orange 500
          foreground: "#FFFFFF",
        },
        background: "#F8FAFC", // Slate 50
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'], // Assuming you use Inter
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;