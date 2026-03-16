import { supabase } from "./supabase";
import crypto from "crypto";

const ACCESS_TOKEN_TTL_HOURS = 24;
const REFRESH_TOKEN_TTL_DAYS = 30;

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function issueTokens(email: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const accessToken = generateToken();
  const refreshToken = generateToken();
  const tokenExpiresAt = new Date(
    Date.now() + ACCESS_TOKEN_TTL_HOURS * 60 * 60 * 1000
  );

  const { error } = await supabase.from("oauth_sessions").insert({
    google_email: email,
    access_token: accessToken,
    refresh_token: refreshToken,
    token_expires_at: tokenExpiresAt.toISOString(),
  });

  if (error) throw new Error(`Failed to store tokens: ${error.message}`);

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_HOURS * 60 * 60,
  };
}

export async function issueAuthCode(
  email: string,
  accessToken: string,
  refreshToken: string,
  codeChallenge: string
): Promise<string> {
  const code = generateToken();
  const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const { error } = await supabase
    .from("oauth_sessions")
    .update({
      code,
      code_expires_at: codeExpiresAt.toISOString(),
      code_challenge: codeChallenge,
    })
    .eq("access_token", accessToken);

  if (error) throw new Error(`Failed to store auth code: ${error.message}`);

  return code;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  email: string;
  codeChallenge: string;
} | null> {
  const { data, error } = await supabase
    .from("oauth_sessions")
    .select("*")
    .eq("code", code)
    .single();

  if (error || !data) return null;

  // Code must not be expired
  if (new Date(data.code_expires_at) < new Date()) {
    await supabase.from("oauth_sessions").delete().eq("code", code);
    return null;
  }

  // Clear the code (single-use)
  await supabase
    .from("oauth_sessions")
    .update({ code: null, code_expires_at: null })
    .eq("id", data.id);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: Math.floor(
      (new Date(data.token_expires_at).getTime() - Date.now()) / 1000
    ),
    email: data.google_email,
    codeChallenge: data.code_challenge,
  };
}

export async function validateAccessToken(
  token: string
): Promise<{ email: string } | null> {
  const { data, error } = await supabase
    .from("oauth_sessions")
    .select("google_email, token_expires_at")
    .eq("access_token", token)
    .single();

  if (error || !data) return null;
  if (new Date(data.token_expires_at) < new Date()) return null;

  return { email: data.google_email };
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} | null> {
  const { data, error } = await supabase
    .from("oauth_sessions")
    .select("*")
    .eq("refresh_token", refreshToken)
    .single();

  if (error || !data) return null;

  const refreshExpiry = new Date(
    data.created_at).getTime() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
  if (Date.now() > refreshExpiry) {
    await supabase.from("oauth_sessions").delete().eq("id", data.id);
    return null;
  }

  const newAccessToken = generateToken();
  const newRefreshToken = generateToken();
  const tokenExpiresAt = new Date(
    Date.now() + ACCESS_TOKEN_TTL_HOURS * 60 * 60 * 1000
  );

  const { error: updateError } = await supabase
    .from("oauth_sessions")
    .update({
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      token_expires_at: tokenExpiresAt.toISOString(),
    })
    .eq("id", data.id);

  if (updateError) return null;

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: ACCESS_TOKEN_TTL_HOURS * 60 * 60,
  };
}
