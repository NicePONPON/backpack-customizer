import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
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
