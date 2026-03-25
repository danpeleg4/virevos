import type { NextConfig } from "next";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env"), quiet: true });

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, "../"),
  },
  experimental: {
    // Allow importing modules from directories outside of the Next.js app (monorepo workspaces)
    externalDir: true,
    // Allow 5MB file uploads
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  // Ensure workspace packages are transpiled by Next.js (helps with TS/ESM in packages)
  transpilePackages: ["@repo/db"],
  // Keep pg and drizzle's node-postgres adapter server-side only (they use Node.js built-ins like dns)
  serverExternalPackages: ["pg", "drizzle-orm"],
};

export default nextConfig;
