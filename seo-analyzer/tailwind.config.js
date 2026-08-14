/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          500: '#8B2CFF',
          600: '#7C22E6',
          700: '#6B16D1',
          accent: '#B84DFF'
        }
      }
    },
  },
  plugins: [],
}
