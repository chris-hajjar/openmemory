import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getGoogleAuthUrl } from "@/lib/google-auth";
import crypto from "crypto";

const baseUrl = process.env.NEXTAUTH_URL ?? "https://openmemory.vercel.app";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const responseType = searchParams.get("response_type");
  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const codeChallenge = searchParams.get("code_challenge");
  const codeChallengeMethod = searchParams.get("code_challenge_method");
  const state = searchParams.get("state") ?? crypto.randomBytes(16).toString("hex");

  if (responseType !== "code") {
    return NextResponse.json({ error: "unsupported_response_type" }, { status: 400 });
  }

  if (!redirectUri) {
    return NextResponse.json({ error: "invalid_request", error_description: "redirect_uri required" }, { status: 400 });
  }

  if (!codeChallenge || codeChallengeMethod !== "S256") {
    return NextResponse.json(
      { error: "invalid_request", error_description: "PKCE S256 required" },
      { status: 400 }
    );
  }

  // Store PKCE state in Supabase
  const { error } = await supabase.from("oauth_pkce_state").insert({
    state,
    code_challenge: codeChallenge,
    redirect_uri: redirectUri,
    client_id: clientId ?? "mcp-client",
  });

  if (error) {
    console.error("Failed to store PKCE state:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const googleRedirectUri = `${baseUrl}/api/oauth/callback`;
  const googleUrl = getGoogleAuthUrl(state, googleRedirectUri);

  return NextResponse.redirect(googleUrl);
}
