"use client";
import { useState, useTransition } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { submitContact } from "@/actions/contact";
import type { Locale, SiteContentMap } from "@/lib/content";
import type { ContactResult } from "@/lib/contact";
export function ContactForm({
  locale,
  copy,
  requestId,
}: {
  locale: Locale;
  copy: SiteContentMap["contact"]["form"];
  requestId: string;
}) {
  const [values, setValues] = useState({
    name: "",
    email: "",
    message: "",
    website: "",
  });
  const [receipt, setReceipt] = useState(requestId);
  const [result, setResult] = useState<ContactResult | null>(null);
  const [pending, startTransition] = useTransition();
  function change(field: keyof typeof values, value: string) {
    setValues((old) => ({ ...old, [field]: value }));
    setResult(null);
    setReceipt(crypto.randomUUID());
  }
  if (result?.status === "sent")
    return (
      <div className="contact-success" role="status">
        <CheckCircle2 aria-hidden="true" size={28} />
        <p>{copy.success}</p>
        <button
          type="button"
          onClick={() => {
            setValues({ name: "", email: "", message: "", website: "" });
            setReceipt(crypto.randomUUID());
            setResult(null);
          }}
        >
          {copy.another}
        </button>
      </div>
    );
  return (
    <form
      className="contact-form"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          try {
            setResult(
              await submitContact({ ...values, locale, requestId: receipt }),
            );
          } catch {
            setResult({ status: "error" });
          }
        });
      }}
    >
      <fieldset disabled={pending}>
        <div className="contact-field">
          <label htmlFor="contact-name">{copy.name}</label>
          <input
            id="contact-name"
            name="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={100}
            value={values.name}
            onChange={(e) => change("name", e.target.value)}
            aria-invalid={result?.fields?.includes("name") || false}
          />
        </div>
        <div className="contact-field">
          <label htmlFor="contact-email">{copy.email}</label>
          <input
            id="contact-email"
            name="email"
            type="email"
            dir="ltr"
            autoComplete="email"
            required
            maxLength={254}
            value={values.email}
            onChange={(e) => change("email", e.target.value)}
            aria-invalid={result?.fields?.includes("email") || false}
          />
        </div>
        <div className="contact-field">
          <label htmlFor="contact-message">{copy.message}</label>
          <textarea
            id="contact-message"
            name="message"
            required
            minLength={10}
            maxLength={5000}
            rows={6}
            value={values.message}
            onChange={(e) => change("message", e.target.value)}
            aria-describedby="contact-hint"
            aria-invalid={result?.fields?.includes("message") || false}
          />
          <small id="contact-hint">{copy.hint}</small>
        </div>
        <div className="contact-honeypot" aria-hidden="true">
          <label htmlFor="contact-website">Website</label>
          <input
            id="contact-website"
            name="website"
            autoComplete="off"
            tabIndex={-1}
            value={values.website}
            onChange={(e) => change("website", e.target.value)}
          />
        </div>
        <p className="contact-privacy">{copy.privacy}</p>
        <button type="submit" className="contact-submit" disabled={pending}>
          <Send size={18} aria-hidden="true" />
          {pending ? copy.sending : copy.submit}
        </button>
      </fieldset>
      {result && (
        <p className="contact-error" role="alert">
          {result.status === "rate_limited"
            ? copy.rateLimited
            : result.status === "invalid"
              ? copy.invalid
              : copy.error}
        </p>
      )}
    </form>
  );
}
