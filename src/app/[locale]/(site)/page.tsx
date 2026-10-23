import Link from "next/link";
import { ArrowUpRight, Globe2, Layers, ShoppingBag } from "lucide-react";
import { notFound } from "next/navigation";
import { Hero } from "@/components/home/hero";
import { ProjectCard } from "@/components/portfolio/project-card";
import { ArticleCard } from "@/components/blog/article-card";
import { articles, isLocale, projects } from "@/lib/content";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const ar = locale === "ar";
  const services = ar
    ? [
        {
          icon: Globe2,
          title: "موقع يعكس هويتك",
          text: "موقع تعريفي أو صفحة هبوط تقدم نشاطك بوضوح وتساعد العميل على اتخاذ الخطوة التالية.",
          tag: "للشركات والأعمال المستقلة",
        },
        {
          icon: Layers,
          title: "تطبيق يخدم فكرتك",
          text: "تطبيق ويب مخصص ينظّم العمل ويمنح مستخدميك تجربة عملية وسهلة.",
          tag: "للمنتجات والمنصات الرقمية",
        },
        {
          icon: ShoppingBag,
          title: "تجربة شراء أفضل",
          text: "متجر إلكتروني يهتم بعرض المنتجات وسهولة التصفح والوصول إلى الشراء.",
          tag: "للعلامات التجارية والمتاجر",
        },
      ]
    : [
        {
          icon: Globe2,
          title: "A website with your identity",
          text: "A business website or landing page that tells your story clearly and helps visitors take the next step.",
          tag: "For businesses & independents",
        },
        {
          icon: Layers,
          title: "An app built for your idea",
          text: "A custom web application that simplifies work and gives your users an effortless experience.",
          tag: "For digital products & platforms",
        },
        {
          icon: ShoppingBag,
          title: "A better shopping experience",
          text: "An online store designed around product discovery, easy browsing, and a clear path to purchase.",
          tag: "For brands & online stores",
        },
      ];
  const steps = ar
    ? [
        ["نتحدث ونفهم", "نحدد احتياجاتك والجمهور الذي تريد الوصول إليه."],
        ["نصمم ونخطط", "نحوّل الفكرة إلى تصور واضح ونطاق عمل متفق عليه."],
        ["نبني ونراجع", "تتابع تقدم العمل وتجرب التفاصيل خطوة بخطوة."],
        ["نختبر ونطلق", "نتأكد من جاهزية الموقع قبل أن يصل إلى عملائك."],
      ]
    : [
        [
          "Talk & understand",
          "We define your needs and the people you want to reach.",
        ],
        [
          "Plan & design",
          "Your idea becomes a clear direction and agreed scope.",
        ],
        [
          "Build & refine",
          "You follow progress and review the details as we go.",
        ],
        [
          "Test & launch",
          "We check that everything is ready for your customers.",
        ],
      ];
  return (
    <>
      <Hero locale={locale} />
      <section id="services" className="section-space services-section">
        <div className="container-shell">
          <div className="section-intro">
            <p className="eyebrow">
              {ar ? "كيف أستطيع مساعدتك؟" : "HOW I CAN HELP"}
            </p>
            <h2>
              {ar
                ? "الحل المناسب، حسب احتياجك."
                : "The right solution for your business."}
            </h2>
            <p>
              {ar
                ? "سواء تبدأ من فكرة جديدة أو تريد تطوير حضورك الحالي، نحدد معًا أفضل نقطة للبداية."
                : "Starting something new or improving what you have? We'll find the best place to begin."}
            </p>
          </div>
          <div className="services-grid">
            {services.map(({ icon: Icon, title, text, tag }, i) => (
              <article className="service-card" key={title}>
                <div className="service-top">
                  <span className="service-icon">
                    <Icon size={24} />
                  </span>
                  <span>0{i + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
                <div className="service-bottom">
                  <span>{tag}</span>
                  <Link href={`/${locale}/contact`} aria-label={title}>
                    <ArrowUpRight size={20} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section-space container-shell">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">
              {ar ? "من الفكرة إلى التجربة" : "FROM IDEA TO EXPERIENCE"}
            </p>
            <h2>{ar ? "مساحة للأعمال." : "A selection of work."}</h2>
            <p className="section-description">
              {ar
                ? "نماذج توضيحية لطريقة تقديم المشاريع ودراسات الحالة."
                : "Illustrative concepts showing how projects and case studies will be presented."}
            </p>
          </div>
          <Link className="text-link" href={`/${locale}/work`}>
            {ar ? "عرض كل المشاريع" : "View all projects"}
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="work-grid">
          {projects.slice(0, 2).map((project) => (
            <ProjectCard key={project.slug} project={project} locale={locale} />
          ))}
        </div>
      </section>
      <section className="process-section section-space">
        <div className="container-shell">
          <div className="section-intro">
            <p className="eyebrow">{ar ? "رحلة العمل" : "THE PROCESS"}</p>
            <h2>
              {ar
                ? "تعرف أين نحن. وما الخطوة التالية."
                : "A clear path from start to launch."}
            </h2>
            <p>
              {ar
                ? "تواصل مباشر ومراحل مفهومة، لتبقى مشاركًا في كل قرار مهم."
                : "Direct communication and clear stages keep you involved in every important decision."}
            </p>
          </div>
          <div className="steps-grid">
            {steps.map(([title, text], i) => (
              <div className="step" key={title}>
                <span className="step-number">0{i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section-space container-shell">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">{ar ? "من المدونة" : "FROM THE JOURNAL"}</p>
            <h2>{ar ? "أفكار تستحق المشاركة." : "Ideas worth sharing."}</h2>
          </div>
          <Link className="text-link" href={`/${locale}/blog`}>
            {ar ? "كل المقالات" : "All articles"}
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="journal-grid">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} locale={locale} />
          ))}
        </div>
      </section>
      <section className="container-shell cta-wrap">
        <div className="cta-panel">
          <div>
            <p className="eyebrow">
              {ar ? "لنبدأ محادثة" : "LET'S START A CONVERSATION"}
            </p>
            <h2>
              {ar
                ? "فكرتك تستحق بداية جيدة."
                : "Your idea deserves a great start."}
            </h2>
            <p>
              {ar
                ? "شارك معي ما تريد بناءه، ونحدد معًا الخطوة المناسبة."
                : "Tell me what you'd like to build. We'll work out the next step together."}
            </p>
          </div>
          <Link href={`/${locale}/contact`} className="primary-button">
            {ar ? "تحدث معي عن مشروعك" : "Tell me about your project"}
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
