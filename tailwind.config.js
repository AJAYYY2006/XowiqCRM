/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        xowiq: {
          orange: '#ff5900',
          'orange-light': '#ff8237',
          amber: '#f97316',
          indigo: '#6366f1',
          blue: '#2563eb',
          sky: '#38bdf8',
          slate: '#0f172a',
          'slate-light': '#1e293b',
          card: '#ffffff',
          bg: '#f8fafc',
          border: 'rgba(255, 89, 0, 0.2)',
        }
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
        logo: ['Poppins', 'sans-serif'],
      },
      fontWeight: {
        thin: '100',
        extralight: '200',
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'xowiq-sm': '0 2px 8px -2px rgba(255, 89, 0, 0.12)',
        'xowiq': '0 8px 30px -4px rgba(255, 89, 0, 0.18)',
        'xowiq-lg': '0 20px 50px -10px rgba(255, 89, 0, 0.28)',
        'xowiq-indigo': '0 10px 40px -5px rgba(99, 102, 241, 0.25)',
      }
    },
  },
  plugins: [],
}
