import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const authOptions: NextAuthOptions = {
    session: { strategy: "jwt" },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials.password) {
                    return null;
                }

                const res = await fetch(`${API_URL}/auth/login`, {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ email: credentials.email, password: credentials.password })
                });

                if (!res.ok) return null;
                const data = (await res.json()) as {
                    data?: {
                        user?: { id: string; role: string; org_id?: string | null; name?: string; email?: string };
                        access_token?: string;
                        refresh_token?: string;
                    };
                };

                const user = data.data?.user;
                if (!user) return null;

                return {
                    id: user.id,
                    name: user.name || user.email || credentials.email,
                    email: user.email || credentials.email,
                    role: user.role,
                    orgId: user.org_id || null,
                    accessToken: data.data?.access_token,
                    refreshToken: data.data?.refresh_token
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as { role?: string }).role;
                token.orgId = (user as { orgId?: string | null }).orgId;
                token.accessToken = (user as { accessToken?: string }).accessToken;
                token.refreshToken = (user as { refreshToken?: string }).refreshToken;
            }
            return token;
        },
        async session({ session, token }) {
            session.user.id = token.id || "";
            session.user.role = token.role || "patient";
            session.user.orgId = token.orgId;
            session.user.accessToken = token.accessToken;
            session.accessToken = token.accessToken;
            session.refreshToken = token.refreshToken;
            return session;
        }
    },
    pages: {
        signIn: "/login"
    }
};
