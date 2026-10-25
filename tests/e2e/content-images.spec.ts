import { test, expect } from "@playwright/test";

test("a published project cover loads in listing, home and detail", async ({
  page,
}, testInfo) => {
  await page.goto("/ar/work");
  const cards = page
    .locator(".case-study-card")
    .filter({ has: page.locator(".content-cover img") });
  test.skip(
    (await cards.count()) === 0,
    "Requires an existing published project with an uploaded cover.",
  );
  const card = cards.first();
  const href = await card.getAttribute("href");
  const image = card.locator(".content-cover img");
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate(
        (node: HTMLImageElement) => node.complete && node.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await expect(image).toHaveAttribute("src", /content-images/);
  await page.screenshot({
    path: testInfo.outputPath("project-listing.png"),
    fullPage: true,
  });
  await card.click();
  await expect(page).toHaveURL(new RegExp(href! + "$"));
  const detailImage = page.locator(".content-detail-cover img");
  await expect(detailImage).toBeVisible();
  await expect
    .poll(() =>
      detailImage.evaluate(
        (node: HTMLImageElement) => node.complete && node.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /storage\/v1\/object\/public\/content-images\/projects\//,
  );
  await page.goto("/ar");
  const homeCard = page.locator(`.case-study-card[href="${href}"]`);
  if (await homeCard.count()) {
    const homeImage = homeCard.locator(".content-cover img");
    await expect
      .poll(() =>
        homeImage.evaluate(
          (node: HTMLImageElement) => node.complete && node.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
});

test("existing articles open from either language and display their saved cover when present", async ({
  page,
}) => {
  for (const locale of ["ar", "en"]) {
    await page.goto(`/${locale}/blog`);
    const cards = page.locator(".article-card");
    test.skip(
      (await cards.count()) === 0,
      "Requires an existing published article.",
    );
    const href = await cards.first().getAttribute("href");
    await cards.first().click();
    await expect(page).toHaveURL(new RegExp(href! + "$"));
    await expect(page.locator(".article-body")).toBeVisible();
    const cover = page.locator(".content-detail-cover img");
    if (await cover.count()) {
      await expect
        .poll(() =>
          cover.evaluate(
            (node: HTMLImageElement) => node.complete && node.naturalWidth > 0,
          ),
        )
        .toBe(true);
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        "content",
        /storage\/v1\/object\/public\/content-images\/articles\//,
      );
    }
  }
});
