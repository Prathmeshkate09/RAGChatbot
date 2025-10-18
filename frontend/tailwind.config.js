/******** Tailwind Config ********/
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: '#1f2937',
        background: '#000000',
        foreground: '#e2e8f0',
        muted: '#0b1220',
        primary: '#22d3ee',
        card: '#0a0a0a'
      },
      boxShadow: {
        glow: '0 0 20px 2px rgba(34, 211, 238, 0.25)'
      },
      backgroundImage: {
        'grid': 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
        'radial-fade': 'radial-gradient(1200px 600px at 50% -20%, rgba(34,211,238,0.15), transparent 60%)'
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '200% 0%' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' }
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 0px rgba(34,211,238,0.0)' },
          '50%': { boxShadow: '0 0 30px rgba(34,211,238,0.35)' }
        }
      },
      animation: {
        'fade-in-up': 'fade-in-up 400ms ease-out both',
        shimmer: 'shimmer 2.5s linear infinite',
        float: 'float 6s ease-in-out infinite',
        glow: 'glow 2.2s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
