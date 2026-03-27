"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    return (
        <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-5">
            <form
                className="panel w-full space-y-4 p-6"
                onSubmit={async (e) => {
                    e.preventDefault();
                    setError(null);
                    const result = await signIn("credentials", {
                        redirect: false,
                        email,
                        password
                    });

                    if (result?.error) {
                        setError("Invalid credentials");
                        return;
                    }

                    router.push("/overview");
                }}
            >
                <h1 className="font-heading text-2xl">Welcome Back</h1>
                <input className="w-full rounded-soft border p-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
                <input className="w-full rounded-soft border p-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
                {error ? <p className="text-sm text-red-700">{error}</p> : null}
                <button className="w-full rounded-soft bg-primary px-4 py-2 text-white" type="submit">Sign In</button>
            </form>
        </main>
    );
}
