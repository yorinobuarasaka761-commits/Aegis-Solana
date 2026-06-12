import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence turbopack warning
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        stream: false,
        fs: false,
      };
    }
    return config;
  },
};

export default nextConfig;
