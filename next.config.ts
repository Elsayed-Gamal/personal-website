import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdoaudugbjrkhyhivaaa.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/content-images/**",
        search: "",
      },
    ],
  },
  allowedDevOrigins: ["192.168.1.44"],
};

export default nextConfig;
