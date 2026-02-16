import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for production deployments
  output: 'standalone',

  // Optimize server-side packages
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],

  // Disable static page generation for routes that need database
  experimental: {
    // Ensure Prisma works correctly in serverless
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
