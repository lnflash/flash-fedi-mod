/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Flash brand palette
        primary: "#007856",
        "primary-dark": "#00604a",
        "primary-light": "#e6f2ee",
        bg: "#f5f6f7",
        layer: "#ffffff",
        ink: "#3a3c51",
        muted: "#61637a",
        border: "#e2e4ea",
        error: "#d3463a",
        warning: "#b58a00",
        success: "#007856",
      },
      fontFamily: {
        sora: ["Sora", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
