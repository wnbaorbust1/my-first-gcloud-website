/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Default is 1mb — too small for portfolio file uploads (images,
      // PDFs). Server Actions carry the file straight through to Supabase
      // Storage (see lib/portfolio/storage.ts), no separate upload route.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
