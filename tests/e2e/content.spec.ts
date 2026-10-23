import { test, expect } from "@playwright/test";

test("both homepages load database projects, articles and navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const locale of ["ar", "en"]) {
    const response = await page.goto(`/${locale}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator(".case-study-card")).toHaveCount(2);
    await expect(page.locator(".article-card")).toHaveCount(3);
    await expect(page.locator("header")).toContainText(
      locale === "ar" ? "المشاريع" : "Work",
    );
  }
  expect(errors).toEqual([]);
});

test("project listing and detail use the migrated content", async ({
  page,
}) => {
  await page.goto("/ar/work");
  await expect(page.locator(".case-study-card")).toHaveCount(3);
  await page.locator('a[href="/ar/work/finflow-platform"]').click();
  await expect(page.locator("h1")).toHaveText("FinFlow");
  await expect(page.locator(".article-body")).toContainText("صُممت المنصة");
});

test("single-language articles redirect correctly, including Arabic slugs", async ({
  request,
  page,
}) => {
  const arabic = await request.get(
    "/en/blog/" + encodeURIComponent("دليل-بناء-نسخة-اولى"),
  );
  expect(arabic.status()).toBe(200);
  expect(decodeURI(arabic.url())).toContain("/ar/blog/دليل-بناء-نسخة-اولى");
  await page.goto("/ar/blog/api-decisions-that-age-well");
  await expect(page).toHaveURL(/\/en\/blog\/api-decisions-that-age-well$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("h1")).toHaveText("API decisions that age well");
});

test("language switching resolves translated slugs and unknown content returns 404", async ({
  page,
  request,
}) => {
  await page.goto("/ar/blog/systems-that-scale-ar");
  await page.getByRole("link", { name: "Switch to English" }).click();
  await expect(page).toHaveURL(/\/en\/blog\/systems-that-scale$/);
  await expect(page.locator("h1")).toHaveText(
    "Building systems that scale without slowing the team",
  );
  expect(
    (await request.get("/en/blog/missing-content-for-test")).status(),
  ).toBe(404);
  expect(
    (await request.get("/ar/work/missing-content-for-test")).status(),
  ).toBe(404);
});
