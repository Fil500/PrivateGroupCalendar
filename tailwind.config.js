/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'Inter', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'pop-in': { from: { opacity: '0', transform: 'scale(.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'toast-in': { from: { opacity: '0', transform: 'translate(-50%, 12px)' }, to: { opacity: '1', transform: 'translate(-50%, 0)' } },
      },
      animation: {
        'sheet-up': 'sheet-up .3s cubic-bezier(.32,.72,0,1)',
        'pop-in': 'pop-in .18s ease-out',
        'fade-in': 'fade-in .2s ease-out',
        'toast-in': 'toast-in .2s ease-out',
      },
    },
  },
  plugins: [],
};
