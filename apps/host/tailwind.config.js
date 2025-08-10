/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        casino: {
          gold: '#FFD700',
          emerald: '#00FFB4',
          purple: '#8B5CF6',
          dark: '#0F0F23',
        }
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00FFB4, 0 0 10px #00FFB4, 0 0 15px #00FFB4' },
          '100%': { boxShadow: '0 0 10px #00FFB4, 0 0 20px #00FFB4, 0 0 30px #00FFB4' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        }
      }
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
