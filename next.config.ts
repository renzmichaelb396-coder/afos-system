import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Standalone output: Next.js bundles only the files needed to run the
   * application, making it suitable for minimal Docker images.
   * The .next/standalone directory contains a self-contained Node.js server.
   */
  output: "standalone",
};

export default nextConfig;
