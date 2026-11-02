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
      ...["/videos", "/collection", "/models", "/products"].map((dir) => ({
        source: `${dir}/:path*`,
        headers: mediaCache,
      })),
      { source: "/logo-white.png", headers: mediaCache },
      // Intro stills and fitting-room media are always requested with a ?v=
      // number (FRAME stills in ScrollVideoHero, CABINE_VERSION / CABINE_VIDEO_
      // VERSION / CARRY_VERSION in the cabine components), and that number is
      // bumped whenever a file changes. So the URL is the cache key: a repeat
      // visit reuses what the phone already downloaded and never revalidates
      // hundreds of files. Changing a file here WITHOUT bumping its version
      // would leave returning visitors on the old one.
      ...["/frames", "/cabine"].map((dir) => ({
        source: `${dir}/:path*`,
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      })),
    ];
  },
};

export default nextConfig;
