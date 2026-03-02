import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  // Disable PWA in development AND on Vercel CI (to avoid RSC segment build errors)
  disable: process.env.NODE_ENV === "development" || process.env.VERCEL === "1",
});

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default withPWA(nextConfig);
