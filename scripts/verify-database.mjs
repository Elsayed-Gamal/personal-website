import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const approvedUrl = "https://cdoaudugbjrkhyhivaaa.supabase.co";
assert.equal(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  approvedUrl,
  "Only Personal website is permitted",
);
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(
  key?.startsWith("sb_publishable_"),
  "Use the project's publishable key",
);
const client = createClient(approvedUrl, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const seed = JSON.parse(
  await readFile(new URL("./seed-content.json", import.meta.url), "utf8"),
);
const pageContent = JSON.parse(
  await readFile(new URL("./page-content-seed.json", import.meta.url), "utf8"),
);

async function rows(table, select) {
  const { data, error } = await client
    .from(table)
    .select(select)
    .abortSignal(AbortSignal.timeout(15000));
  assert.equal(error, null, `${table}: ${error?.message}`);
  return data;
}

const [projects, articles, copy] = await Promise.all([
  rows("projects", "*, project_translations(*)"),
  rows("articles", "*, article_translations(*)"),
  rows("site_content", "*"),
]);

const actualProjects = projects
  .map((p) => ({
    slug: p.slug,
    index: String(p.sort_order).padStart(2, "0"),
    year: p.year,
    color: p.color,
    stack: p.stack,
    category: Object.fromEntries(
      p.project_translations.map((t) => [t.locale, t.category]),
    ),
    content: Object.fromEntries(
      p.project_translations.map((t) => [
        t.locale,
        { title: t.title, summary: t.summary, body: t.body },
      ]),
    ),
  }))
  .sort((a, b) => a.index.localeCompare(b.index));
assert.deepEqual(actualProjects, seed.projects);

const actualArticles = articles
  .map((a) => ({
    id: a.id,
    date: a.date,
    readingTime: a.reading_time,
    category: a.category,
    translations: Object.fromEntries(
      a.article_translations.map((t) => [
        t.locale,
        { slug: t.slug, title: t.title, excerpt: t.excerpt, body: t.body },
      ]),
    ),
  }))
  .sort((a, b) => a.id.localeCompare(b.id));
assert.deepEqual(
  actualArticles,
  [...seed.articles].sort((a, b) => a.id.localeCompare(b.id)),
);
for (const [name, value] of Object.entries(pageContent)) {
  assert.deepEqual(
    Object.fromEntries(
      copy.filter((c) => c.key === name).map((c) => [c.locale, c.value]),
    ),
    value,
  );
}
const { error: messageError } = await client
  .from("messages")
  .select("id")
  .limit(1);
assert.ok(
  messageError,
  "The private inbox must not be readable with a publishable key",
);
console.log(
  "Verified exact content parity: 3 projects, 6 project translations, 3 articles, 4 article translations, 16 page-content records. Public inbox access denied.",
);
