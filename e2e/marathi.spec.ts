import { expect, test } from "@playwright/test";
import { section5Snapshot } from "@/lib/fixtures/section5";

// The section 5 student (Maharashtra) is offered Marathi on S03 and takes it: the answers carry
// over, every screen reads in Marathi (/mr), and the official rule stays word for word in English.
test.beforeEach(async ({ page }) => {
  const today = new Date().toISOString();
  const snapshot = { ...section5Snapshot, schemes: section5Snapshot.schemes.map((s) => ({ ...s, lastVerifiedAt: today })) };
  await page.route("**/api/rules/latest", (route) => route.fulfill({ json: snapshot }));
});

test("a Maharashtra student switches to Marathi on the state screen", async ({ page, context }) => {
  await page.goto("/check/basics");
  await page.getByLabel("Domicile state").selectOption("MH");
  await page.getByLabel("Annual family income").fill("900000");
  await page.getByRole("group", { name: "Year of study" }).getByRole("button", { name: "1st", exact: true }).click();
  await page.getByLabel("Class 12 (HSC) percentage").fill("88.9");
  await page.getByRole("link", { name: "Continue" }).click();

  await expect(page.getByText("Paatra मराठीतही आहे.")).toBeVisible();
  await page.getByRole("button", { name: "मराठीत वाचा" }).click();
  await expect(page).toHaveURL(/\/mr\/check\/state$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "mr");
  await expect(page.getByRole("heading", { name: /महाराष्ट्र साठी/ })).toBeVisible();
  await page.getByRole("group", { name: "CAP द्वारे प्रवेश" }).getByRole("button", { name: /हो, CAP फेरीतून/ }).click();
  await page.getByRole("link", { name: "माझ्या शिष्यवृत्ती पाहा" }).click();

  await expect(page).toHaveURL(/\/mr\/results$/);
  await expect(page.getByRole("link", { name: "1 अर्ज करू शकता" })).toBeVisible();
  await expect(page.getByRole("link", { name: "2 थोडक्यात हुकले" })).toBeVisible();
  const reliance = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Reliance Foundation UG Scholarship" }) });
  await reliance.getByRole("link", { name: "नियम आणि कागदपत्रे" }).click();

  await expect(page).toHaveURL(/\/mr\/scheme\/reliance-foundation-ug$/);
  // The plain-language reason is in Marathi; the official rule is never translated.
  await expect(page.getByRole("heading", { name: "नियम, आणि तुम्ही ते कसे पूर्ण करता" })).toBeVisible();
  await expect(page.getByText("कुटुंबाचे उत्पन्न ₹15 L पर्यंत")).toBeVisible();
  await expect(page.getByText("Household income under ₹15 lakh")).toBeVisible();

  expect((await context.cookies()).find((c) => c.name === "paatra.lang")?.value).toBe("mr");
});
