/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    container: { center: true, padding: '2rem', screens: { '2xl': '1400px' } },
    extend: {
      colors: {
        border:     'var(--rule-strong)',
        input:      'var(--rule-strong)',
        ring:       'var(--accent)',
        background: 'var(--bg)',
        foreground: 'var(--fg)',
        primary: {
          DEFAULT:    'var(--accent)',
          foreground: 'var(--accent-ink)',
        },
        secondary: {
          DEFAULT:    'var(--chip)',
          foreground: 'var(--fg)',
        },
        destructive: {
          DEFAULT:    'var(--danger)',
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT:    'var(--hover)',
          foreground: 'var(--muted)',
        },
        accent: {
          DEFAULT:    'var(--accent-bg)',
          foreground: 'var(--accent)',
        },
        card: {
          DEFAULT:    'var(--card)',
          foreground: 'var(--fg)',
        },
        popover: {
          DEFAULT:    'var(--card)',
          foreground: 'var(--fg)',
        },
      },
      borderRadius: {
        lg:   'var(--radius)',
        md:   'calc(var(--radius) - 2px)',
        sm:   'calc(var(--radius) - 4px)',
        card: '14px',
        btn:  '9px',
        chip: '999px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      keyframes: {
        'accordion-down':
          { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':
          { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideIn: { '0%': { opacity: '0', transform: 'translateX(-8px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        fadeIn:  'fadeIn 0.2s ease-out',
        slideIn: 'slideIn 0.2s ease-out',
        shimmer: 'shimmer 1.5s infinite linear',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
