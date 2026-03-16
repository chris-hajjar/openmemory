"use client";

import { useSearchParams } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  not_allowed: "Your Google account is not authorized to access this server.",
  google_auth_failed: "Google authentication failed. Please try again.",
  invalid_state: "Invalid OAuth state. Please try again.",
  state_expired: "Authorization request expired. Please try again.",
  invalid_callback: "Invalid callback. Please try again.",
  access_denied: "Access was denied.",
};

export default function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const email = searchParams.get("email");

  const errorMessage = error
    ? ERROR_MESSAGES[error] ?? `Authentication error: ${error}`
    : null;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f0f0f",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: "12px",
          padding: "48px",
          maxWidth: "400px",
          width: "100%",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            color: "#fff",
            fontSize: "24px",
            fontWeight: 600,
            marginBottom: "8px",
          }}
        >
          OpenMemory
        </h1>
        <p style={{ color: "#888", marginBottom: "32px", fontSize: "14px" }}>
          Personal memory server for MCP clients
        </p>

        {errorMessage ? (
          <div
            style={{
              background: "#2a0a0a",
              border: "1px solid #5a1a1a",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "24px",
              color: "#ff6b6b",
              fontSize: "14px",
            }}
          >
            {errorMessage}
            {email && (
              <div style={{ marginTop: "8px", color: "#888" }}>
                Account: {email}
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: "#666", marginBottom: "24px", fontSize: "14px" }}>
            Sign in to authorize your MCP client to access your memory server.
          </p>
        )}

        <p style={{ color: "#555", fontSize: "12px", marginTop: "24px" }}>
          Authentication is handled automatically by your MCP client.
          <br />
          This page should open in your browser during setup.
        </p>
      </div>
    </main>
  );
}
