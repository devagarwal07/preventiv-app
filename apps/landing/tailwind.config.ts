import type { Config } from "tailwindcss";

const config: Config = {
    content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                primary: "#0B6E4F",
                accent: "#E8A917",
                paper: "#FFF8EE",
                ink: "#123227"
            },
            borderRadius: {
                soft: "14px",
                card: "20px"
            },
            boxShadow: {
                panel: "0 10px 35px rgba(11, 110, 79, 0.12)"
            }
        }
    },
    plugins: []
};

export default config;
