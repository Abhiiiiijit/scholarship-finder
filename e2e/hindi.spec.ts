import { expect, test } from "@playwright/test";
import { section5Snapshot } from "@/lib/fixtures/section5";

// The same student in Hindi (/hi): every screen reads in Hindi, the official rule stays word for
// word in English, and the language picked on this phone is remembered.
test.beforeEach(async ({ page }) => {
  const today = new Date().toISOString();
  const snapshot = { ...section5Snapshot, schemes: section5Snapshot.schemes.map((s) => ({ ...s, lastVerifiedAt: today })) };
  await page.route("**/api/rules/latest", (route) => route.fulfill({ json: snapshot }));
});

test("a student switches to Hindi and checks their eligibility", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "हिन्दी" }).click();
  await expect(page).toHaveURL(/\/hi$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await page.getByRole("link", { name: "मेरी पात्रता देखें" }).click();

  await expect(page.getByRole("heading", { name: "आपके बारे में" })).toBeVisible();
  await page.getByLabel("मूल निवास राज्य (डोमिसाइल)").selectOption("MH");
  await page.getByLabel("परिवार की सालाना आय").fill("900000");
  await page.getByRole("group", { name: "पढ़ाई का साल" }).getByRole("button", { name: "पहला", exact: true }).click();
  await page.getByLabel("कक्षा 12 (HSC) प्रतिशत").fill("88.9");
  await page.getByRole("link", { name: "आगे बढ़ें" }).click();

  await expect(page).toHaveURL(/\/hi\/check\/state$/);
  await expect(page.getByRole("heading", { name: /महाराष्ट्र के लिए/ })).toBeVisible();
  await page.getByRole("group", { name: "CAP से एडमिशन" }).getByRole("button", { name: /हाँ, CAP राउंड से/ }).click();
  await page.getByRole("link", { name: "मेरी स्कॉलरशिप देखें" }).click();

  await expect(page).toHaveURL(/\/hi\/results$/);
  await expect(page.getByRole("link", { name: "1 आवेदन कर सकते हैं" })).toBeVisible();
  await expect(page.getByRole("link", { name: "2 थोड़े से चूके" })).toBeVisible();
  const reliance = page.getByRole("article").filter({ has: page.getByRole("heading", { name: "Reliance Foundation UG Scholarship" }) });
  await reliance.getByRole("link", { name: "नियम और दस्तावेज़" }).click();

  await expect(page).toHaveURL(/\/hi\/scheme\/reliance-foundation-ug$/);
  // The plain-language reason is in Hindi; the official rule is never translated.
  await expect(page.getByRole("heading", { name: "नियम, और आप उनसे कैसे मेल खाते हैं" })).toBeVisible();
  await expect(page.getByText("परिवार की आय ₹15 L तक")).toBeVisible();
  await expect(page.getByText("Household income under ₹15 lakh")).toBeVisible();

  // The pick is remembered: an English link on this phone opens in Hindi.
  expect((await context.cookies()).find((c) => c.name === "paatra.lang")?.value).toBe("hi");
  await page.goto("/results");
  await expect(page).toHaveURL(/\/hi\/results$/);

  // And switching back to English sticks too.
  await page.getByRole("button", { name: "English" }).click();
  await expect(page).toHaveURL(/\/results$/);
  await expect(page.getByRole("heading", { name: "Your scholarships" })).toBeVisible();
});
