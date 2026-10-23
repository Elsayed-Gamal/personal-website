import Link from "next/link";
import { ArrowUpRight, Code2, Compass, Gauge, Workflow } from "lucide-react";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/content";

export default async function AboutPage({
  params,
}: PageProps<"/[locale]/about">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t =
    locale === "ar"
      ? {
          eyebrow: "عني",
          title: "أجمع بين عقلية المنتج ودقة الهندسة.",
          intro:
            "مطور Full-stack أساعد أصحاب الأفكار والفرق على بناء منتجات ويب واضحة وسريعة وقابلة للنمو.",
          storyTitle: "الطريقة قبل الأدوات",
          story:
            "أبدأ بفهم المشكلة والسياق قبل كتابة الكود. أهتم بما يحتاجه المستخدم، وما يحتاجه العمل، ثم أختار أبسط بنية قادرة على خدمة الاثنين.",
          values: [
            {
              icon: Compass,
              title: "وضوح الاتجاه",
              text: "كل قرار تقني مرتبط بهدف منتج مفهوم.",
            },
            {
              icon: Gauge,
              title: "الأداء جزء من التجربة",
              text: "السرعة والاعتمادية ليستا تحسينًا مؤجلًا.",
            },
            {
              icon: Workflow,
              title: "بناء قابل للتغيير",
              text: "أنظمة واضحة يستطيع الفريق تطويرها بثقة.",
            },
            {
              icon: Code2,
              title: "جودة عملية",
              text: "اختبارات وتوثيق بقدر ما يحمي المنتج فعلًا.",
            },
          ],
          stack: "الأدوات التي أعمل بها",
          cta: "لنبنِ شيئًا مفيدًا",
        }
      : {
          eyebrow: "About",
          title: "Product thinking, backed by engineering rigor.",
          intro:
            "I’m a full-stack developer helping founders and teams build clear, fast web products ready to grow.",
          storyTitle: "Method before tools",
          story:
            "I start by understanding the problem and its context before writing code. I look at what the user needs, what the business needs, then choose the simplest architecture that can serve both.",
          values: [
            {
              icon: Compass,
              title: "Direction first",
              text: "Every technical decision connects to a clear product goal.",
            },
            {
              icon: Gauge,
              title: "Performance is UX",
              text: "Speed and reliability are not postponed enhancements.",
            },
            {
              icon: Workflow,
              title: "Built for change",
              text: "Clear systems that teams can evolve with confidence.",
            },
            {
              icon: Code2,
              title: "Practical quality",
              text: "Testing and documentation where they truly protect the product.",
            },
          ],
          stack: "Tools I work with",
          cta: "Let’s build something useful",
        };
  return (
    <>
      <section className="container-shell grid gap-12 py-20 sm:py-28 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 className="mt-6 text-4xl leading-tight font-semibold tracking-[-.035em] text-balance sm:text-5xl">
            {t.title}
          </h1>
          <p className="mt-7 max-w-2xl text-xl leading-9 text-[#586779]">
            {t.intro}
          </p>
        </div>
        <div
          className="project-visual hairline min-h-96 rounded-3xl border bg-[#e7eef9]"
          data-color="cyan"
        >
          <div className="absolute inset-[14%] rounded-full border border-[#245bc4]/20" />
          <div className="absolute inset-[28%] grid place-items-center rounded-full border border-dashed border-[#bfcfe5]">
            <span className="text-5xl font-black tracking-[-.08em]">EG</span>
          </div>
        </div>
      </section>
      <section className="hairline border-y bg-[#f0f4fa] py-24">
        <div className="container-shell grid gap-12 md:grid-cols-2">
          <div>
            <p className="eyebrow">{t.storyTitle}</p>
            <p className="mt-6 text-lg leading-9 text-[#586779]">{t.story}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {t.values.map(({ icon: Icon, title, text }) => (
              <div key={title} className="hairline rounded-2xl border p-6">
                <Icon className="size-5 text-[#245bc4]" />
                <h3 className="mt-8 text-lg font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#586779]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="container-shell py-24">
        <p className="eyebrow">{t.stack}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {[
            "TypeScript",
            "React",
            "Next.js",
            "Node.js",
            "PostgreSQL",
            "Supabase",
            "REST APIs",
            "Design Systems",
          ].map((item) => (
            <span
              key={item}
              className="hairline rounded-full border bg-[#f0f4fa] px-5 py-3 text-sm text-[#586779]"
            >
              {item}
            </span>
          ))}
        </div>
        <Link
          href={`/${locale}/contact`}
          className="mt-20 inline-flex items-center gap-3 text-3xl font-semibold tracking-[-.04em] hover:text-[#245bc4]"
        >
          {t.cta}
          <ArrowUpRight className="size-7" />
        </Link>
      </section>
    </>
  );
}
