import { protectedResourceHandler } from "mcp-handler";

const baseUrl = process.env.NEXTAUTH_URL ?? "https://openmemory.vercel.app";

const handler = protectedResourceHandler({
  authServerUrls: [baseUrl],
  resourceUrl: baseUrl,
});

export { handler as GET };
