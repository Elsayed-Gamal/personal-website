"use server";
import { contactSubmissionSchema, type ContactResult } from "@/lib/contact";
import { sendContactNotification } from "@/lib/email/contact-notification";
import { createContentClient } from "@/lib/supabase/server";

export async function submitContact(input: unknown): Promise<ContactResult> {
  const parsed = contactSubmissionSchema.safeParse(input);
  if (!parsed.success)
    return {
      status: "invalid",
      fields: parsed.error.issues.map((issue) => String(issue.path[0])),
    };
  const { requestId, name, email, message, locale, website } = parsed.data;
  // Honeypot is supplementary; the RPC also enforces limits for direct API calls.
  if (website) return { status: "sent" };
  try {
    const { data, error } = await createContentClient().rpc("submit_contact", {
      p_request_id: requestId,
      p_name: name,
      p_email: email,
      p_message: message,
      p_locale: locale,
    });
    if (error) return { status: "error" };
    if (data === "sent") {
      try {
        const notification = await sendContactNotification({
          requestId,
          name,
          email,
          message,
          locale,
        });
        if (notification === "failed")
          console.error("Contact notification delivery failed.");
      } catch {
        // The inbox remains the source of truth when the email provider is down.
        console.error("Contact notification delivery failed.");
      }
      return { status: "sent" };
    }
    if (data === "invalid" || data === "rate_limited") return { status: data };
    return { status: "error" };
  } catch {
    return { status: "error" };
  }
}
