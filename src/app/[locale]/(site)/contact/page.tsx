import { ArrowUpRight, MessageSquare, ListChecks } from "lucide-react";
import { randomUUID } from "node:crypto";
import { ContactForm } from "@/components/forms/contact-form";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/content";
import { getSiteContent } from "@/lib/db/content";
import { getPageMetadata } from "@/lib/db/seo";
import { SiteLink as Link } from "@/components/layout/site-link";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/contact">) {
  return getPageMetadata((await params).locale, "contact");
}

export default async function ContactPage({
  params,
}: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getSiteContent("contact", locale);
  return (
    <section className="container-shell grid gap-12 py-16 sm:py-24 lg:grid-cols-[1.1fr_.9fr]">
      <div>
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 className="mt-6 text-4xl leading-tight font-semibold tracking-[-.035em] text-balance sm:text-5xl">
          {t.title}
        </h1>
        <p className="mt-7 max-w-xl text-lg leading-9 text-[#586779]">
          {t.intro}
        </p>
        <div className="mt-10 flex items-center gap-3 font-semibold">
          <ListChecks className="size-5 text-[#245bc4]" />
          {t.promptsTitle}
        </div>
        <ul className="mt-5 space-y-4">
          {t.prompts.map((prompt, i) => (
            <li
              className="flex items-start gap-3 text-sm leading-7 text-[#586779]"
              key={prompt}
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#e7eefc] text-xs text-[#245bc4]">
                {i + 1}
              </span>
              {prompt}
            </li>
          ))}
        </ul>
      </div>
      <div className="hairline self-start rounded-2xl border bg-white p-7 sm:p-9">
        <span className="service-icon">
          <MessageSquare className="size-6" />
        </span>
        <h2 className="mt-6 text-2xl font-semibold">{t.cardTitle}</h2>
        <p className="mt-4 text-sm leading-8 text-[#586779]">{t.cardText}</p>
        <ContactForm locale={locale} copy={t.form} requestId={randomUUID()} />
        <div className="hairline mt-8 border-t pt-7">
          <p className="text-sm text-[#586779]">{t.workPrompt}</p>
          <Link href={`/${locale}/work`} className="text-link mt-4">
            {t.workLink}
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
