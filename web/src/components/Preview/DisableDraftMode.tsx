"use client";

import { useIsPresentationTool } from "next-sanity/hooks";

export function DisableDraftMode() {
  const isPresentationTool = useIsPresentationTool();

  if (isPresentationTool) {
    return null;
  }

  return (
    <a
      href="/api/draft-mode/disable"
      style={{
        position: "fixed",
        right: "1rem",
        bottom: "1rem",
        zIndex: 2147483647,
        borderRadius: "999px",
        padding: "0.625rem 1rem",
        background: "#111",
        color: "#fff",
        fontSize: "0.875rem",
        textDecoration: "none",
        boxShadow: "0 4px 16px rgb(0 0 0 / 20%)",
      }}
    >
      Exit preview
    </a>
  );
}
