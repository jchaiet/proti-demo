"use client";

import { useEffect, useRef, useState } from "react";
import { FormBlock, type FormBlockProps } from "mino-ui/blocks/FormBlock";
import type { CmsIcon } from "@/cms/types";
import { resolveIcon } from "@/cms/resolvers/icon";

export interface FormRendererProps extends Omit<FormBlockProps, "onSubmit"> {
  formKey: string;
  blockKey: string;
  siteId: string;
  locale: string;
  submitButtonIconName?: CmsIcon;
}

// Not a CMS-authored field: it is a simple spam trap and is never forwarded.
const HONEYPOT_FIELD = "__proti_company_website";

type FormStatus = { kind: "success" | "error"; message: string } | null;

export function Form({
  formKey,
  blockKey,
  siteId,
  locale,
  submitButtonIconName,
  submitButtonProps,
  ...props
}: FormRendererProps) {
  const [status, setStatus] = useState<FormStatus>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Mino's FormBlock owns the <form> markup and has no extra-field slot.
    // Attach a visually-hidden *text* input after hydration without changing
    // the library or CMS schema. The field is excluded from accessible focus.
    const form = formContainerRef.current?.querySelector("form");
    if (!form) return;

    const trap = document.createElement("div");
    trap.setAttribute("aria-hidden", "true");
    trap.style.cssText =
      "position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";

    const label = document.createElement("label");
    label.textContent = "Company website";
    const input = document.createElement("input");
    input.type = "text";
    input.name = HONEYPOT_FIELD;
    input.autocomplete = "off";
    input.tabIndex = -1;
    input.setAttribute("data-proti-honeypot", "");
    label.appendChild(input);
    trap.appendChild(label);
    form.appendChild(trap);

    return () => trap.remove();
  }, []);
  const icon = resolveIcon(submitButtonIconName);
  const normalizedLocale = locale.toLowerCase();
  const isSpanish =
    normalizedLocale.startsWith("es") || normalizedLocale.endsWith("-es");

  const handleSubmit: NonNullable<FormBlockProps["onSubmit"]> = async (
    _values,
    event,
  ) => {
    // Mino's flattened values omit repeated FormData keys (multi-select).
    void _values;
    setStatus(null);

    // Collect synchronously while React still exposes event.currentTarget.
    // FormData preserves multi-select values that FormBlock's flat object loses.
    const data = new FormData(event.currentTarget);
    const honeypotValue = data.get(HONEYPOT_FIELD);
    const honeypot = typeof honeypotValue === "string" ? honeypotValue : "";
    const fields: Record<string, string | string[]> = Object.create(null);
    for (const [name, entry] of data.entries()) {
      if (name === HONEYPOT_FIELD) continue;
      if (entry instanceof File) {
        if (entry.size === 0) continue;
        setStatus({
          kind: "error",
          message: isSpanish
            ? "Este formulario aún no admite archivos adjuntos."
            : "This form does not support file attachments yet.",
        });
        return;
      }
      const current = fields[name];
      if (current === undefined) fields[name] = entry;
      else if (Array.isArray(current)) current.push(entry);
      else fields[name] = [current, entry];
    }

    try {
      const response = await fetch("/api/forms/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formKey,
          blockKey,
          siteId,
          locale,
          fields,
          honeypot,
        }),
      });
      if (!response.ok) {
        throw new Error(`Submission rejected (${response.status})`);
      }
      setStatus({
        kind: "success",
        message: isSpanish
          ? "Tu formulario se envió correctamente."
          : "Your form was submitted successfully.",
      });
    } catch {
      // Don't display server implementation details or record visitor values.
      setStatus({
        kind: "error",
        message: isSpanish
          ? "No pudimos enviar el formulario. Inténtalo de nuevo."
          : "We couldn't submit your form. Please try again.",
      });
    }
  };

  return (
    <div ref={formContainerRef}>
      <FormBlock
        {...props}
        submitButtonProps={{
          ...submitButtonProps,
          ...(icon ? { icon } : {}),
        }}
        onSubmit={handleSubmit}
      />
      {status?.kind === "error" && (
        <p
          role="alert"
          style={{
            marginBlock: "0.75rem",
            color: "var(--mino-color-text-danger, #b42318)",
          }}
        >
          {status.message}
        </p>
      )}
      {status?.kind === "success" && (
        <p role="status" style={{ marginBlock: "0.75rem" }}>
          {status.message}
        </p>
      )}
    </div>
  );
}
