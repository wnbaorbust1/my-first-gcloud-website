"use client";

import { useEffect } from "react";

/**
 * ERROR MONITORING: the outermost fallback, used only when an error
 * escapes the root layout itself (rare — most errors are caught by
 * src/app/error.tsx instead). Per Next.js convention this file must
 * render its own <html>/<body> since it replaces the root layout
 * entirely, so it can't reach any shared styling/providers — kept
 * intentionally minimal.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    fetch("/api/observability/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        url: typeof window !== "undefined" ? window.location.href : undefined,
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#FBF9F4",
          color: "#14213D",
        }}
      >
        <p style={{ fontSize: "1.5rem", fontWeight: 600 }}>Blueprint hit a snag</p>
        <p style={{ maxWidth: "28rem", fontSize: "0.9rem", color: "#5C6470" }}>
          This has been logged automatically. Please try reloading the page.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            borderRadius: "9999px",
            background: "#14213D",
            color: "#FBF9F4",
            padding: "0.6rem 1.5rem",
            fontSize: "0.9rem",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
