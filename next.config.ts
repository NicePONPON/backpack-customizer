import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Old shared invoice / customizer links lived at /?d=... before the marketing
  // landing took over the root route. Forward those to /customize?d=... so
  // existing links keep working. Plain visits to / are unaffected (no `d` query).
  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "query", key: "d" }],
        destination: "/customize",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
