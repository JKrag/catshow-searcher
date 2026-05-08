import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native Node.js addon and must not be bundled by webpack
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
