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
        'rmc-gold': '#D4A017',
      },
      fontFamily: {
        arabic: ['Noto Naskh Arabic', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
