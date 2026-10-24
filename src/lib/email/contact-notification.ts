import "server-only";

import { Resend } from "resend";

type ContactNotification = {
  requestId: string;
  name: string;
  email: string;
  message: string;
  locale: "ar" | "en";
};

export type ContactNotificationResult = "sent" | "failed" | "disabled";

function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.CONTACT_NOTIFICATION_FROM?.trim();
  const to =
    process.env.CONTACT_NOTIFICATION_TO?.trim() ||
    process.env.SUPABASE_ADMIN_EMAIL?.trim();

  if (!apiKey || !from || !to) return null;

  return { apiKey, from, to };
}

function oneLine(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export async function sendContactNotification(
  input: ContactNotification,
): Promise<ContactNotificationResult> {
  const config = getEmailConfig();
  if (!config) return "disabled";

  const resend = new Resend(config.apiKey);
  const senderName = oneLine(input.name);
  const subject =
    input.locale === "ar"
      ? `رسالة جديدة من ${senderName}`
      : `New message from ${senderName}`;
  const text = [
    input.locale === "ar"
      ? "وصلت رسالة جديدة من نموذج التواصل."
      : "A new contact-form message has arrived.",
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Language: ${input.locale}`,
    `Request ID: ${input.requestId}`,
    "",
    "Message:",
    input.message,
  ].join("\n");

  const { error } = await resend.emails.send(
    {
      from: config.from,
      to: [config.to],
      replyTo: input.email,
      subject,
      text,
    },
    { idempotencyKey: `contact-message/${input.requestId}` },
  );

  return error ? "failed" : "sent";
}
