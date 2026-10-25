import { expect, test } from "@playwright/test";
import { section5Snapshot } from "@/lib/fixtures/section5";

// S01 → S02 → S03 → results → scheme page for the PRD section 5 student (Maharashtra, ₹9 L, year 1, 88.9%).
// Schemes are stamped as verified today so the 90-day filter never hides them.
test.beforeEach(async ({ page }) => {
  const today = new Date().toISOString();
  const snapshot = { ...section5Snapshot, schemes: section5Snapshot.schemes.map((s) => ({ ...s, lastVerifiedAt: today })) };
  await page.route("**/api/rules/latest", (route) => route.fulfill({ json: snapshot }));
});

test("a student checks their eligibility and reads a scheme's rules", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Check my eligibility" }).click();

  await expect(page.getByRole("heading", { name: "About you" })).toBeVisible();
  await page.getByLabel("Domicile state").selectOption("MH");
  await page.getByLabel("Annual family income").fill("900000");
  await page.getByRole("group", { name: "Year of study" }).getByRole("button", { name: "1st", exact: true }).click();
  await page.getByLabel("Class 12 (HSC) percentage").fill("88.9");
  await page.getByRole("link", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: /for Maharashtra/ })).toBeVisible();
  await page.getByRole("group", { name: "Admitted through CAP" }).getByRole("button", { name: /Yes, through CAP/ }).click();
  await page.getByRole("link", { name: "See my scholarships" }).click();

  await expect(page).toHaveURL(/\/results$/);
  // PRD section 5: Reliance fits; income ₹9 L is just over two ₹8 L limits.
  await expect(page.getByRole("link", { name: "1 can apply" })).toBeVisible();
  await expect(page.getByRole("link", { name: "2 near misses" })).toBeVisible();
  const reliance = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Reliance Foundation UG Scholarship" }) });
  await expect(reliance.getByText("Eligible to apply")).toBeVisible();
  await reliance.getByRole("link", { name: "Rules and documents" }).click();

  await expect(page.getByRole("heading", { name: "Reliance Foundation UG Scholarship" })).toBeVisible();
  // Every rule is shown word for word from the source.
  await expect(page.getByText("Household income under ₹15 lakh")).toBeVisible();

  // Answers stayed on the phone.
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("paatra.answers.v1") ?? "{}"));
  expect(saved).toMatchObject({ domicile_state: "MH", family_income: 900000, year: "1", class12_pct: 88.9 });
});
