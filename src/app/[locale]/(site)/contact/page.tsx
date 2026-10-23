import Link from "next/link";
import { ArrowUpRight, Mail, MessageSquare, ListChecks } from "lucide-react";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/content";

export default async function ContactPage({
  params,
}: PageProps<"/[locale]/contact">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ar = locale === "ar";
  const prompts = ar
    ? [
        "ما الفكرة أو النشاط الذي تريد تقديمه؟",
        "ما الذي تريد أن يحققه الموقع لعملائك؟",
        "هل لديك موعد أو ميزانية مبدئية للمشروع؟",
      ]
    : [
        "What idea or business would you like to introduce?",
        "What should the website help your customers do?",
        "Do you have an initial timeline or budget in mind?",
      ];
  return (
    <section className="container-shell grid gap-12 py-16 sm:py-24 lg:grid-cols-[1.1fr_.9fr]">
      <div>
        <p className="eyebrow">{ar ? "لنبدأ محادثة" : "LET'S TALK"}</p>
        <h1 className="mt-6 text-4xl leading-tight font-semibold tracking-[-.035em] text-balance sm:text-5xl">
          {ar
            ? "كل مشروع جيد يبدأ بفكرة. احكِ لي فكرتك."
            : "Every good project starts with an idea. Tell me yours."}
        </h1>
        <p className="mt-7 max-w-xl text-lg leading-9 text-[#586779]">
          {ar
            ? "مش لازم تكون كل التفاصيل جاهزة. نبذة عن احتياجك كفاية لنبدأ نفهم الصورة ونحدد الخطوة التالية."
            : "You don't need to have every detail figured out. A short description is enough to start understanding your needs and find the next step."}
        </p>
        <div className="mt-10 flex items-center gap-3 font-semibold">
          <ListChecks className="size-5 text-[#245bc4]" />
          {ar ? "نقاط تساعدك في وصف المشروع" : "A few useful starting points"}
        </div>
        <ul className="mt-5 space-y-4">
          {prompts.map((prompt, i) => (
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
        <h2 className="mt-6 text-2xl font-semibold">
          {ar
            ? "تواصل مباشر، وبداية واضحة."
            : "Direct contact. A clear beginning."}
        </h2>
        <p className="mt-4 text-sm leading-8 text-[#586779]">
          {ar
            ? "سيُضاف بريد التواصل الحقيقي هنا قبل إطلاق الموقع. بيانات التواصل الحالية غير مفعّلة بعد."
            : "The real contact email will be added here before launch. Contact details are not active yet."}
        </p>
        <div className="mt-7 flex items-center gap-3 rounded-xl bg-[#eef3fc] p-5 text-sm text-[#245bc4]">
          <Mail className="size-5 shrink-0" />
          {ar ? "بريد التواصل — قريبًا" : "Contact email — coming soon"}
        </div>
        <div className="hairline mt-8 border-t pt-7">
          <p className="text-sm text-[#586779]">
            {ar
              ? "تريد استكشاف طريقة العمل أولًا؟"
              : "Want to explore the work first?"}
          </p>
          <Link href={`/${locale}/work`} className="text-link mt-4">
            {ar ? "تصفح المشاريع" : "Explore the projects"}
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
