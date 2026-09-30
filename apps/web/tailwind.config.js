/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef8ff',
          100: '#d8efff',
          200: '#b9e2fe',
          300: '#89cefd',
          400: '#52b0fa',
          500: '#2b90f5',
          600: '#1570e6',
          700: '#0f58cb',
          800: '#1248a3',
          900: '#153e80',
          950: '#10274e',
        },
      },
    },
  },
  plugins: [],
}
