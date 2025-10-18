import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // during development, don't block on ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // during development, don't block on TS errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
