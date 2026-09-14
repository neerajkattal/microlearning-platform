/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Sora", "system-ui", "sans-serif"],
      },
      keyframes: {
        "pop-in": {
          "0%": { transform: "scale(0.6)", opacity: "0" },
          "60%": { transform: "scale(1.08)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "fill-bar": {
          "0%": { width: "0%" },
        },
        "card-in": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "float-up": {
          "0%": { transform: "translateY(0) translateX(0) rotate(0deg)", opacity: "0" },
          "10%": { opacity: "0.5" },
          "90%": { opacity: "0.5" },
          "100%": { transform: "translateY(-640px) translateX(30px) rotate(8deg)", opacity: "0" },
        },
        "screen-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
        drift: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(3%, -4%) scale(1.06)" },
        },
      },
      animation: {
        "pop-in": "pop-in 0.35s ease-out both",
        "fill-bar": "fill-bar 0.8s ease-out",
        "card-in": "card-in 0.35s ease-out both",
        "float-up": "float-up linear infinite",
        "screen-in": "screen-in 0.25s ease-out both",
        marquee: "marquee linear infinite",
        float: "float 6s ease-in-out infinite",
        drift: "drift 16s ease-in-out infinite",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(168, 85, 247, 0.45), 0 0 26px -4px rgba(168, 85, 247, 0.55)",
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
};
