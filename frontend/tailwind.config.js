/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        vault: {
          bg: "#0a0a0a",
          surface: "#111111",
          border: "#222222",
          accent: "#6366f1",
          hover: "#4f46e5",
          primary: "#f5f5f5",
          secondary: "#888888",
          success: "#10b981",
          warning: "#f59e0b"
        }
      }
    }
  },
  plugins: []
};
