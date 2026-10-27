import { test, expect } from "@playwright/test";

test("both homepages show bounded selections from the current published content", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const locale of ["ar", "en"]) {
    await page.goto(`/${locale}/work`);
    const projects = await page.locator(".case-study-card").count();
    await page.goto(`/${locale}/blog`);
    const articles = await page.locator(".article-card").count();
    const response = await page.goto(`/${locale}`);
    expect(response?.status()).toBe(200);
    const initialHtml = await response!.text();
    expect(initialHtml).not.toContain("Loading content…");
    expect(initialHtml).not.toContain("جارٍ تحميل المحتوى…");
    expect(initialHtml).not.toContain("Loading page…");
    expect(initialHtml).not.toContain("جارٍ تحميل الصفحة…");
    if (projects) expect(initialHtml).toContain("case-study-card");
    if (articles) expect(initialHtml).toContain("article-card");
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator(".case-study-card")).toHaveCount(
      Math.min(2, projects),
    );
    await expect(page.locator(".article-card")).toHaveCount(
      Math.min(3, articles),
    );
    await expect(page.locator("header")).toContainText(
      locale === "ar" ? "المشاريع" : "Work",
    );
  }
  expect(errors).toEqual([]);
});

test("published projects open and switch languages without depending on seed slugs", async ({
  page,
}) => {
  await page.goto("/ar/work");
  const cards = page.locator(".case-study-card");
  expect(await cards.count()).toBeGreaterThan(0);
  expect(await cards.count()).toBeLessThanOrEqual(12);
  const href = await cards.first().getAttribute("href");
  await cards.first().click();
  await expect(page).toHaveURL(
    (url) => decodeURI(url.pathname) === decodeURI(href!),
  );
  await expect(page.locator("h1")).not.toBeEmpty();
  await expect(page.locator(".article-body")).toBeVisible();
  await page.getByRole("link", { name: "Switch to English" }).click();
  await expect(page).toHaveURL(
    (url) =>
      decodeURI(url.pathname) === decodeURI(href!.replace("/ar/", "/en/")),
  );
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".article-body")).toBeVisible();
});

test("article links and alternate-locale requests resolve to canonical published pages", async ({
  page,
  request,
}) => {
  await page.goto("/en/blog");
  const links = await page
    .locator(".article-card")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")!));
  expect(links.length).toBeGreaterThan(0);
  expect(links.length).toBeLessThanOrEqual(12);
  for (const href of links) {
    const response = await request.get(href, { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    const opposite = href.replace(/^\/(ar|en)\//, (_, locale) =>
      locale === "ar" ? "/en/" : "/ar/",
    );
    const alternate = await request.get(opposite, { maxRedirects: 0 });
    // Shared bilingual slugs need no redirect; other slugs must canonicalize.
    expect([200, 307, 308]).toContain(alternate.status());
    await page.goto(opposite);
    await expect(page.locator(".article-body")).toBeVisible();
    const locale = new URL(page.url()).pathname.split("/")[1];
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
      "content",
      "article",
    );
    // Canonical metadata is intentionally omitted until the owner sets seo.siteUrl.
    const canonical = await page
      .locator('link[rel="canonical"]')
      .evaluateAll((nodes) => nodes[0]?.getAttribute("href"));
    if (canonical)
      expect(decodeURI(new URL(canonical).pathname)).toBe(
        decodeURI(new URL(page.url()).pathname),
      );
    expect(
      (
        await request.get(new URL(page.url()).pathname, { maxRedirects: 0 })
      ).status(),
    ).toBe(200);
  }
});

test("invalid pagination falls back to page one and unknown content returns HTTP 404", async ({
  page,
  request,
}) => {
  await page.goto("/en/blog");
  const first = await page
    .locator(".article-card")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
  await page.goto("/en/blog?page=-1");
  expect(
    await page
      .locator(".article-card")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href"))),
  ).toEqual(first);
  await page.goto("/en/blog?page=10000");
  await expect(
    page.getByRole("link", { name: "Previous", exact: true }),
  ).toHaveAttribute("href", "/en/blog?page=9999");
  for (const path of [
    "/en/blog/missing-content-for-test",
    "/ar/work/missing-content-for-test",
  ]) {
    expect((await request.get(path)).status()).toBe(404);
  }
});
