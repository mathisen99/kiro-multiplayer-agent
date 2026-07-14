import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow private-LAN demo devices without committing one developer's local IP.
  allowedDevOrigins: ["192.168.*.*"],
};

export default nextConfig;
