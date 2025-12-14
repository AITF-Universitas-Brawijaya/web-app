import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',

  // Use Next.js rewrites to proxy API requests to the Python backend
  async rewrites() {
    // Use backend container name for server-side requests (Docker network)
    // Empty NEXT_PUBLIC_API_URL means browser will use relative path /api/*
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000';

    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
