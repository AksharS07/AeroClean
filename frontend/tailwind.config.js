/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        card: '#111827',
        border: '#1f2937',
        primary: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
        },
        clean: '#10b981',
        moderate: '#f59e0b',
        high: '#f97316',
        critical: '#ef4444',
      },
    },
  },
  plugins: [],
}
