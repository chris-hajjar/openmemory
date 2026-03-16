import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, refreshAccessToken } from "@/lib/mcp-tokens";
import crypto from "crypto";

function verifyCodeChallenge(verifier: string, challenge: string): boolean {
  const hash = crypto.createHash("sha256").update(verifier).digest("base64url");
  return hash === challenge;
}

export async function POST(request: NextRequest) {
  let body: Record<string, string>;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    body = Object.fromEntries(new URLSearchParams(text));
  } else {
    body = await request.json();
  }

  const grantType = body.grant_type;

  if (grantType === "authorization_code") {
    const { code, code_verifier } = body;

    if (!code || !code_verifier) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "code and code_verifier required" },
        { status: 400 }
      );
    }

    const tokens = await exchangeCodeForTokens(code);
    if (!tokens) {
      return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
    }

    // Verify PKCE code_verifier against stored code_challenge
    if (!verifyCodeChallenge(code_verifier, tokens.codeChallenge)) {
      return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
    }

    return NextResponse.json({
      access_token: tokens.accessToken,
      token_type: "bearer",
      expires_in: tokens.expiresIn,
      refresh_token: tokens.refreshToken,
      scope: "mcp",
    });
  }

  if (grantType === "refresh_token") {
    const { refresh_token } = body;

    if (!refresh_token) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "refresh_token required" },
        { status: 400 }
      );
    }

    const tokens = await refreshAccessToken(refresh_token);
    if (!tokens) {
      return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
    }

    return NextResponse.json({
      access_token: tokens.accessToken,
      token_type: "bearer",
      expires_in: tokens.expiresIn,
      refresh_token: tokens.refreshToken,
      scope: "mcp",
    });
  }

  return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
}
