import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3050").replace(/\/$/, "");
    return [
      {
        source: "/get/:path*",
        destination: `${backendUrl}/get/:path*`,
      },
      {
        source: "/api/backend/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
