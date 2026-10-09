import type { NextConfig } from "next";

// Static media isn't content-hashed, so it can't be `immutable` — but without
// any max-age every visit revalidates multi-megabyte clips over a mobile
// connection before the scrub can start. A day fresh, a week stale-while-
// revalidate: repeat visits start from cache, a replaced file lands next day.
const mediaCache = [
  {
    key: "Cache-Control",
    value: "public, max-age=86400, stale-while-revalidate=604800",
  },
];

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      ...["/videos", "/collection", "/models"].map((dir) => ({
        source: `${dir}/:path*`,
        headers: mediaCache,
      })),
      // Fitting-room shots get re-shot often and keep the same file names, so
      // they revalidate on every visit (a cheap 304 when unchanged) instead of
      // serving a stale frame for a day.
      {
        source: "/cabine/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
