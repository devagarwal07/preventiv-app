import type { Metadata } from "next";
import { Nunito_Sans, Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora" });
const nunito = Nunito_Sans({ subsets: ["latin"], variable: "--font-nunito" });

export const metadata: Metadata = {
    title: "Prevntiv | Your Health. Before it Becomes a Crisis.",
    description:
        "Prevntiv is a continuous health monitoring platform for patients and healthcare professionals.",
    openGraph: {
        title: "Prevntiv",
        description: "Continuous health monitoring with AI-powered early detection"
    }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className={`${sora.variable} ${nunito.variable} font-[var(--font-nunito)] antialiased`}>
                {children}
            </body>
        </html>
    );
}
