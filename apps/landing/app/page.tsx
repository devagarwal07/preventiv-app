"use client";

import { motion } from "framer-motion";
import { LandingSection } from "@/components/LandingSection";

const features = [
    "Unified Health Record",
    "AI Risk Scores",
    "Multi-professional Care Plans",
    "Lab Report Extraction",
    "Community Support",
    "Wearable Sync"
];

export default function LandingPage() {
    return (
        <main className="pb-20">
            <LandingSection className="grid-accent relative overflow-hidden px-6 pb-20 pt-16 md:px-10 lg:px-16">
                <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                    <div>
                        <p className="inline-flex rounded-full border border-primary/20 bg-white px-4 py-1 text-xs uppercase tracking-wide text-primary">
                            Preventive Healthcare Platform
                        </p>
                        <h1 className="mt-5 font-[var(--font-sora)] text-4xl leading-tight text-ink md:text-6xl">
                            Your Health. Before it Becomes a Crisis.
                        </h1>
                        <p className="mt-5 max-w-xl text-base text-ink/80 md:text-lg">
                            Prevntiv gives you and your doctor a continuous, connected picture of health so action happens early,
                            not after symptoms spiral.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <a href="#get-started" className="rounded-soft bg-primary px-5 py-3 text-sm font-semibold text-white shadow-panel">Get Started Free</a>
                            <a href="#professionals" className="rounded-soft border border-ink/20 bg-white px-5 py-3 text-sm font-semibold text-ink">For Healthcare Professionals</a>
                        </div>
                    </div>

                    <motion.div
                        initial={{ rotate: -2, y: 10 }}
                        animate={{ rotate: 0, y: [0, -8, 0] }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="rounded-card border border-primary/15 bg-white p-4 shadow-panel"
                    >
                        <div className="rounded-soft bg-slate-900 p-3 text-white">
                            <div className="text-xs">Live BP Trend</div>
                            <svg viewBox="0 0 280 120" className="mt-3 h-32 w-full">
                                <polyline fill="none" stroke="#5eead4" strokeWidth="4" points="0,75 35,66 70,72 105,58 140,63 175,49 210,52 245,42 280,45" />
                            </svg>
                            <div className="text-sm">Current: 128/84 mmHg</div>
                        </div>
                    </motion.div>
                </div>
            </LandingSection>

            <LandingSection className="mx-auto mt-14 grid max-w-6xl gap-6 px-6 md:px-10 lg:px-16">
                <h2 className="font-[var(--font-sora)] text-3xl">The Old Way vs Prevntiv</h2>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-card border border-rose-200 bg-rose-50 p-5">
                        <p className="text-sm text-rose-700">Symptom → Visit → Prescription → Forget → Repeat</p>
                    </div>
                    <div className="rounded-card border border-emerald-200 bg-emerald-50 p-5">
                        <p className="text-sm text-emerald-700">Track Continuously → Detect Early → Personalized Action</p>
                    </div>
                </div>
            </LandingSection>

            <LandingSection className="mx-auto mt-14 max-w-6xl px-6 md:px-10 lg:px-16">
                <h2 className="font-[var(--font-sora)] text-3xl">How It Works</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                    {[
                        "Connect and Track",
                        "AI Detects Patterns",
                        "Act Before It's Urgent"
                    ].map((step) => (
                        <div key={step} className="rounded-card border border-primary/15 bg-white p-4 shadow-panel">
                            <div className="text-xs uppercase text-primary">Step</div>
                            <div className="mt-1 font-semibold">{step}</div>
                        </div>
                    ))}
                </div>
            </LandingSection>

            <LandingSection className="mx-auto mt-14 max-w-6xl px-6 md:px-10 lg:px-16">
                <h2 className="font-[var(--font-sora)] text-3xl">Features</h2>
                <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {features.map((feature) => (
                        <div key={feature} className="rounded-card border border-fog bg-white p-4 shadow-panel">
                            <div className="text-sm font-semibold">{feature}</div>
                        </div>
                    ))}
                </div>
            </LandingSection>

            <LandingSection id="professionals" className="mx-auto mt-14 max-w-6xl px-6 md:px-10 lg:px-16">
                <div className="grid gap-6 rounded-card border border-primary/20 bg-white p-6 shadow-panel lg:grid-cols-2">
                    <div className="rounded-soft bg-slate-100 p-5">Dashboard mockup placeholder</div>
                    <div>
                        <h2 className="font-[var(--font-sora)] text-3xl">For Professionals</h2>
                        <ul className="mt-4 space-y-2 text-sm text-ink/80">
                            <li>Full patient history at a glance</li>
                            <li>Risk prioritization with alerts</li>
                            <li>Shared care plans across specialties</li>
                        </ul>
                    </div>
                </div>
            </LandingSection>

            <LandingSection className="mx-auto mt-14 max-w-6xl px-6 md:px-10 lg:px-16">
                <div className="rounded-card border border-primary/20 bg-primary p-6 text-white">
                    <h2 className="font-[var(--font-sora)] text-3xl">We don't sell your data. Ever.</h2>
                    <p className="mt-2 text-sm text-white/90">HIPAA-aligned operations, encrypted records, doctor-verified content.</p>
                </div>
            </LandingSection>

            <LandingSection id="get-started" className="mx-auto mt-14 max-w-6xl px-6 md:px-10 lg:px-16">
                <h2 className="font-[var(--font-sora)] text-3xl">Pricing</h2>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <div className="rounded-card border border-fog bg-white p-5">
                        <div className="font-semibold">Patient</div>
                        <p className="text-sm text-ink/75">Free forever (basic tracking)</p>
                        <p className="mt-1 text-sm text-ink/75">Premium Rs 199/mo (AI insights + care plans)</p>
                    </div>
                    <div className="rounded-card border border-fog bg-white p-5">
                        <div className="font-semibold">Professionals</div>
                        <p className="text-sm text-ink/75">Free trial 30 days</p>
                        <p className="mt-1 text-sm text-ink/75">Rs 499/mo per seat</p>
                    </div>
                </div>
            </LandingSection>

            <footer className="mx-auto mt-16 max-w-6xl border-t border-primary/15 px-6 pt-6 text-xs text-ink/70 md:px-10 lg:px-16">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>Made for India's healthcare system</span>
                    <div className="flex gap-3">
                        <a href="#">Twitter</a>
                        <a href="#">LinkedIn</a>
                    </div>
                </div>
            </footer>
        </main>
    );
}
