/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sys: {
          bg: '#07111f',
          surface: '#0b1424',
          card: '#0f1a2e',
          border: 'rgba(255,255,255,0.10)',
          muted: 'rgba(255,255,255,0.62)',
          faint: 'rgba(255,255,255,0.34)',
          orange: '#e85d3f',
          amber: '#f2a33b',
          teal: '#14b8a6',
          blue: '#38bdf8',
        },
      },
      fontFamily: {
        display: ["'Bricolage Grotesque'", "'Plus Jakarta Sans'", 'system-ui', 'sans-serif'],
        mono: ["'IBM Plex Mono'", "'SF Mono'", 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
