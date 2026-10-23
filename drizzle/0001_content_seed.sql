-- Initial content snapshot; conflict handling preserves subsequent edits.
INSERT INTO public.projects (slug,sort_order,year,color,stack,published) VALUES ('finflow-platform',1,'2026','cyan',ARRAY['Next.js','PostgreSQL','TypeScript'],true) ON CONFLICT DO NOTHING;
INSERT INTO public.project_translations (project_slug,locale,title,summary,body,category) VALUES ('finflow-platform','ar','FinFlow','تجربة مالية تجمع الحسابات والتقارير والقرارات في مساحة واحدة واضحة.','صُممت المنصة لتقليل الوقت بين قراءة الأرقام واتخاذ القرار. بدأ العمل بإعادة ترتيب رحلة المستخدم، ثم بناء نظام واجهة مرن ولوحة تقارير سريعة.

هذا المحتوى نموذج توضيحي لدراسة الحالة، وسيُستبدل ببيانات المشروع الحقيقية لاحقًا.','منصة مالية') ON CONFLICT DO NOTHING;
INSERT INTO public.project_translations (project_slug,locale,title,summary,body,category) VALUES ('finflow-platform','en','FinFlow','A focused financial workspace bringing accounts, reporting, and decisions into one clear flow.','The platform was designed to shorten the distance between reading the numbers and making a decision. The work started by restructuring the user journey, followed by a flexible interface system and a fast reporting experience.

This is illustrative case-study content and will be replaced with real project information later.','Fintech platform') ON CONFLICT DO NOTHING;
INSERT INTO public.projects (slug,sort_order,year,color,stack,published) VALUES ('orbit-commerce',2,'2025','violet',ARRAY['React','Node.js','Supabase'],true) ON CONFLICT DO NOTHING;
INSERT INTO public.project_translations (project_slug,locale,title,summary,body,category) VALUES ('orbit-commerce','ar','Orbit Commerce','واجهة تجارة سريعة تجعل اكتشاف المنتج والشراء رحلة أقصر وأكثر ثقة.','ركزت التجربة على سرعة الوصول للمنتج الصحيح وتقليل التردد في خطوات الشراء. تم بناء نظام مكونات يدعم الحملات والكتالوج وتغير المحتوى دون فقد الاتساق.

هذه دراسة حالة تجريبية لأغراض تصميم النسخة الأولى.','تجارة إلكترونية') ON CONFLICT DO NOTHING;
INSERT INTO public.project_translations (project_slug,locale,title,summary,body,category) VALUES ('orbit-commerce','en','Orbit Commerce','A fast commerce experience that makes discovery and checkout shorter and more confident.','The experience focused on helping customers reach the right product quickly and reducing hesitation throughout checkout. A flexible component system supports campaigns, catalog changes, and evolving content.

This is a sample case study for the initial website design.','E-commerce') ON CONFLICT DO NOTHING;
INSERT INTO public.projects (slug,sort_order,year,color,stack,published) VALUES ('pulse-operations',3,'2025','amber',ARRAY['Next.js','API Design','Analytics'],true) ON CONFLICT DO NOTHING;
INSERT INTO public.project_translations (project_slug,locale,title,summary,body,category) VALUES ('pulse-operations','ar','Pulse Ops','لوحة تشغيل تحول البيانات اليومية إلى أولويات واضحة للفرق سريعة الحركة.','الهدف كان استبدال الجداول المشتتة بمصدر واحد للحقيقة. تجمع اللوحة الأحداث المهمة، تكشف التعطل مبكرًا، وتمنح كل فريق منظورًا مناسبًا لدوره.

الأرقام والنتائج ستضاف عند استبدال المشروع التجريبي بدراسة حالة حقيقية.','أداة تشغيل') ON CONFLICT DO NOTHING;
INSERT INTO public.project_translations (project_slug,locale,title,summary,body,category) VALUES ('pulse-operations','en','Pulse Ops','An operations dashboard turning daily data into clear priorities for fast-moving teams.','The goal was to replace fragmented spreadsheets with one source of truth. The dashboard surfaces important events, reveals blockers early, and gives each team a view aligned to its role.

Metrics and outcomes will be added when this sample is replaced with a real case study.','Operations tool') ON CONFLICT DO NOTHING;
INSERT INTO public.articles (id,date,reading_time,category,published) VALUES ('systems-that-scale','2026-09-18',7,'{"ar":"هندسة","en":"Engineering"}'::jsonb,true) ON CONFLICT DO NOTHING;
INSERT INTO public.article_translations (article_id,locale,slug,title,excerpt,body,published) VALUES ('systems-that-scale','ar','systems-that-scale-ar','كيف تبني نظامًا ينمو بدون أن يبطئ الفريق','مبادئ عملية لاتخاذ قرارات تقنية تخدم المنتج اليوم ولا تعرقل الغد.','## التوسع ليس رقمًا فقط

النظام القابل للتوسع لا يعني خوادم أكثر فقط؛ بل يعني أن الفريق يستطيع إضافة قيمة بدون أن تزداد تكلفة كل تغيير.

### ابدأ بالحدود الواضحة

قسّم المسؤوليات حول احتياجات المنتج الفعلية، وليس حول موضة تقنية. اجعل البيانات والعقود بين الأجزاء واضحة وقابلة للاختبار.

> أفضل بنية هي التي تجعل القرار التالي أسهل، لا التي تستعرض أكبر عدد من الأدوات.

راجع القياسات مبكرًا، وثّق القرارات المهمة، واترك مساحة لتغيير الاتجاه.',true) ON CONFLICT DO NOTHING;
INSERT INTO public.article_translations (article_id,locale,slug,title,excerpt,body,published) VALUES ('systems-that-scale','en','systems-that-scale','Building systems that scale without slowing the team','Practical principles for technical decisions that serve today’s product without blocking tomorrow.','## Scale is not just a number

A scalable system is not only about more servers. It means the team can keep delivering value without every change becoming more expensive.

### Start with clear boundaries

Divide responsibilities around real product needs, not technical fashion. Keep data and contracts explicit and testable.

> The best architecture makes the next decision easier instead of showcasing the most tools.

Measure early, document important decisions, and leave room to change direction.',true) ON CONFLICT DO NOTHING;
INSERT INTO public.articles (id,date,reading_time,category,published) VALUES ('arabic-product-guide','2026-08-04',5,'{"ar":"منتج","en":"Product"}'::jsonb,true) ON CONFLICT DO NOTHING;
INSERT INTO public.article_translations (article_id,locale,slug,title,excerpt,body,published) VALUES ('arabic-product-guide','ar','دليل-بناء-نسخة-اولى','دليل عملي لبناء نسخة أولى لا تبدو مؤقتة','كيف تختصر النطاق وتحافظ في الوقت نفسه على تجربة تستحق ثقة المستخدم.','## النسخة الأولى وعد صغير

لا يجب أن تفعل كل شيء، لكنها يجب أن تنجز المهمة الأساسية بإتقان. ابدأ بسؤال واحد: ما النتيجة التي سيعود المستخدم من أجلها؟

### احذف قبل أن تضيف

كل خطوة إضافية تستهلك انتباه المستخدم ووقت الفريق. احتفظ فقط بما يدعم النتيجة الرئيسية، ثم اجعل التفاصيل القليلة المتبقية ممتازة.

الجودة في النسخة الأولى تأتي من وضوح الاختيار، لا من كثرة الخصائص.',true) ON CONFLICT DO NOTHING;
INSERT INTO public.articles (id,date,reading_time,category,published) VALUES ('api-decisions','2026-07-12',6,'{"ar":"Back-end","en":"Back-end"}'::jsonb,true) ON CONFLICT DO NOTHING;
INSERT INTO public.article_translations (article_id,locale,slug,title,excerpt,body,published) VALUES ('api-decisions','en','api-decisions-that-age-well','API decisions that age well','A compact framework for interfaces that stay understandable as products and teams evolve.','## Design for the conversation

An API is a conversation between systems and the people maintaining them. Clear naming, predictable errors, and explicit ownership matter more than clever abstractions.

### Make change visible

Version only when the contract truly breaks. Prefer additive changes, validate inputs at the boundary, and return errors that help the caller recover.

A small consistent API is easier to grow than a flexible interface nobody fully understands.',true) ON CONFLICT DO NOTHING;
INSERT INTO public.site_content (key,locale,value) VALUES ('ui','ar','{"nav":{"home":"الرئيسية","work":"المشاريع","blog":"المقالات","about":"عني","contact":"تواصل معي"},"availability":"متاح لمشروعات مختارة","footer":"أبني منتجات رقمية سريعة، واضحة، وقابلة للنمو.","language":"EN","viewProject":"عرض دراسة الحالة","readArticle":"قراءة المقال","allWork":"كل المشاريع","allArticles":"كل المقالات","minutes":"دقائق قراءة","originalLanguage":"المقال متاح باللغة الإنجليزية فقط"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public.site_content (key,locale,value) VALUES ('ui','en','{"nav":{"home":"Home","work":"Work","blog":"Writing","about":"About","contact":"Let''s talk"},"availability":"Available for selected projects","footer":"I build fast, clear digital products designed to grow.","language":"عربي","viewProject":"View case study","readArticle":"Read article","allWork":"All projects","allArticles":"All articles","minutes":"min read","originalLanguage":"This article is available in Arabic only"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public.site_content (key,locale,value) VALUES ('home','ar','{"eyebrow":"مطور Full-Stack مستقل","title":"أحوّل الأفكار المعقدة إلى منتجات رقمية بسيطة ومؤثرة.","intro":"أصمم وأبني تجارب ويب متكاملة تجمع بين وضوح المنتج، جودة الواجهة، وهندسة خلفية تتحمل النمو.","primaryCta":"ابدأ مشروعك","secondaryCta":"شاهد أعمالي","proof":["تجربة مستخدم مدروسة","أداء سريع","كود قابل للتوسع"],"workEyebrow":"أعمال مختارة","workTitle":"منتجات صُممت لحل مشكلات حقيقية.","workIntro":"نماذج دراسات حالة توضح كيف أحوّل أهداف العمل إلى تجربة منتج واضحة وقابلة للقياس.","servicesEyebrow":"ما الذي أقدمه","servicesTitle":"من الفكرة إلى الإطلاق، بدون فجوات بين التصميم والتنفيذ.","services":[{"number":"01","title":"استراتيجية المنتج","text":"تحويل الفكرة إلى نطاق واضح، رحلة مستخدم، وخطة إطلاق عملية."},{"number":"02","title":"واجهات الويب","text":"واجهات سريعة ومتجاوبة، مبنية حول المحتوى وسهولة الاستخدام."},{"number":"03","title":"الأنظمة الخلفية","text":"واجهات API وقواعد بيانات وتكاملات آمنة قابلة للتوسع والصيانة."}],"processEyebrow":"طريقة العمل","processTitle":"تعاون واضح، قرارات أسرع، ونتيجة بلا مفاجآت.","process":["نفهم المشكلة","نحدد النطاق","نبني ونختبر","نطلق ونحسن"],"writingEyebrow":"أفكار وملاحظات","writingTitle":"أكتب عما أتعلمه أثناء بناء المنتجات.","ctaTitle":"عندك فكرة تستحق البناء؟","ctaText":"احكِ لي عن المشروع، وسأرد عليك بخطوة تالية واضحة.","ctaButton":"أرسل تفاصيل المشروع"}'::jsonb) ON CONFLICT DO NOTHING;
INSERT INTO public.site_content (key,locale,value) VALUES ('home','en','{"eyebrow":"Independent full-stack developer","title":"I turn complex ideas into simple, high-impact digital products.","intro":"I design and build end-to-end web experiences that combine product clarity, polished interfaces, and backends ready to scale.","primaryCta":"Start a project","secondaryCta":"Explore my work","proof":["Thoughtful UX","Fast performance","Scalable code"],"workEyebrow":"Selected work","workTitle":"Products designed around real problems.","workIntro":"Sample case studies showing how business goals become clear, measurable product experiences.","servicesEyebrow":"What I do","servicesTitle":"From first idea to launch, with no gap between design and engineering.","services":[{"number":"01","title":"Product strategy","text":"Turning an idea into a clear scope, user journey, and practical launch plan."},{"number":"02","title":"Web experiences","text":"Fast, responsive interfaces designed around content and usability."},{"number":"03","title":"Backend systems","text":"Secure, maintainable APIs, databases, and integrations built to grow."}],"processEyebrow":"How I work","processTitle":"Clear collaboration, faster decisions, and no surprises.","process":["Understand","Define","Build & test","Launch & improve"],"writingEyebrow":"Notes & ideas","writingTitle":"Writing about what I learn while building products.","ctaTitle":"Have an idea worth building?","ctaText":"Tell me about the project and I’ll reply with a clear next step.","ctaButton":"Share your project"}'::jsonb) ON CONFLICT DO NOTHING;
