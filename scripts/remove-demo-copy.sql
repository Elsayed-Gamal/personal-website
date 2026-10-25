-- Personal website only. Clear original demo notices without replacing edited copy.
update public.site_content set value=jsonb_set(value,'{text}','""'::jsonb)
where key='work' and (
  (locale='ar' and value->>'text'='دراسات حالة تجريبية تحدد شكل العرض النهائي، وسيتم استبدالها بالمشاريع والنتائج الحقيقية.') or
  (locale='en' and value->>'text'='Illustrative case studies defining the final presentation, ready to be replaced with real projects and outcomes.')
);
update public.site_content set value=jsonb_set(value,'{note}','""'::jsonb)
where (key='project_detail' and (
  (locale='ar' and value->>'note'='هذه دراسة حالة تجريبية وسيتم استبدالها بمحتوى مشروع حقيقي.') or
  (locale='en' and value->>'note'='This is an illustrative case study ready to be replaced with real project content.')
)) or (key='article_detail' and (
  (locale='ar' and value->>'note'='مقال تجريبي يوضح قالب القراءة قبل إضافة المحتوى النهائي.') or
  (locale='en' and value->>'note'='Sample writing that demonstrates the reading template before final content is added.')
));
update public.site_content set value=jsonb_set(value,'{work,description}','"Selected work."'::jsonb)
where key='home' and locale='en' and value#>>'{work,description}'='Illustrative concepts showing how projects and case studies will be presented.';
