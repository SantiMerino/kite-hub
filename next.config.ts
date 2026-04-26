import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the Node Prisma engine; otherwise Turbopack can resolve the wasm/edge
  // client and require prisma:// (Accelerate) for every query (P6001).
  serverExternalPackages: ["@prisma/client", "prisma"],
  allowedDevOrigins: [
    "192.168.1.33",
    "192.168.1.33:3000",
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
    // ngrok tunnels — update subdomain if ngrok generates a new one
    "unscotched-kenley-nonvituperatively.ngrok-free.dev",
    "*.ngrok-free.app",
    "*.ngrok-free.dev",
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "192.168.1.33:3000",
        "unscotched-kenley-nonvituperatively.ngrok-free.dev",
      ],
    },
  },
};

export default nextConfig;
