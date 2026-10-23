import { test, expect } from "@playwright/test";
test("Arabic and English contact forms render on mobile and validate required input", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const locale of ["ar", "en"]) {
    await page.goto("/" + locale + "/contact");
    await expect(page.locator("#contact-name")).toBeVisible();
    await expect(page.locator("#contact-email")).toHaveAttribute(
      "type",
      "email",
    );
    await expect(page.locator("#contact-message")).toHaveAttribute(
      "maxlength",
      "5000",
    );
    await page.locator(".contact-submit").click();
    expect(
      await page
        .locator("#contact-name")
        .evaluate((e: HTMLInputElement) => e.validity.valueMissing),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});
test("honeypot submission exercises the server action without storing a test message", async ({
  page,
}) => {
  await page.goto("/en/contact");
  await page.locator("#contact-name").fill("Automation test");
  await page.locator("#contact-email").fill("contact-test@example.com");
  await page
    .locator("#contact-message")
    .fill("A complete contact test that must be discarded.");
  await page.locator("#contact-website").evaluate((el: HTMLInputElement) => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    setter.call(el, "honeypot-test");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.locator(".contact-submit").click();
  await expect(page.getByRole("status")).toContainText("has been received");
});
