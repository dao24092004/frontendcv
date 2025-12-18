/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'canva-bg': '#FDFBF7',       // Eggshell
        'canva-paper': '#FFFFFF',    // White
        'canva-primary': '#E6BAA3',  // Pastel Earthy Orange
        'canva-secondary': '#B5EAD7',// Mint Green
        'canva-accent': '#C7CEEA',   // Light Purple
        'canva-text': '#4A4A4A',     // Charcoal Gray
        'canva-gray': '#888888'      // Light Gray
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}