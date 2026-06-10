import type { Config } from 'tailwindcss';

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
        arabic: ['Noto Naskh Arabic', 'serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in': 'fadeIn 0.6s cubic-bezier(0.22,1,0.36,1) both',
        'fade-left': 'fadeLeft 0.8s cubic-bezier(0.22,1,0.36,1) both',
        'fade-right': 'fadeRight 0.8s cubic-bezier(0.22,1,0.36,1) both',
        'slide-down': 'slideDown 0.35s cubic-bezier(0.22,1,0.36,1)',
        'float': 'float 7s ease-in-out infinite',
        'float-slow': 'float 11s ease-in-out infinite',
        'spin-slow': 'spin 40s linear infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'bounce-soft': 'bounceSoft 2.5s ease-in-out infinite',
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
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};

export default config;
