import { chromium } from "@playwright/test";
import path from "node:path";
import dotenv from "dotenv";

// Load environment variables from .env.test
dotenv.config({ path: path.resolve(process.cwd(), ".env.test"), debug: true });

async function globalTeardown() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const testUserEmail = process.env.E2E_TEST_USER_EMAIL;

  if (!supabaseUrl || !supabaseKey || !testUserEmail) {
    return;
  }

  //prettier-ignore
  try {
    // Launch browser for cleanup operations if needed
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Call API endpoint to clean up test data
    const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4321";
    await page.request.post(`${baseURL}/api/test/cleanup`, {
      data: {
        email: testUserEmail,
      },
    });

    await context.close();
    await browser.close();
  }
   
  catch (e) {
    // Don't throw - we don't want teardown failures to fail the test run
  }
}

export default globalTeardown;
