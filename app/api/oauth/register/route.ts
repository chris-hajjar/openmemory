import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const redirectUris = body.redirect_uris;
  if (
    !Array.isArray(redirectUris) ||
    redirectUris.length === 0 ||
    redirectUris.some((u) => typeof u !== "string")
  ) {
    return NextResponse.json(
      { error: "invalid_redirect_uri", error_description: "redirect_uris must be a non-empty array of strings" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("oauth_clients")
    .insert({
      client_name: typeof body.client_name === "string" ? body.client_name : null,
      redirect_uris: redirectUris as string[],
      grant_types: Array.isArray(body.grant_types) ? body.grant_types : ["authorization_code", "refresh_token"],
      response_types: Array.isArray(body.response_types) ? body.response_types : ["code"],
      token_endpoint_auth_method:
        typeof body.token_endpoint_auth_method === "string" ? body.token_endpoint_auth_method : "none",
      scope: typeof body.scope === "string" ? body.scope : "mcp",
    })
    .select()
    .single();

  if (error) {
    console.error("DCR insert error:", error);
    return NextResponse.json(
      { error: "server_error", error_description: "Failed to register client" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      client_id: data.client_id,
      client_id_issued_at: Math.floor(new Date(data.created_at).getTime() / 1000),
      client_name: data.client_name,
      redirect_uris: data.redirect_uris,
      grant_types: data.grant_types,
      response_types: data.response_types,
      token_endpoint_auth_method: data.token_endpoint_auth_method,
      scope: data.scope,
    },
    { status: 201 }
  );
}
