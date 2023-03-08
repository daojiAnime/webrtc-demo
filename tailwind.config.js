/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js,ts,vue}"],
  theme: {
    extend: {
      gridTemplateColumns: {
        // grid-template-columns: repeat(auto-fill, 300px);
        "auto-300": "repeat(auto-fill, 300px);",

        // Complex site-specific column configuration
        footer: "200px minmax(900px, 1fr) 100px"
      }
    }
  },
  plugins: [require("daisyui")]
};

