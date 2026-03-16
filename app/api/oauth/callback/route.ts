import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { exchangeGoogleCode, isEmailAllowed } from "@/lib/google-auth";
import { issueTokens, issueAuthCode } from "@/lib/mcp-tokens";

const baseUrl = process.env.NEXTAUTH_URL ?? "https://openmemory.vercel.app";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/login?error=invalid_callback`);
  }

  // Look up PKCE state
  const { data: pkceData, error: pkceError } = await supabase
    .from("oauth_pkce_state")
    .select("*")
    .eq("state", state)
    .single();

  if (pkceError || !pkceData) {
    return NextResponse.redirect(`${baseUrl}/login?error=invalid_state`);
  }

  // Check expiry
  if (new Date(pkceData.expires_at) < new Date()) {
    await supabase.from("oauth_pkce_state").delete().eq("state", state);
    return NextResponse.redirect(`${baseUrl}/login?error=state_expired`);
  }

  // Delete used state
  await supabase.from("oauth_pkce_state").delete().eq("state", state);

  // Exchange Google code for user info
  let email: string;
  try {
    const googleRedirectUri = `${baseUrl}/api/oauth/callback`;
    const userInfo = await exchangeGoogleCode(code, googleRedirectUri);
    email = userInfo.email;
  } catch (err) {
    console.error("Google exchange failed:", err);
    return NextResponse.redirect(`${baseUrl}/login?error=google_auth_failed`);
  }

  // Email allowlist check
  if (!isEmailAllowed(email)) {
    return NextResponse.redirect(
      `${baseUrl}/login?error=not_allowed&email=${encodeURIComponent(email)}`
    );
  }

  // Issue tokens and auth code
  const { accessToken, refreshToken } = await issueTokens(email);
  const authCode = await issueAuthCode(email, accessToken, refreshToken);

  // Redirect back to MCP client with auth code
  const redirectUrl = new URL(pkceData.redirect_uri);
  redirectUrl.searchParams.set("code", authCode);
  redirectUrl.searchParams.set("state", state);

  return NextResponse.redirect(redirectUrl.toString());
}
