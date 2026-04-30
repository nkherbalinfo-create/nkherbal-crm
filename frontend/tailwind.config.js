/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '10': '10px',
        '10.5': '10.5px',
        '11': '11px',
        '11.5': '11.5px',
        '12': '12px',
        '12.5': '12.5px',
        '13': '13px',
        '14': '14px',
      },
      borderRadius: {
        'card': '14px',
        'btn':  '9px',
        'chip': '999px',
        'field': '9px',
        'icon': '8px',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideIn: { '0%': { opacity: '0', transform: 'translateX(-8px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        fadeIn:  'fadeIn 0.2s ease-out',
        slideIn: 'slideIn 0.2s ease-out',
        shimmer: 'shimmer 1.5s infinite linear',
      },
    },
  },
  plugins: [],
};
