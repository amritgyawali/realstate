/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'cdn.polyhaven.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2678400,
  },
  webpack: (config) => {
    // Some Windows volumes return EISDIR (rather than EINVAL) from readlink on a
    // plain file, which enhanced-resolve treats as fatal while probing route
    // entry points. Nothing here is symlinked, so skip the probe entirely.
    config.resolve.symlinks = false;
    return config;
  },
};

export default nextConfig;
