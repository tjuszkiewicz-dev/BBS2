/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./views/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        serif: ['serif'],
        script: ['cursive'], // Fallback for signatures
      },
      colors: {
        primary: {
          50:  '#f0f9fb',
          100: '#d9eff4',
          200: '#b3dfea',
          300: '#7ecbda',
          400: '#4a95a9',
          500: '#3a7d8f',
          600: '#2d6575',
          700: '#224f5c',
          800: '#183b45',
          900: '#0e2a31',
          950: '#071519',
        },
        secondary: {
          50:  '#fdf8ee',
          100: '#faefd0',
          200: '#f5dc9d',
          300: '#efc35f',
          400: '#f0a500',
          500: '#d4920a',
          600: '#b07808',
          700: '#8a5e06',
          800: '#6b4805',
          900: '#4f3504',
          950: '#2e1e02',
        },
        background: {
          DEFAULT: '#0b1622',
          surface: '#111e2d',
          card: '#162233',
          border: '#1e3347',
        },
      },
      borderRadius: {
        'sm': '0.375rem',
        DEFAULT: '0.625rem',
        'md': '0.75rem',
        'lg': '1rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      animation: {
        'in': 'fadeIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-in-from-right': 'slideInFromRight 0.3s ease-out',
        'zoom-in-95': 'zoomIn95 0.2s ease-out',
        'star-movement-bottom': 'star-movement-bottom linear infinite alternate',
        'star-movement-top': 'star-movement-top linear infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInFromRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        zoomIn95: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'star-movement-bottom': {
          '0%': { transform: 'translate(0%, 0%)', opacity: '1' },
          '100%': { transform: 'translate(-100%, 0%)', opacity: '0' },
        },
        'star-movement-top': {
          '0%': { transform: 'translate(0%, 0%)', opacity: '1' },
          '100%': { transform: 'translate(100%, 0%)', opacity: '0' },
        },
      }
    },
  },
  plugins: [],
}