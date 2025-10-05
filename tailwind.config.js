/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#1e1e1e',
        panel: '#2b2b2b',
        border: '#3d3d3d',
        text: {
          primary: '#ffffff',
          secondary: '#a0a0a0',
        },
        accent: '#0d99ff',
        grid: {
          minor: '#2a2a2a',
          major: '#353535',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
