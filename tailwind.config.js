/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Flash color palette
        primary: {
          DEFAULT: "#007856",
          3: "#000000",
          4: "#fe990d",
          5: "#ffad0d",
        },
        blue: {
          5: "#4453E2",
        },
        grey: {
          0: "#3A3C51",
          1: "#61637A",
          2: "#9292A0",
          3: "#AEAEB8",
          4: "#E2E2E4",
          5: "#F2F2F4",
        },
        error: "#DC2626",
        error9: "#FEE2E2",
        red: "#DC2626",
        warning: "#F59E0B",
        warning9: "#fff1d8",
        green: "#00A700",
        accent01: "#E8D315",
        accent02: "#007856",
        border01: "#DDE3E1",
        border02: "#002118",
        background: "#F1F1F1",
        layer: "#FFFFFF",
        text01: "#212121",
        text02: "#939998",
        textInverse: "#FFFFFF",
        textPlaceholder: "#939998",
        placeholder: "#829993",
        icon01: "#000000",
        icon02: "#939998",
        iconInverse: "#FFFFFF",
        button01: "#002118",
        button02: "#E3E3E3",
        buttonInverse: "#FFFFFF",
        tabActive: "#002118",
        tabInactive: "#83899B",
      },
      fontFamily: {
        sora: ["Sora", "sans-serif"],
        "sora-bold": ["Sora-Bold", "sans-serif"],
      },
      borderRadius: {
        xl: "20px",
        "2xl": "50px",
      },
      spacing: {
        18: "4.5rem",
        88: "22rem",
      },
    },
  },
  plugins: [require("@fedibtc/tailwind-theme")],
};
