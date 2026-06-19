/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
      },
      colors: {
        'mint': '#A8E6CF',
        'mint-dark': '#87D8B9',
        'light-gray': '#F5F5F5',
        'dark-gray': '#333333',
        'dark-bg': '#1a202c',
        'dark-card': '#2d3748',
      },
    },
  },
  plugins: [],
}

