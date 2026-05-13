import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // OpenNext on Workers: default Next image optimization needs a paid Cloudflare
  // Images binding or a custom loader. Without it, routes can 500. Unoptimized
  // uses normal <img> URLs (Firebase avatars + /public still work).
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },
    ],
  },
};

if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

export default nextConfig;
