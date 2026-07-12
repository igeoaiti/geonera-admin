import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Dashboard design tokens
        surface: {
          DEFAULT: '#F0F9FF', // sky-50
          card: '#FFFFFF',
          hover: '#E0F2FE', // sky-100
          border: '#E2E8F0', // slate-200
        },
      },
      gridTemplateAreas: {
        shell: '"topbar topbar" "sidebar main"',
      },
    },
  },
  plugins: [],
} satisfies Config
