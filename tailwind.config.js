import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', '"Manrope"', 'sans-serif'],
        body: ['Manrope', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'ex-btn': '0 14px 34px -12px rgba(20,12,45,0.55)',
        'ex-card': '0 24px 70px -34px rgba(150,128,220,0.55)',
      },
      transitionTimingFunction: {
        ex: 'cubic-bezier(0.2,0.8,0.2,1)',
      },
      backgroundImage: {
        'ex-accent': 'linear-gradient(100deg,#d8c8ff 0%,#b79cff 45%,#8f6bff 100%)',
        'ex-icon': 'linear-gradient(150deg,#b9aee3,#6f61a6)',
        'ex-surface': 'linear-gradient(160deg,#17161d 0%,#121118 100%)',
        'ex-cta': 'radial-gradient(120% 140% at 50% 0%, rgba(150,128,220,0.5) 0%, rgba(150,128,220,0) 60%), linear-gradient(160deg,#17161d,#0c0c0f)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        ex: '26px',
        'ex-lg': '34px',
        'ex-ctrl': '14px',
      },
      colors: {
        ex: {
          bg: '#0c0c0f',
          ink: '#0c0c0f',
          surface: '#17161d',
          surface2: '#121118',
          text: '#efecf6',
          muted: '#a7a1b8',
          faint: '#7d7690',
          purple: '#8f6bff',
          lav: {
            50: '#f5f3fa', 100: '#ece8f5', 200: '#ddd6ec',
            300: '#c7bde0', 400: '#b79cff', 500: '#8b7fb0', 700: '#574d73',
          },
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        }
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0'
          },
          to: {
            height: 'var(--radix-accordion-content-height)'
          }
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)'
          },
          to: {
            height: '0'
          }
        },
        'bell-ring': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '2%, 6%, 10%': { transform: 'rotate(18deg)' },
          '4%, 8%, 12%': { transform: 'rotate(-18deg)' },
          '14%': { transform: 'rotate(10deg)' },
          '16%': { transform: 'rotate(-10deg)' },
          '18%': { transform: 'rotate(4deg)' },
          '20%': { transform: 'rotate(0deg)' },
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'bell-ring': 'bell-ring 3.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite'
      }
    }
  },
  plugins: [tailwindcssAnimate],
};
