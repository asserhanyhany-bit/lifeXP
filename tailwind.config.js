/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        night: '#080b13',
        panel: '#101521',
        violet: '#9d72ff',
        cyan: '#49d9ef',
        gold: '#f4c878',
      },
    },
  },
  plugins: [],
}
