"use client";

import { motion } from "framer-motion";

export function LandingSection({
    id,
    className = "",
    children,
    delay = 0
}: {
    id?: string;
    className?: string;
    children: React.ReactNode;
    delay?: number;
}) {
    return (
        <motion.section
            id={id}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay }}
            className={className}
        >
            {children}
        </motion.section>
    );
}
