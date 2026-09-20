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
        /**
         * The three Sovereign Estate ramps.
         *
         * `ink` is one continuous type/chrome scale: 100–200 are the tints that
         * stay legible on the dark tour chrome, 300–500 the muted metadata on
         * paper, 700 the body colour the base layer already sets, and 900/950
         * the onyx surfaces. `sand` is the warm paper neutral the cold stock
         * grays clash with; `gold` is the champagne accent, the only saturated
         * ramp in the system.
         */
        ink: {
          50: '#f7f7f6',
          100: '#dcdedf',
          200: '#b6babd',
          300: '#7b8085',
          400: '#646a70',
          500: '#4e545a',
          600: '#3c4247',
          700: '#333333',
          800: '#23262a',
          900: '#1a1d20',
          950: '#0c1013',
        },
        sand: {
          50: '#fafaf8',
          100: '#f4f3ef',
          200: '#e7e4dc',
          300: '#d6d1c6',
          400: '#b4ad9d',
          500: '#938c7c',
          600: '#77705f',
          700: '#5c5648',
          800: '#403c32',
          900: '#26231d',
        },
        gold: {
          50: '#faf7ef',
          100: '#f3ecd9',
          200: '#e7d8b4',
          300: '#d9c390',
          400: '#cfb47c',
          500: '#c5a869',
          600: '#ab8c50',
          700: '#8a6f3f',
          800: '#665231',
          900: '#453722',
        },
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
      fontSize: {
        // Fluid display sizes: the masthead type scales with the viewport
        // instead of stepping at each breakpoint.
        'display-sm': ['clamp(1.5rem, 1.1rem + 1.6vw, 2.125rem)', { lineHeight: '1.18' }],
        display: ['clamp(2rem, 1.4rem + 2.6vw, 3.25rem)', { lineHeight: '1.1' }],
        'display-lg': ['clamp(2.5rem, 1.6rem + 4vw, 4.5rem)', { lineHeight: '1.04' }],
      },
      borderRadius: {
        // The system rounds barely at all; `xs` is the hairline round used on
        // panels, map chrome and thumbnails.
        xs: '2px',
      },
      opacity: {
        12: '0.12',
        88: '0.88',
        92: '0.92',
        94: '0.94',
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
        soft: '0 1px 2px rgba(15, 23, 32, 0.04), 0 8px 20px -12px rgba(15, 23, 32, 0.16)',
        lift: '0 2px 4px rgba(15, 23, 32, 0.06), 0 14px 30px -10px rgba(15, 23, 32, 0.24)',
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
        'fade-down': {
          from: { opacity: '0', transform: 'translateY(-6px)' },
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
        'fade-down': 'fade-down 0.16s cubic-bezier(0.22, 1, 0.36, 1) both',
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
