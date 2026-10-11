/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        venom: {
          teal: '#14b8a6',
          emerald: '#10b981',
          gold: '#f59e0b',
          purple: '#8b5cf6',
          coral: '#f97316',
          indigo: '#6366f1'
        }
      },
      fontFamily: {
        gaming: ['Orbitron', 'sans-serif'],
        stats: ['Rajdhani', 'sans-serif'],
        body: ['Inter', 'sans-serif']
      }
    },
  },
  plugins: [],
}