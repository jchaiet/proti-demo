import { expect, test } from "@playwright/test";

const path = "/visual-fixtures/conditional-form";
const fixtureMode = process.env.PROTI_VISUAL_FIXTURES === "1";

test("conditional form fixture is unavailable without explicit opt-in", async ({
  page,
}) => {
  test.skip(fixtureMode, "Run the route-gating check with fixtures disabled");
  const response = await page.goto(path);
  expect(response?.status()).toBe(404);
});

test("single-page conditions remove hidden required controls and clear old answers", async ({
  page,
}) => {
  test.skip(
    !fixtureMode,
    "Set PROTI_VISUAL_FIXTURES=1 for the isolated form fixture",
  );
  const requests: Array<Record<string, unknown>> = [];
  await page.route("**/api/forms/submit", async (route) => {
    requests.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    });
  });
  const response = await page.goto(path);
  expect(response?.status()).toBe(200);
  const single = page.locator('[data-form-variant="single"]');
  const select = single.getByLabel("Interest");
  await expect(single.getByLabel("Dietary goal")).toHaveCount(0);
  await expect(single.getByLabel("Fitness goal")).toHaveCount(0);

  await select.selectOption("nutrition");
  await expect(single.getByLabel("Dietary goal")).toBeVisible();
  await expect(single.getByLabel("Dietary goal")).toHaveValue("Suggested goal");
  await expect(select).toBeFocused();
  await single.getByLabel("Dietary goal").fill("Private information");

  await select.selectOption("general");
  await expect(single.getByLabel("Dietary goal")).toHaveCount(0);
  await expect(single.getByLabel("Fitness goal")).toHaveCount(0);
  await select.selectOption("nutrition");
  await expect(single.getByLabel("Dietary goal")).toHaveValue("");
  await select.selectOption("general");

  await single.getByRole("button", { name: "Submit" }).click();
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0].fields).toEqual({ interest: "general" });
});

test("multistep conditions follow earlier-step answers after returning and changing selections", async ({
  page,
}) => {
  test.skip(
    !fixtureMode,
    "Set PROTI_VISUAL_FIXTURES=1 for the isolated form fixture",
  );
  const requests: Array<Record<string, unknown>> = [];
  await page.route("**/api/forms/submit", async (route) => {
    requests.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    });
  });
  await page.goto(path);
  const stepped = page.locator('[data-form-variant="stepped"]');
  await stepped.getByLabel("Step interest").selectOption("nutrition");
  await stepped.getByRole("button", { name: "Next" }).click();
  await expect(stepped.getByLabel("Step dietary goal")).toBeVisible();
  await stepped.getByLabel("Step dietary goal").fill("Temporary information");
  await stepped.getByRole("button", { name: "Previous" }).click();
  await stepped.getByLabel("Step interest").selectOption("general");
  await stepped.getByRole("button", { name: "Next" }).click();
  await expect(stepped.getByLabel("Step dietary goal")).toHaveCount(0);
  await stepped.getByRole("button", { name: "Submit" }).click();
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0].fields).toEqual({ step_interest: "general", email: "" });
});
