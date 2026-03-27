export { default } from "next-auth/middleware";

export const config = {
    matcher: ["/overview/:path*", "/patients/:path*", "/appointments/:path*", "/community/:path*", "/settings/:path*", "/admin/:path*"]
};
