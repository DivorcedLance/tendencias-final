import { test, expect } from "@playwright/test";

test.describe("Dashboard de color rojo - sin cambiar theme", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/demo/dashboard-data");
    await page.waitForTimeout(1500);
  });

  test("renderiza dashboard rojo SIN cambiar el theme principal", async ({
    page,
  }) => {
    // Record theme state before request
    const themeBefore = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );

    const textarea = page.locator("textarea");
    await textarea.fill("Dame un dashboard de color rojo");
    await textarea.press("Enter");

    // Wait for processing to start
    await page.waitForTimeout(5000);

    // PROBE: Theme toggle must still work (page not frozen)
    const toggle = page
      .locator('button[title="Modo claro"], button[title="Modo oscuro"]')
      .first();
    await expect(toggle).toBeVisible({ timeout: 5000 });

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

    // Verify theme did NOT change
    const themeAfter = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    expect(themeAfter).toBe(themeBefore);

    // Verify page is still responsive
    await page.waitForTimeout(1000);
    const isDarkFinal = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    expect(isDarkFinal).toBe(themeBefore);
  });
});
