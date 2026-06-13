import { test, expect } from "@playwright/test";

test.describe("Game — BDD Smoke", () => {
  test("Given the game app is running, When I visit the home page, Then I see the page title", async ({ page }) => {
    // Given: app is running (handled by webServer)

    // When: visit home
    await page.goto("/");

    // Then: page loads with expected title and heading
    await expect(page).toHaveTitle(/Pew\.md/i, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "PEW.MD" })).toBeVisible();
  });
});
