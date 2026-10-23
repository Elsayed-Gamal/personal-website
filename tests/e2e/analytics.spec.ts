import { test, expect } from "@playwright/test";

test("automated public browsing does not generate analytics events", async ({
  page,
}) => {
  const events: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/analytics/page-view"))
      events.push(request.url());
  });
  await page.goto("/en");
  await expect(page.locator("h1")).toBeVisible();
  await page.waitForTimeout(1200);
  expect(events).toEqual([]);
});

test("analytics endpoint rejects foreign origins and private paths without recording", async ({
  request,
}) => {
  const data = {
    eventId: "527132ce-814c-4fe3-85f6-229e48d6df06",
    path: "/admin/dashboard",
  };
  const foreign = await request.post("/api/analytics/page-view", {
    data,
    headers: { origin: "https://foreign.test", "user-agent": "Mozilla/5.0" },
  });
  expect(foreign.status()).toBe(403);
  const invalid = await request.post("/api/analytics/page-view", {
    data,
    headers: { origin: "http://127.0.0.1:3103", "user-agent": "Mozilla/5.0" },
  });
  expect(invalid.status()).toBe(400);
});
