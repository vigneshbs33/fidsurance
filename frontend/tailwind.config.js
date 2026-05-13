/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}", "./index.js"],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: "#1B5E20",
        accent: "#4CAF50",
        surface: "#FFFFFF",
        background: "#F4F6F4",
        danger: "#C62828",
        text: "#212121",
        subtext: "#757575",
        border: "#E0E0E0",
        riskLow: "#388E3C",
        riskMedium: "#F9A825",
        riskHigh: "#E64A19",
        riskCritical: "#B71C1C",
        agentBubble: "#E8F5E9",
        userBubble: "#1B5E20",
      }
    },
  },
  plugins: [],
}
