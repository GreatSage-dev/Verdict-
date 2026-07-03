/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#080B14",
        surface: "#0F1321",
        borderDark: "#1E2640",
        primary: "#4F6EF7",
        approve: "#00D48B",
        reject: "#F7476E",
        pending: "#F5A623",
      },
      fontFamily: {
        headline: ["Sora", "sans-serif"],
        body: ["Space Grotesk", "sans-serif"],
        mono: ["Space Mono", "monospace"],
      },
    },
  },
  plugins: [],
}
