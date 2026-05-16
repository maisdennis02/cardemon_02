import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  // Block iframe embedding from anywhere. If we ever want restaurants to embed
  // their /m/<slug> page on their own site, relax this per-route.
  { key: "X-Frame-Options", value: "DENY" },
  // No MIME sniffing — defends against polyglot/upload attacks.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak full path on cross-site nav; keep origin for analytics.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable browser APIs we don't use. `payment=(self)` keeps Stripe's
  // Payment Request API working on our origin.
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(self), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
