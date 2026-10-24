import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminLoading } from "../../src/components/admin/admin-loading";

const css = readFileSync("src/styles/admin.css", "utf8");
const loading = renderToStaticMarkup(createElement(AdminLoading));

for (const width of [1440, 960, 390]) {
  test(`route loading is centered and accessible at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    // Isolated layout fixture: tests the actual component/CSS without an owner
    // password, changing authorization, or writing to the database.
    await page.setContent(`
      <html lang="ar" dir="rtl"><head><style>
      * { box-sizing: border-box; } body { margin: 0; } p { margin: 0; }
      ${css}
      </style></head><body class="admin-body">
      <div class="admin-shell">
        <aside class="admin-sidebar">إدارة الموقع</aside>
        <div class="admin-workspace">
          <header class="admin-topbar">مساحة عمل المسؤول</header>
          <main id="admin-main" class="admin-main">
            ${loading}
          </main>
        </div>
      </div></body></html>
    `);
    const spinner = page.locator(".admin-loading-spinner");
    const status = page.getByRole("status");
    // Disable rotation while measuring: its transformed bounds vary by frame.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(status).toBeVisible();
    const bounds = await spinner.boundingBox();
    const container = await status.boundingBox();
    expect(bounds).not.toBeNull();
    expect(container).not.toBeNull();
    expect(bounds!.x + bounds!.width / 2).toBeCloseTo(
      container!.x + container!.width / 2,
      1,
    );
    expect(container!.height).toBeGreaterThanOrEqual(420);
    await expect(status).toHaveText("جارٍ تحميل الصفحة…");
    await expect(spinner).toHaveCSS("animation-name", "none");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
  });
}
