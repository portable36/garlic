/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#fcca19',
          50: '#fef9e6',
          100: '#fef3cc',
          200: '#fde799',
          300: '#fcdb66',
          400: '#fbcf33',
          500: '#fcca19',
          600: '#e6b617',
          700: '#cc9f14',
          800: '#b38811',
          900: '#99710e',
          950: '#66500a',
        },
      },
    },
  },
  plugins: [],
}
