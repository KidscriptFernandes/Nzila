/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        nzila: {
          red: "#CC092F",
          "red-soft": "#FBE6EA",
          black: "#0D0D0D",
          gold: "#FFCB00",
          "gold-soft": "#FFF6D1",
          sun: "#FFE066",
          sand: "#F7F0E3",
          clay: "#9C3A24",
          "clay-soft": "#F6E7E2",
          ocean: "#0E6F7C",
          "ocean-soft": "#E3F1F3",
          baobab: "#2E7D4F",
          "baobab-soft": "#E7F3EB",
        },
        ink: "#0D0D0D",
        "ink-soft": "#4A4A4A",
        line: "#E6DCC8",
        surface: "#FFFFFF",
        canvas: "#F7F0E3",
        night: "#0D0D0D",
        coal: "#171717",
        "night-line": "#2A2622",
        "night-muted": "#B8B0A2",
      },
      fontFamily: {
        heading: ["Sora_700Bold"],
        "heading-semi": ["Sora_600SemiBold"],
        body: ["Manrope_400Regular"],
        "body-medium": ["Manrope_500Medium"],
        "body-semi": ["Manrope_600SemiBold"],
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        "3xl": "28px",
      },
    },
  },
  plugins: [],
};
