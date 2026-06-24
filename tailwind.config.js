/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bullet-dark': '#0f1216',
        'bullet-panel': '#1a2026',
        'bullet-panel-lighter': '#262e36',
        'bullet-accent': '#d97706',
        'bullet-glow': '#fbbf24',
        'bullet-text': '#e2e8f0',
        'bullet-muted': '#64748b',
      },
      fontFamily: {
        mono: ['"Share Tech Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
