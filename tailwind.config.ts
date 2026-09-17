import type { Config } from 'tailwindcss';

/**
 * Token source: sovereign_estate_system/DESIGN.md plus the per-page Tailwind
 * configs embedded in the reference mockups. Keeping every key the mockups used
 * (brand.*, luxury.*) means class strings copied out of them resolve verbatim.
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          charcoal: '#1c1f22',
          dark: '#111315',
          gray: '#656b72',
          lightGray: '#f8f9fa',
          border: '#e2e6ea',
          blue: '#1a6fa0',
          accent: '#b89d62',
        },
        luxury: {
          gold: '#c5a059',
          dark: '#121619',
          navy: '#0b1320',
          gray: '#60646c',
          light: '#f8f9fa',
          accent: '#2b6cb0',
        },
        sovereign: {
          sapphire: '#0f2b48',
          champagne: '#c5a869',
          onyx: '#1a1d20',
          platinum: '#5c6470',
          alabaster: '#fafaf8',
          hairline: '#e5e7eb',
        },
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['var(--font-montserrat)', 'Montserrat', 'Helvetica Neue', 'sans-serif'],
        crest: ['var(--font-cinzel)', 'Cinzel', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      maxWidth: {
        canvas: '1440px',
        page: '1400px',
        wide: '1600px',
      },
      boxShadow: {
        card: '0 12px 32px -4px rgba(15, 43, 72, 0.07)',
        pill: '0 16px 40px -8px rgba(0, 0, 0, 0.22)',
        menu: '0 8px 24px -2px rgba(10, 15, 25, 0.12)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'hotspot-pulse': {
          '0%': { transform: 'scale(1)', opacity: '0.55' },
          '70%': { transform: 'scale(2.1)', opacity: '0' },
          '100%': { transform: 'scale(2.1)', opacity: '0' },
        },
        'sheen': {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(220%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease both',
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'hotspot-pulse': 'hotspot-pulse 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        sheen: 'sheen 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
};

export default config;
