import type { Config } from "tailwindcss";
const plugin = require('tailwindcss/plugin');

const config: Config = {
  // Use 'selector' for manual dark mode toggling
  darkMode: "selector", 
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Futuristic Dark Tones
        dark: {
          950: "#020617", // Deeper obsidian for backgrounds
          900: "#0f172a", // Surface color
          800: "#1e293b", // Elevated surfaces
        },
        // Neon Accent Palette
        indigo: {
          500: "#6366f1",
          600: "#4f46e5",
          glow: "rgba(79, 70, 229, 0.4)",
        },
        cyan: {
          400: "#22d3ee",
          500: "#06b6d4",
          glow: "rgba(6, 182, 212, 0.4)",
        },
        // AI Branding Aliases
        primary: {
          DEFAULT: "#4F46E5",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#F97316", // Your Orange CTA
          glow: "rgba(249, 115, 22, 0.4)",
        },
      },
      // Glassmorphism & Depth (Merged with Mascot Gradients)
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.01))',
        'glass-border': 'linear-gradient(to bottom right, rgba(255,255,255,0.12), transparent)',
        // 🟢 MASCOT NECESSITIES
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      boxShadow: {
        'glass-sm': 'inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'glass-md': 'inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
        'glow-indigo': '0 0 20px -5px rgba(79, 70, 229, 0.5)',
        'glow-cyan': '0 0 20px -5px rgba(6, 182, 212, 0.5)',
        'glow-accent': '0 0 20px -5px rgba(249, 115, 22, 0.5)',
      },
      // Modern Animations (Merged: Your UI + Mascot Physics)
      animation: {
        // UI Animations
        'float': 'float 4s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'border-pulse': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        
        // 🟢 MASCOT ANIMATIONS
        'mascot-float': 'mascot-float 3s ease-in-out infinite',
        'mascot-float-delayed': 'mascot-float 3s ease-in-out 1.5s infinite',
        'mascot-wave': 'mascot-wave 2s ease-in-out infinite',
        'mascot-dance': 'mascot-dance 0.5s ease-in-out infinite alternate',
        'mascot-3d-flip': 'mascot-3d-flip 1s ease-in-out forwards',
        'mascot-breathe': 'mascot-breathe 4s ease-in-out infinite',
        'mascot-run': 'mascot-run 0.6s ease-in-out infinite',
        'mascot-fly': 'mascot-fly 2s ease-in-out infinite',
        'shadow-pulse': 'shadow-pulse 3s ease-in-out infinite',
        'hand-wave': 'hand-wave 2s ease-in-out infinite',
      },
      keyframes: {
        // UI Keyframes
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'shimmer': {
          '100%': { transform: 'translateX(100%)' },
        },
        'border-spin': {
          '100%': { transform: 'rotate(360deg)' },
        },
        
        // 🟢 MASCOT KEYFRAMES (The Physics)
        'mascot-float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'mascot-wave': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-15deg)' },
          '75%': { transform: 'rotate(10deg)' },
        },
        'hand-wave': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '50%': { transform: 'rotate(-40deg) translateY(-5px)' },
        },
        'mascot-dance': {
          '0%': { transform: 'translateY(0) rotate(0deg)' },
          '100%': { transform: 'translateY(-15px) rotate(5deg)' },
        },
        'mascot-3d-flip': {
          '0%': { transform: 'rotateY(0deg) scale(1)' },
          '40%': { transform: 'rotateY(180deg) scale(0.8)' },
          '100%': { transform: 'rotateY(360deg) scale(1)' },
        },
        'mascot-breathe': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' },
        },
        'mascot-run': {
          '0%, 100%': { transform: 'translateY(0) rotate(5deg)' },
          '50%': { transform: 'translateY(-10px) rotate(-5deg)' },
        },
        'mascot-fly': {
           '0%': { transform: 'translateY(0px) rotate(0deg)' },
           '25%': { transform: 'translateY(-20px) rotate(5deg)' },
           '50%': { transform: 'translateY(0px) rotate(0deg)' },
           '75%': { transform: 'translateY(20px) rotate(-5deg)' },
           '100%': { transform: 'translateY(0px) rotate(0deg)' },
        },
        'shadow-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.2' },
          '50%': { transform: 'scale(0.8)', opacity: '0.1' },
        }
      },
      backdropBlur: {
        xs: '2px',
        '2xl': '40px',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
    // Custom Plugin for "Dope" Utilities
    plugin(function({ addUtilities }: any) {
      addUtilities({
        '.bg-glass': {
          'background-color': 'rgba(255, 255, 255, 0.02)',
          'backdrop-filter': 'blur(12px)',
          'border': '1px solid rgba(255, 255, 255, 0.1)',
        },
        '.text-glow-indigo': {
          'text-shadow': '0 0 10px rgba(99, 102, 241, 0.8)',
        },
        '.mask-radial': {
          'mask-image': 'radial-gradient(circle, black, transparent 80%)',
        }
      })
    })
  ],
};

export default config;