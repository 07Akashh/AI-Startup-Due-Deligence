import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@startupai/shared'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  },
};

export default nextConfig;
