/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        slate: "#475569",
        line: "#d9e2ec",
        sky: "#dbeafe",
        mint: "#dcfce7",
        amber: "#fef3c7",
        brand: "#2563eb",
        success: "#15803d",
        danger: "#b42318"
      },
      boxShadow: {
        soft: "0 20px 44px -26px rgba(15, 23, 42, 0.24)",
        lift: "0 24px 60px -30px rgba(37, 99, 235, 0.26)"
      }
    }
  },
  plugins: []
};
