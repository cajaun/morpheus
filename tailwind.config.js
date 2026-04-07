/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./features/**/*.{js,jsx,ts,tsx}",
    "./shared/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        sfBlack: ["Sf-black", "sans-serif"],
        sfBold: ["Sf-bold", "sans-serif"],
        sfSemiBold: ["Sf-semibold", "sans-serif"],
        sfMedium: ["Sf-medium", "sans-serif"],
        sfRegular: ["Sf-regular", "sans-serif"],
        sfLight: ["Sf-light", "sans-serif"],
        sfThin: ["Sf-thin", "sans-serif"],
      },
    },
  },
  plugins: [],
};
