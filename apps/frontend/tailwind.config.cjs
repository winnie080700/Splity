/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#11203a",
        sky: "#dff3ff",
        mint: "#ccf7de",
        amber: "#f8df9a"
      }
    }
  },
  plugins: []
};
