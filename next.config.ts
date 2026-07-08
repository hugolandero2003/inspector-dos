import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Limita workers de compilación para reducir RAM en dev
    cpus: 2,
  },
};

export default nextConfig;
