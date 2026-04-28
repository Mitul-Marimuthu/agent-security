import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        leak: {
          none:    "#16a34a",
          partial: "#d97706",
          full:    "#dc2626",
        },
      },
    },
  },
  plugins: [],
};

export default config;
