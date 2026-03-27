import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./lib/**/*.{js,ts,jsx,tsx,mdx}"
    ],
    theme: {
        extend: {
            colors: {
                primary: "#0B6E4F",
                secondary: "#F0F7F4",
                accent: "#E8A917",
                ink: "#153226",
                fog: "#C9D9D2"
            },
            fontFamily: {
                body: ["var(--font-inter)", "sans-serif"],
                heading: ["var(--font-sora)", "sans-serif"]
            },
            borderRadius: {
                soft: "0.65rem",
                card: "1rem",
                hero: "1.75rem"
            },
            boxShadow: {
                calm: "0 8px 24px rgba(11, 110, 79, 0.15)",
                float: "0 16px 30px rgba(6, 42, 30, 0.22)"
            }
        }
    },
    plugins: []
};

export default config;
