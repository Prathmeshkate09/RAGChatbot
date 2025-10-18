/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable webpack cache in dev to avoid stale runtime chunks
      config.cache = false;
    }
    return config;
  },
};

module.exports = nextConfig;
