import { test, expect } from "@playwright/test";

test.describe("Dashboard + Dark Mode + Bright Colors", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo/dashboard-data");
    await page.waitForTimeout(1500);
  });

  test("page doesn't crash when requesting dashboard with dark bg + bright colors", async ({
    page,
  }) => {
    const textarea = page.locator("textarea");
    await textarea.fill(
      "Genera un dashboard con fondo oscuro y colores brillantes"
    );
    await textarea.press("Enter");

    // Wait for processing to start
    await page.waitForTimeout(5000);

    // PROBE: Theme toggle - if page is hung, this won't work
    const toggle = page
      .locator('button[title="Modo claro"], button[title="Modo oscuro"]')
      .first();
    await expect(toggle).toBeVisible({ timeout: 5000 });

    const isDarkBefore = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );

    await toggle.click();
    await page.waitForTimeout(500);

    const isDarkAfter = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );

    // Theme must have changed - page is responsive
    expect(isDarkAfter).not.toBe(isDarkBefore);
  });

  test("actually renders dashboard content (not just theme change)", async ({
    page,
  }) => {
    const textarea = page.locator("textarea");
    await textarea.fill(
      "Genera un dashboard con fondo oscuro y colores brillantes con KPIs y gráficas"
    );
    await textarea.press("Enter");

    // Wait for dashboard content to appear
    const gotContent = await page
      .waitForFunction(
        () => {
          const html = document.body.innerHTML;
          return (
            html.includes("recharts-wrapper") ||
            html.includes("<table") ||
            html.includes("KPI")
          );
        },
        { timeout: 55_000, polling: 3000 }
      )
      .then(() => true)
      .catch(() => false);

    expect(gotContent).toBe(true);

    // Wait for React to paint
    await page.waitForTimeout(2000);

    // Verify something rendered
    const chartVisible = await page
      .locator(".recharts-wrapper")
      .first()
      .isVisible()
      .catch(() => false);
    const tableVisible = await page
      .locator("table")
      .first()
      .isVisible()
      .catch(() => false);
    const kpiVisible = await page
      .getByText("KPI")
      .first()
      .isVisible()
      .catch(() => false);

    expect(chartVisible || tableVisible || kpiVisible).toBe(true);
  });

  test("page stays responsive while dashboard with dark+bright is generating", async ({
    page,
  }) => {
    const textarea = page.locator("textarea");
    await textarea.fill(
      "Dashboard con fondo oscuro y colores brillantes de ventas mensuales"
    );
    await textarea.press("Enter");

    // Check responsiveness: page must accept user input while AI processes
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(3000);

      // PROBE: Theme toggle must still be clickable
      const themeToggle = page
        .locator('button[title="Modo claro"], button[title="Modo oscuro"]')
        .first();
      const visible = await themeToggle.isVisible().catch(() => false);
      expect(visible).toBe(true);

      // PROBE: Textarea must still be interactive
      const ta = page.locator("textarea");
      const taVisible = await ta.isVisible().catch(() => false);
      expect(taVisible).toBe(true);
    }
  });
});
