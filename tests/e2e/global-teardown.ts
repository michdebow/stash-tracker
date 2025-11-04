import { chromium } from "@playwright/test";
import type { FullConfig } from "@playwright/test";
import path from "node:path";
import dotenv from "dotenv";

// Load environment variables from .env.test
dotenv.config({ path: path.resolve(process.cwd(), ".env.test"), debug: true });

async function globalTeardown(config: FullConfig) {
  console.log("\n🧹 Starting global teardown...");

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const testUserEmail = process.env.E2E_TEST_USER_EMAIL;

  if (!supabaseUrl || !supabaseKey || !testUserEmail) {
    console.warn("⚠️  Missing environment variables for teardown. Skipping cleanup.");
    return;
  }

  try {
    // Launch browser for cleanup operations if needed
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log(`📧 Cleaning up test data for user: ${testUserEmail}`);

    // Call API endpoint to clean up test data
    const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4321";
    const response = await page.request.post(`${baseURL}/api/test/cleanup`, {
      data: {
        email: testUserEmail,
      },
    });

    if (response.ok()) {
      const result = await response.json();
      console.log("✅ Cleanup completed successfully:", result);
    } else {
      console.warn(`⚠️  Cleanup API returned status ${response.status()}`);
    }

    await context.close();
    await browser.close();
  } catch (error) {
    console.error("❌ Error during teardown:", error);
    // Don't throw - we don't want teardown failures to fail the test run
  }

  console.log("✨ Global teardown finished\n");
}

export default globalTeardown;
