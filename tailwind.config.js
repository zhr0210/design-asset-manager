/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif'
        ]
      },
      boxShadow: {
        'premium': '0 4px 20px -2px rgba(17, 24, 39, 0.04), 0 2px 6px -1px rgba(17, 24, 39, 0.02)',
        'card-hover': '0 12px 30px -4px rgba(17, 24, 39, 0.08), 0 4px 12px -2px rgba(17, 24, 39, 0.04)'
      },
      colors: {
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          500: '#6366f1', // Indigo premium brand color
          600: '#4f46e5',
          700: '#4338ca'
        }
      }
    }
  },
  plugins: []
}
