import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use Next.js rewrites to proxy API requests to the Python backend
  async rewrites() {
    // For native deployment, use localhost
    // For Docker, use backend container name
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
