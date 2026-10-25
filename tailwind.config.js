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
        strava: {
          DEFAULT: '#FC4C02',
          hover: '#E34402',
          light: '#FF6D2C',
          dark: '#D13E00'
        }
      }
    },
  },
  plugins: [],
}
