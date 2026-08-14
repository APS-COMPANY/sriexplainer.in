import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      screens: {
        "3xl": "1920px",
        "4xl": "2560px",
        "tv": "3840px",
      },
      fontFamily: {
        sans: [
          "var(--font-serif)",
          "'Source Serif 4'",
          "Georgia",
          "Cambria",
          "'Times New Roman'",
          "Times",
          "serif"
        ],
        display: [
          "var(--font-serif)",
          "'Source Serif 4'",
          "Georgia",
          "Cambria",
          "'Times New Roman'",
          "Times",
          "serif"
        ],
        mono: [
          "var(--font-serif)",
          "'Source Serif 4'",
          "Georgia",
          "Cambria",
          "'Times New Roman'",
          "Times",
          "serif"
        ],
        serif: [
          "var(--font-serif)",
          "'Source Serif 4'",
          "Georgia",
          "Cambria",
          "'Times New Roman'",
          "Times",
          "serif"
        ]
      },
      fontSize: {
        "2xs": ["var(--text-2xs)", { lineHeight: "1.2" }],
        "xs": ["var(--text-xs)", { lineHeight: "1.25" }],
        "sm": ["var(--text-sm)", { lineHeight: "1.35" }],
        "base": ["var(--text-base)", { lineHeight: "1.5" }],
        "md": ["var(--text-md)", { lineHeight: "1.4" }],
        "lg": ["var(--text-lg)", { lineHeight: "1.35" }],
        "xl": ["var(--text-xl)", { lineHeight: "1.3" }],
        "2xl": ["var(--text-2xl)", { lineHeight: "1.2" }],
        "3xl": ["var(--text-3xl)", { lineHeight: "1.15" }],
        "hero": ["var(--text-hero)", { lineHeight: "1.08" }]
      },
      colors: {
        ink: "#0B0B0B",
        panel: "#171717",
        brand: "#8B2CFF",
      },
    },
  },
  plugins: [],
} satisfies Config;
