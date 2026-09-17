/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination:
          'https://laporan-keuangan-tawny.vercel.app/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;