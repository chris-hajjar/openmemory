import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mcp-handler", "@modelcontextprotocol/sdk"],
};

export default nextConfig;
