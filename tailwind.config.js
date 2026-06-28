/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // IPSCAirshuting design system (imported from claude.ai/design)
        'ipsc-bg': '#0d100e',
        'ipsc-panel': '#11140f',
        'ipsc-line': '#1d211e',
        'ipsc-line2': '#2c322c',
        'ipsc-accent': '#e8732a',
        'ipsc-text': '#e9e7e1',
        'ipsc-muted': '#7a7f7a',
        'ipsc-muted2': '#9aa09a',
      },
      fontFamily: {
        jet: ['"JetBrains Mono"', 'monospace'],
        saira: ['Saira', 'sans-serif'],
        'saira-cond': ['"Saira Condensed"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
