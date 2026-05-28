/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          950: '#0a0b10',
          900: '#12141d',
          800: '#1a1d2b',
          700: '#252a3a',
          600: '#363d52',
          400: '#6b7394',
          300: '#9da3bd',
        },
        forge: {
          400: '#d4884f',
          500: '#c06e3b',
          600: '#a85a2d',
        },
        ember: {
          500: '#e85d3a',
        },
        ash: {
          100: '#ecedf2',
          400: '#8890a7',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'radial-forge': 'radial-gradient(circle at center, rgba(192, 110, 59, 0.08) 0%, rgba(10, 11, 16, 1) 70%)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 0 0 rgba(232, 93, 58, 0.4)' },
          '50%': { opacity: .8, boxShadow: '0 0 0 8px rgba(232, 93, 58, 0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}