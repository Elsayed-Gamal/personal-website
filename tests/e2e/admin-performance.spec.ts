import { test, expect } from "@playwright/test";

// Supply a local owner session yourself; never commit it or send it in chat.
const ownerState = process.env.ADMIN_E2E_AUTH_STATE;
test.use({ trace: "off", screenshot: "off", video: "off" });

test("measure actual admin navigation with and without completed intent prefetch", async ({
  browser,
}, testInfo) => {
  test.skip(
    !ownerState,
    "Requires a locally saved owner session; no auth bypass is used.",
  );
  test.setTimeout(180000);
  const results: {
    page: string;
    mode: string;
    milliseconds: number;
    rscBytes: number;
  }[] = [];
  for (const [path, heading] of [
    ["/admin/content", "إدارة المحتوى"],
    ["/admin/messages", "الرسائل"],
    ["/admin/settings", "إعدادات الموقع"],
  ]) {
    for (const mode of ["cold", "prefetched"]) {
      // Fresh context prevents previously visited pages from contaminating cold samples.
      const context = await browser.newContext({ storageState: ownerState });
      try {
        const page = await context.newPage();
        const base = String(testInfo.project.use.baseURL);
        await page.goto(base + "/admin/dashboard");
        await expect(
          page.getByRole("heading", { name: "لوحة التحكم", exact: true }),
        ).toBeVisible();
        const link = page
          .getByRole("navigation", { name: "أقسام الإدارة" })
          .getByRole("link", { name: heading, exact: true });
        const targetResponse = page.waitForResponse((response) => {
          const url = new URL(response.url());
          return url.pathname === path && url.searchParams.has("_rsc");
        });
        let rscBytes = 0;
        if (mode === "prefetched") {
          await link.focus();
          const response = await targetResponse;
          expect(response.ok()).toBe(true);
          rscBytes = (await response.body()).byteLength;
        }
        const started = performance.now();
        // Programmatic click avoids Playwright's hover warming the cold sample.
        await link.evaluate((element: HTMLAnchorElement) => element.click());
        await expect(page).toHaveURL(base + path);
        await expect(
          page
            .locator("#admin-main")
            .getByRole("heading", { name: heading, exact: true }),
        ).toBeVisible();
        const milliseconds = Math.round(performance.now() - started);
        if (mode === "cold")
          rscBytes = (await (await targetResponse).body()).byteLength;
        results.push({ page: path, mode, milliseconds, rscBytes });
      } finally {
        await context.close();
      }
    }
  }
  // Only timings/counts, never captured requests, cookies or private page bodies.
  await testInfo.attach("admin-navigation-timings", {
    body: JSON.stringify(results, null, 2),
    contentType: "application/json",
  });
  console.table(results);
});
