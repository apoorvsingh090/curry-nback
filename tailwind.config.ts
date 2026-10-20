import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FFF6EC",
        surface: "#FFFFFF",
        ink: "#2B1A0E",
        "ink-soft": "#5B4632",
        brand: "#9A3412",
        "brand-deep": "#7C2D12",
        "brand-soft": "#FBE6D6",
        success: "#166534",
        "success-soft": "#DCFCE7",
        amber: "#B45309",
        "amber-soft": "#FEF3C7",
        muted: "#6B6257",
        line: "#A2855F",
      },
      fontFamily: {
        sans: [
          "var(--font-atkinson)",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        card: "0 12px 32px rgba(44, 26, 14, 0.12)",
        button: "0 6px 0 0 #7C2D12",
        "button-sm": "0 4px 0 0 #7C2D12",
      },
      keyframes: {
        "pulse-good": {
          "0%": { transform: "scale(1)", backgroundColor: "#DCFCE7" },
          "50%": { transform: "scale(1.04)", backgroundColor: "#BBF7D0" },
          "100%": { transform: "scale(1)", backgroundColor: "#DCFCE7" },
        },
        "shake-soft": {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-8px)" },
          "75%": { transform: "translateX(8px)" },
        },
        "pop-in": {
          "0%": { transform: "scale(0.92)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "pulse-good": "pulse-good 600ms ease-in-out",
        "shake-soft": "shake-soft 400ms ease-in-out",
        "pop-in": "pop-in 200ms ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
