import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: "hsl(var(--accent))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        destructive: "hsl(var(--destructive))",
        money: "hsl(var(--money-green))",
        "premium-bg": "hsl(var(--premium-bg))",
        "premium-border": "hsl(var(--premium-border))",
        "premium-pink-bg": "hsl(var(--premium-pink-bg))",
        "premium-pink-border": "hsl(var(--premium-pink-border))",
        "premium-green-bg": "hsl(140 70% 92%)",
        "premium-green-border": "hsl(142 71% 45%)",
        "premium-yellow-bg": "hsl(48 100% 90%)",
        "premium-yellow-border": "hsl(42 95% 55%)",
      },
      fontFamily: {
        sans: ["'Open Sauce One'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        shimmerSweep: { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(200%)" } },
        arrowNudge: { "0%,100%": { transform: "translateX(0)" }, "50%": { transform: "translateX(4px)" } },
        fadeIn: { "0%": { opacity: "0", transform: "translateY(6px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        starFloat: { "0%,100%": { transform: "translateY(0) scale(1)", opacity: "0.6" }, "50%": { transform: "translateY(-10px) scale(1.2)", opacity: "1" } },
        ping: { "75%,100%": { transform: "scale(2)", opacity: "0" } },
      },
      animation: {
        shimmer: "shimmerSweep 2.5s ease-in-out infinite",
        nudge: "arrowNudge 1.2s ease-in-out infinite",
        "fade-in": "fadeIn 0.4s ease-out",
        "star-float": "starFloat 4s ease-in-out infinite",
        "ping-slow": "ping 2s cubic-bezier(0,0,0.2,1) infinite",
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(180deg, #dbeafe 0%, #eff6ff 40%, #ffffff 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
