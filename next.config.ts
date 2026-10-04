import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["framer-motion", "@tanstack/react-query"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      /* Waitlist landing - portrait avatars (Unsplash) */
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
}

export default nextConfig
