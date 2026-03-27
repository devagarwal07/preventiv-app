/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        remotePatterns: [
            {
                protocol: "http",
                hostname: process.env.MINIO_PUBLIC_HOST || "localhost",
                port: process.env.MINIO_PUBLIC_PORT || "9000",
                pathname: "/**"
            }
        ]
    },
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
        NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001"
    }
};

export default nextConfig;
