import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        shell: "#07090f",
        panel: "#101420",
        "panel-soft": "#141a29",
        line: "#242b3d",
        neon: "#b2ff3f",
        violet: "#a78bfa",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(178, 255, 63, 0.25), 0 0 22px rgba(178, 255, 63, 0.28)",
      },
    },
  },
  plugins: [],
};
export default config;
