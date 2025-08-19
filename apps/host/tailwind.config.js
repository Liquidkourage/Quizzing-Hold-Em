/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        casino: {
          dark: '#0a0a0a',
          gold: '#FFD700',
          emerald: '#00FFB4',
          purple: '#8B5CF6',
          red: '#FF4444',
          blue: '#3B82F6',
          emeraldHover: '#00E6A3',
          goldHover: '#FFC800',
          purpleHover: '#7C3AED',
          redHover: '#FF3333',
          blueHover: '#2563EB',
          goldGlow: '#FFD700',
          emeraldGlow: '#00FFB4',
          purpleGlow: '#8B5CF6',
          redGlow: '#FF4444',
          blueGlow: '#3B82F6',
        },
        neon: {
          emerald: '#00FFB4',
          gold: '#FFD700',
          purple: '#8B5CF6',
          red: '#FF4444',
          blue: '#3B82F6',
        }
      },
      backgroundImage: {
        'casino-gradient': 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 25%, #16213e 50%, #0f3460 75%, #0a0a0a 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        'neon-emerald': 'linear-gradient(45deg, #00FFB4, #00E6A3)',
        'neon-gold': 'linear-gradient(45deg, #FFD700, #FFC800)',
        'neon-purple': 'linear-gradient(45deg, #8B5CF6, #7C3AED)',
        'neon-red': 'linear-gradient(45deg, #FF4444, #FF3333)',
        'neon-blue': 'linear-gradient(45deg, #3B82F6, #2563EB)',
      },
      boxShadow: {
        'neon-emerald': '0 0 20px rgba(0, 255, 180, 0.6), 0 0 40px rgba(0, 255, 180, 0.3)',
        'neon-gold': '0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3)',
        'neon-purple': '0 0 20px rgba(139, 92, 246, 0.6), 0 0 40px rgba(139, 92, 246, 0.3)',
        'neon-red': '0 0 20px rgba(255, 68, 68, 0.6), 0 0 40px rgba(255, 68, 68, 0.3)',
        'neon-blue': '0 0 20px rgba(59, 130, 246, 0.6), 0 0 40px rgba(59, 130, 246, 0.3)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-fast': 'glow 1s ease-in-out infinite alternate',
        'float-fast': 'float 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-slow': 'bounce 2s infinite',
        'shake': 'shake 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'rotate-in': 'rotateIn 0.5s ease-out',
        'neon-flicker': 'neonFlicker 2s infinite',
        'neon-pulse': 'neonPulse 1.5s ease-in-out infinite',
        'card-deal': 'cardDeal 0.6s ease-out',
        'chip-spin': 'chipSpin 0.8s ease-out',
        'jackpot': 'jackpot 0.8s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { 
            boxShadow: '0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor',
            textShadow: '0 0 5px currentColor, 0 0 10px currentColor'
          },
          '100%': { 
            boxShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor',
            textShadow: '0 0 10px currentColor, 0 0 20px currentColor'
          }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        neonFlicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' }
        },
        neonPulse: {
          '0%, 100%': { 
            boxShadow: '0 0 20px currentColor, 0 0 40px currentColor',
            textShadow: '0 0 10px currentColor'
          },
          '50%': { 
            boxShadow: '0 0 30px currentColor, 0 0 60px currentColor',
            textShadow: '0 0 20px currentColor'
          }
        },
        cardDeal: {
          '0%': { 
            transform: 'translateY(-100px) rotateY(180deg)',
            opacity: '0'
          },
          '100%': { 
            transform: 'translateY(0) rotateY(0deg)',
            opacity: '1'
          }
        },
        chipSpin: {
          '0%': { 
            transform: 'rotate(0deg) scale(0.8)',
            opacity: '0'
          },
          '50%': { 
            transform: 'rotate(180deg) scale(1.1)',
            opacity: '1'
          },
          '100%': { 
            transform: 'rotate(360deg) scale(1)',
            opacity: '1'
          }
        },
        jackpot: {
          '0%': { 
            transform: 'scale(1)',
            filter: 'brightness(1)'
          },
          '50%': { 
            transform: 'scale(1.1)',
            filter: 'brightness(1.5)'
          },
          '100%': { 
            transform: 'scale(1)',
            filter: 'brightness(1)'
          }
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        rotateIn: {
          '0%': { transform: 'rotate(-180deg)', opacity: '0' },
          '100%': { transform: 'rotate(0deg)', opacity: '1' }
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' }
        }
      }
    },
  },
  plugins: [],
}
