import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(process.cwd(), ".env.test"), debug: false });
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60 * 1000,
  expect: {
    timeout: 5 * 1000,
  },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: 3,
  reporter: process.env.CI ? [["github"], ["html"]] : "list",
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4321",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev:e2e -- --host --port 4321",
    url: "http://localhost:4321",
    reuseExistingServer: !process.env.CI,
  },
  globalTeardown: path.join(__dirname, "./tests/e2e/global-teardown.ts"),
});
