# E2E Testing Teardown Setup

This document explains the global teardown configuration for e2e tests in the StashTracker project.

## Overview

The teardown process automatically cleans up test data after all e2e tests complete. This ensures a clean state for subsequent test runs and prevents test data from polluting your database.

## Architecture

### Components

1. **Global Teardown Script** (`global-teardown.ts`)
   - Runs once after all tests complete
   - Launches a browser instance to make API calls
   - Calls the cleanup endpoint with the test user email

2. **Cleanup API Endpoint** (`src/pages/api/test/cleanup.ts`)
   - Only available in non-production environments
   - Accepts a POST request with the test user email
   - Deletes all test data associated with that user:
     - Stash transactions
     - Stashes
     - Expenses
     - Budgets

3. **Playwright Configuration** (`playwright.config.ts`)
   - References the global teardown script
   - Loads environment variables from `.env.test`

## Environment Variables

The teardown process requires the following variables in your `.env.test` file:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

# Test User Configuration
TEST_USER_EMAIL=test@example.com

# Playwright Configuration (optional)
PLAYWRIGHT_BASE_URL=http://localhost:4321
```

## How It Works

1. **Test Execution**: All e2e tests run normally
2. **Teardown Trigger**: After all tests complete, Playwright automatically runs the global teardown
3. **Browser Launch**: The teardown script launches a Chromium browser instance
4. **API Call**: It makes a POST request to `/api/test/cleanup` with the test user email
5. **Data Cleanup**: The cleanup endpoint deletes all test data for that user
6. **Logging**: Console output shows what was deleted

## Example Output

```
🧹 Starting global teardown...
📧 Cleaning up test data for user: test@example.com
✅ Cleanup completed successfully: {
  message: 'Cleanup completed successfully',
  deletedStashes: 3,
  deletedExpenses: 12,
  deletedBudgets: 2
}
✨ Global teardown finished
```

## Security

- The cleanup endpoint is **only available in non-production environments**
- It validates the request body using Zod schemas
- It operates only on data belonging to the specified user
- Production deployments will reject cleanup requests with a 403 error

## Running Tests

```bash
# Run all e2e tests with teardown
npm run test:e2e

# Run specific test file
npm run test:e2e -- stashes.spec.ts

# Run with UI mode (teardown still runs after)
npm run test:e2e -- --ui
```

## Troubleshooting

### Teardown Not Running

- Verify `globalTeardown` is configured in `playwright.config.ts`
- Check that the global teardown file path is correct
- Ensure `.env.test` file exists with required variables

### Cleanup Endpoint Not Found

- Verify the API endpoint exists at `src/pages/api/test/cleanup.ts`
- Check that the Astro dev server is running
- Verify `PLAYWRIGHT_BASE_URL` is set correctly

### Test Data Not Deleted

- Check console output for error messages
- Verify `TEST_USER_EMAIL` matches the user created during tests
- Ensure Supabase credentials are correct
- Check that the test user exists in your database

### Production Safety

- The cleanup endpoint will return a 403 error in production
- This is intentional and prevents accidental data deletion
- Only use this endpoint in development/test environments

## Advanced Configuration

### Custom Cleanup Logic

To modify what gets deleted, edit `src/pages/api/test/cleanup.ts`:

```typescript
// Add more deletions as needed
const { error: customError } = await supabase
  .from("custom_table")
  .delete()
  .eq("user_id", userId);
```

### Conditional Teardown

To skip teardown in certain scenarios, modify `tests/e2e/global-teardown.ts`:

```typescript
// Skip teardown if environment variable is set
if (process.env.SKIP_TEARDOWN === "true") {
  console.log("⏭️  Skipping teardown");
  return;
}
```

## Related Documentation

- [Playwright Global Setup/Teardown](https://playwright.dev/docs/test-global-setup-teardown)
- [Astro API Routes](https://docs.astro.build/en/guides/endpoints/)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
