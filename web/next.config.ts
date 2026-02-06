import type { NextConfig } from "next";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const nextConfig: NextConfig = {
  experimental: {
    // Allow importing modules from directories outside of the Next.js app (monorepo workspaces)
    externalDir: true,
  },
  // Ensure workspace packages are transpiled by Next.js (helps with TS/ESM in packages)
  transpilePackages: ["@repo/db"],
};

export default nextConfig;
