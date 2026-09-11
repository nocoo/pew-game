import { test, expect } from "@playwright/test";
import { APP_VERSION } from "../../src/lib/version";

test("the exported game plays and saves a score through the real Worker and local D1", async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  let tokenRequests = 0;
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => { if (request.url().endsWith("/api/token")) tokenRequests += 1; });
  const scoresLoaded = page.waitForResponse((response) => response.url().endsWith("/api/scores"));
  await page.goto("/");
  expect((await scoresLoaded).status()).toBe(200);
  await expect(page).toHaveTitle("Pew Game — Prairie Shooter");
  await expect(page.getByRole("heading", { name: "A little wild. A lot of pew." })).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByText("Your name belongs here.")).toBeVisible();

  const health = await page.request.get("/api/live");
  expect(health.status()).toBe(200);
  expect(health.headers()["cache-control"]).toBe("no-store");
  expect(await health.json()).toEqual({ status: "ok", version: APP_VERSION, database: { connected: true } });

  const started = page.waitForResponse((response) => response.url().endsWith("/api/token"));
  await page.getByRole("button", { name: "Start a run", exact: true }).click();
  const token = await started;
  expect(token.status()).toBe(200);
  expect(token.headers()["cache-control"]).toBe("no-store");
  await expect(page.getByLabel("Wave: 1", { exact: true })).toBeVisible();

  // Standing still ends a real game; no test-only hooks or fabricated production scores.
  await expect(page.getByText("GAME OVER", { exact: true })).toBeVisible({ timeout: 60_000 });
  expect(tokenRequests).toBe(1);
  await page.getByLabel("Leave your name").fill("E2E");
  // A failed save must retain the score/name and let the player retry the same session.
  let saveAttempts = 0;
  let storedId: number | undefined;
  await page.route("**/api/scores", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    saveAttempts += 1;
    if (saveAttempts === 1) {
      await route.fulfill({ status: 503, json: { error: "unavailable" } });
    } else if (saveAttempts === 2) {
      // The Worker commits to D1, but its response never reaches the player.
      const committed = await route.fetch();
      expect(committed.status()).toBe(201);
      storedId = (await committed.json()).inserted.id;
      await route.abort("connectionreset");
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Save score", exact: true }).click();
  await expect(page.getByRole("region", { name: "End of the trail." }).getByRole("alert")).toHaveText("Couldn’t save your score. Please try again.");
  await expect(page.getByLabel("Leave your name")).toHaveValue("E2E");
  await page.locator("canvas").focus();
  await page.keyboard.press("Space");
  await expect(page.getByText("GAME OVER", { exact: true })).toBeVisible();
  expect(tokenRequests).toBe(1);
  await page.getByRole("button", { name: "Save score", exact: true }).click();
  await expect(page.getByRole("region", { name: "End of the trail." }).getByRole("alert")).toHaveText("Couldn’t save your score. Please try again.");
  await expect(page.getByLabel("Leave your name")).toHaveValue("E2E");
  expect(storedId).toBeDefined();
  const saved = page.waitForResponse((response) => response.url().endsWith("/api/scores") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Save score", exact: true }).click();
  const response = await saved;
  expect(response.status()).toBe(201);
  expect((await response.json()).inserted.id).toBe(storedId);
  expect(saveAttempts).toBe(3);
  await expect(page.getByText("Your score is saved. See you on the next run.")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "E2E" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("listitem").filter({ hasText: "E2E" })).toBeVisible();
  const leaderboard = await page.request.get("/api/scores");
  const entries = await leaderboard.json() as { name: string; id: number }[];
  expect(entries.filter((entry) => entry.name === "E2E")).toHaveLength(1);
  expect(entries.find((entry) => entry.name === "E2E")?.id).toBe(storedId);
  expect(errors).toEqual([]);
});

test("the leaderboard explains an outage and retries", async ({ page }) => {
  let unavailable = true;
  await page.route("**/api/scores", async (route) => {
    if (unavailable) await route.fulfill({ status: 503, json: { error: "unavailable" } });
    else await route.continue();
  });
  await page.goto("/");
  await expect(page.getByText("Couldn’t load the leaderboard.")).toBeVisible();
  unavailable = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("Couldn’t load the leaderboard.")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Leaderboard" })).toHaveAttribute("aria-busy", "false");
});

test("keyboard start permits a clearly labeled practice run when rankings are unavailable", async ({ page }) => {
  await page.route("**/api/token", (route) => route.fulfill({ status: 503, json: { error: "unavailable" } }));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Start a run", exact: true })).toBeEnabled();
  await page.keyboard.press("Space");
  await expect(page.getByLabel("Wave: 1", { exact: true })).toBeVisible();
  await expect(page.getByText("PRACTICE RUN · SCORES UNAVAILABLE")).toBeVisible();
});

test("the arcade fits desktop, tablet, and small phone screens", async ({ page }) => {
  await page.goto("/");
  for (const width of [1440, 850, 760, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    await expect(page.getByRole("button", { name: "Start a run", exact: true })).toBeVisible();
    const dimensions = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: window.innerWidth, canvas: document.querySelector("canvas")!.getBoundingClientRect().width }));
    expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport);
    expect(dimensions.canvas).toBeLessThan(dimensions.viewport);
  }
});

test("touch controls and the result form work on a small phone", async ({ browser, baseURL }) => {
  test.setTimeout(90_000);
  const context = await browser.newContext({ baseURL, viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto("/");
  const left = page.getByRole("button", { name: "Move left", exact: true });
  await expect(left).toBeVisible();
  await expect(left).toBeDisabled();
  await page.getByRole("button", { name: "Start a run", exact: true }).tap();
  await expect(left).toBeEnabled();
  const buttonSize = await left.boundingBox();
  expect(buttonSize!.width).toBeGreaterThanOrEqual(44);
  expect(buttonSize!.height).toBeGreaterThanOrEqual(44);
  await expect(left).toBeInViewport();
  await left.tap();
  await expect(page.getByText("ON THE PRAIRIE", { exact: true })).toBeVisible();
  await expect(page.getByText("GAME OVER", { exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(left).toBeDisabled();
  await page.getByLabel("Leave your name").fill("PHONE");
  await expect(page.getByLabel("Leave your name")).toHaveCSS("font-size", "16px");
  // Keep this mobile run local and unsaved while checking form actions on a short viewport.
  await page.setViewportSize({ width: 320, height: 430 });
  await page.route("**/api/scores", (route) => route.request().method() === "POST"
    ? route.fulfill({ status: 503, json: { error: "unavailable" } }) : route.continue());
  await page.getByRole("button", { name: "Save score", exact: true }).tap();
  await expect(page.getByRole("region", { name: "End of the trail." }).getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Leave your name")).toHaveValue("PHONE");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await page.getByRole("button", { name: "Play again", exact: true }).tap();
  await expect(left).toBeEnabled();
  await expect(page.getByText("ON THE PRAIRIE", { exact: true })).toBeVisible();
  await context.close();
});
