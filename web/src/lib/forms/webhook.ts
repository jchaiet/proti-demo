import "server-only";

import { createHmac } from "node:crypto";
import type { SubmittedValues } from "./validation";

export interface FormSubmission {
  formKey: string;
  blockKey: string;
  siteId: string;
  locale: string;
  fields: SubmittedValues;
  submittedAt: string;
}

export async function forwardFormSubmission(
  submission: FormSubmission,
): Promise<"ok" | "unavailable"> {
  const destination = process.env.FORM_WEBHOOK_URL?.trim();
  const secret = process.env.FORM_WEBHOOK_SECRET?.trim();
  if (!destination || !secret) return "unavailable";

  let url: URL;
  try {
    url = new URL(destination);
  } catch {
    return "unavailable";
  }
  const isLocalDevelopment =
    process.env.NODE_ENV !== "production" &&
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !isLocalDevelopment) return "unavailable";
  if (url.username || url.password) return "unavailable";

  const payload = JSON.stringify(submission);
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Proti-Signature": `sha256=${signature}`,
      },
      body: payload,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    return response.ok ? "ok" : "unavailable";
  } catch {
    return "unavailable";
  }
}
