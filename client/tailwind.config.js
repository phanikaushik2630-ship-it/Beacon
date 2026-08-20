/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans:     ['Inter', 'system-ui', 'sans-serif'],
        playfair: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      colors: {
        night: {
          950: '#000000',
          900: '#080808',
          850: '#0f0f0f',
          800: '#171717',
          700: '#262626',
        }
      },
    },
  },
  plugins: [],
}
