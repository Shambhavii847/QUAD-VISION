/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          50: '#FCF9F2',
          100: '#F7F2E7', // Reference canvas warm cream
          200: '#EFE8D8',
          300: '#E2D9C5',
          border: '#E8DFC9',
        },
        charcoal: {
          DEFAULT: '#161616', // Dark Sidebar & accents from reference
          50: '#2A2A2A',
          100: '#222222',
          200: '#1C1C1C',
          800: '#141414',
          900: '#0E0E0E',
          border: '#282828',
        },
        pastel: {
          pink: '#F6AECB',    // Exact Bubblegum Blush Pink from reference
          pinkBg: '#FCE7F1',
          yellow: '#F9DF7B',  // Exact Butter Warm Yellow from reference
          yellowBg: '#FEF7D6',
          blue: '#9EC0EF',    // Exact Powder Sky Blue from reference
          blueBg: '#E4EFFD',
          green: '#B8D094',   // Exact Sage Green from reference
          greenBg: '#EBF3E1',
        },
        status: {
          complete: '#B8D094',
          ontrack: '#B8D094',
          tight: '#F9DF7B',
          danger: '#F6AECB',
          info: '#9EC0EF',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 10px -2px rgba(32, 32, 32, 0.05), 0 1px 3px -1px rgba(32, 32, 32, 0.03)',
        'card': '0 4px 16px -3px rgba(32, 32, 32, 0.06), 0 2px 6px -2px rgba(32, 32, 32, 0.04)',
      }
    },
  },
  plugins: [],
}
