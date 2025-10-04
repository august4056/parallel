import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f9f5ff',
          100: '#f2ebff',
          200: '#ded1ff',
          300: '#c8b4ff',
          400: '#a889ff',
          500: '#8e63ff',
          600: '#7845f4',
          700: '#5f2dd6',
          800: '#4723a3',
          900: '#331873'
        }
      }
    }
  },
  plugins: [forms]
};

export default config;
