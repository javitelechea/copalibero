import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const staticExport = process.env.COPALIBERO_STATIC === "1";
/** Sitio proyecto en https://usuario.github.io/NOMBRE-REPO/ — sin esto, /_next rompe en esa URL. */
const ghRepo =
  process.env.COPALIBERO_GITHUB_PAGES === "1"
    ? (process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "").trim()
    : "";
const githubPagesBase = staticExport && ghRepo ? `/${ghRepo}` : undefined;

const nextConfig: NextConfig = {
  ...(staticExport ? { output: "export" as const } : {}),
  ...(githubPagesBase ? { basePath: githubPagesBase } : {}),
  env: {
    ...(githubPagesBase ? { NEXT_PUBLIC_STATIC_BASE: githubPagesBase } : {}),
  },
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

if (process.env.NODE_ENV === "development" && !staticExport) {
  initOpenNextCloudflareForDev();
}

export default nextConfig;
