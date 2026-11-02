import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep document parsers as native Node modules instead of bundling them.
  serverExternalPackages: ["unpdf", "mammoth"],
};

export default nextConfig;
