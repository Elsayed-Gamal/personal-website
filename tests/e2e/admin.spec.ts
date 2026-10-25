import { test, expect } from "@playwright/test";

test("anonymous requests cannot read any admin page", async ({ request }) => {
  for (const path of [
    "/admin",
    "/admin/dashboard",
    "/admin/content",
    "/admin/media",
    "/admin/messages",
    "/admin/settings",
    "/admin/settings.json",
  ]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toMatch(/\/admin\/login$/);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
    expect(await response.text()).not.toContain("مساحة عمل المسؤول");
  }
});

test("login stays outside locale routing and is usable on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin/login");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(
    page.getByRole("heading", { name: "أهلًا بعودتك" }),
  ).toBeVisible();
  await expect(page.getByLabel("البريد الإلكتروني")).toBeVisible();
  await expect(page.getByLabel("كلمة المرور")).toHaveAttribute(
    "type",
    "password",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("a forged session does not authorize an admin request", async ({
  request,
}) => {
  const fake = Buffer.from(
    JSON.stringify({
      access_token: "forged",
      refresh_token: "forged",
      user: { email: "eheeba@gmail.com", role: "admin" },
    }),
  ).toString("base64url");
  const response = await request.get("/admin/settings", {
    maxRedirects: 0,
    headers: { Cookie: `sb-cdoaudugbjrkhyhivaaa-auth-token=base64-${fake}` },
  });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toMatch(/\/admin\/login$/);
});
