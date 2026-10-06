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

const nextConfig: NextConfig = {
  async headers() {
    return ["/videos", "/collection", "/cabine", "/models"].map((dir) => ({
      source: `${dir}/:path*`,
      headers: mediaCache,
    }));
  },
};

export default nextConfig;
