import { defineConfig, devices } from "@playwright/test";

// The student happy path on a phone-sized and a laptop-sized Chromium. The test serves its own snapshot,
// so no database is needed: run `npm run build` first, then `npm run e2e`.
export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"] } },
    // The same path on a laptop, where results, forms and the scheme page use two or three columns.
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: { command: "npm run start -- --port 3100", url: "http://localhost:3100", reuseExistingServer: !process.env.CI },
});
