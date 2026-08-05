/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx,mdx}",
    "./src/app/**/*.{js,jsx,ts,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        // Career Vector color scheme
        cream: "#FAF9F6",          // background
        ink: "#1a1a1a",            // primary text
        accent: "#E8472A",         // brand accent (orange-red)
        logo: "#000000",           // logo black
        "surface": "#FFFFFF",
        "ink-soft": "#57534E",
        "ink-muted": "#8B857C",
        "line": "#E5E0D8",
        "line-dark": "#D2CBC0"
      },
      screens: {
        // Mobile: 320px - 480px   (base)
        // Tablet: 481px - 768px   (sm)
        "sm": "481px",
        // Laptop: 769px - 1280px  (md)
        "md": "769px",
        "lg": "1025px",
        // Large desktop: 1281px+  (xl)
        "xl": "1281px",
        "2xl": "1536px"
      },
      boxShadow: {
        "sidebar": "4px 0 15px rgba(0, 0, 0, 0.1)"
      },
      transitionTimingFunction: {
        "sidebar": "cubic-bezier(0.4, 0, 0.2, 1)"
      },
      fontFamily: {
        display: ["Outfit", "sans-serif"],
        body: ["Jost", "sans-serif"],
        mono: ["Fira Code", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"]
      }
    }
  },
  plugins: []
};
