import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'rmc-green': '#1A7A4A',
        'rmc-green-dark': '#145C38',
        'rmc-green-light': '#E8F5EE',
        'rmc-green-deep': '#0D3D24',
        'rmc-gold': '#D4A017',
        'rmc-gold-light': '#F0C040',
        'rmc-dark': '#0A1628',
        'rmc-navy': '#0F2740',
      },
      fontFamily: {
        // Latin — Nunito (all weights, weight = hierarchy)
        latin:   ['var(--font-latin)', 'system-ui', 'sans-serif'],
        sans:    ['var(--font-latin)', 'system-ui', 'sans-serif'],
        body:    ['var(--font-latin)', 'system-ui', 'sans-serif'],
        display: ['var(--font-latin)', 'system-ui', 'sans-serif'],
        // Arabic — Noto Naskh Arabic (smooth Naskh, all Arabic text)
        arabic:           ['var(--font-arabic)', 'serif'],
        'arabic-display': ['var(--font-arabic)', 'serif'],
        'arabic-body':    ['var(--font-arabic)', 'serif'],
        quran:            ['var(--font-arabic)', 'serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fadeIn 0.6s cubic-bezier(0.22,1,0.36,1) both',
        'fade-left': 'fadeLeft 0.8s cubic-bezier(0.22,1,0.36,1) both',
        'fade-right': 'fadeRight 0.8s cubic-bezier(0.22,1,0.36,1) both',
        'slide-down': 'slideDown 0.35s cubic-bezier(0.22,1,0.36,1)',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.22,1,0.36,1)',
        'float': 'float 7s ease-in-out infinite',
        'float-slow': 'float 11s ease-in-out infinite',
        'spin-slow': 'spin 40s linear infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'bounce-soft': 'bounceSoft 2.5s ease-in-out infinite',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.22,1,0.36,1) both',
        'count-up': 'countUp 0.6s cubic-bezier(0.22,1,0.36,1) both',
        'dropdown-in':  'dropdownIn 0.14s cubic-bezier(0.22,1,0.36,1) both',
        'dropdown-out': 'dropdownOut 0.1s ease-in both',
        'modal-in': 'modalIn 0.22s cubic-bezier(0.22,1,0.36,1) both',
        'overlay-in': 'overlayIn 0.18s ease-out both',
        'modal-out': 'modalOut 0.18s cubic-bezier(0.55,0,1,0.45) both',
        'overlay-out': 'overlayOut 0.16s ease-in both',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(24px) translateZ(0)' },
          to: { opacity: '1', transform: 'translateY(0) translateZ(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeLeft: {
          from: { opacity: '0', transform: 'translateX(-24px) translateZ(0)' },
          to: { opacity: '1', transform: 'translateX(0) translateZ(0)' },
        },
        fadeRight: {
          from: { opacity: '0', transform: 'translateX(24px) translateZ(0)' },
          to: { opacity: '1', transform: 'translateX(0) translateZ(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-10px) translateZ(0)' },
          to: { opacity: '1', transform: 'translateY(0) translateZ(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px) translateZ(0)' },
          to: { opacity: '1', transform: 'translateY(0) translateZ(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-18px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(26, 122, 74, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(26, 122, 74, 0.65)' },
        },
        shimmer: {
          from: { backgroundPosition: '-400% center' },
          to: { backgroundPosition: '400% center' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.92) translateZ(0)' },
          to: { opacity: '1', transform: 'scale(1) translateZ(0)' },
        },
        countUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        dropdownIn: {
          from: { opacity: '0', transform: 'scaleY(0.94) translateY(-6px)' },
          to:   { opacity: '1', transform: 'scaleY(1)    translateY(0)' },
        },
        dropdownOut: {
          from: { opacity: '1', transform: 'scaleY(1)    translateY(0)' },
          to:   { opacity: '0', transform: 'scaleY(0.96) translateY(-4px)' },
        },
        modalIn: {
          from: { opacity: '0', transform: 'scale(0.95) translateY(12px)' },
          to:   { opacity: '1', transform: 'scale(1)   translateY(0)' },
        },
        modalOut: {
          from: { opacity: '1', transform: 'scale(1)    translateY(0)' },
          to:   { opacity: '0', transform: 'scale(0.97) translateY(6px)' },
        },
        overlayIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        overlayOut: {
          from: { opacity: '1' },
          to:   { opacity: '0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [typography],
};

export default config;
