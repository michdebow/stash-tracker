export const testUsers = {
  valid: {
    email: process.env.E2E_TEST_USER_EMAIL ?? "test@testersen.xyz",
    password: process.env.E2E_TEST_USER_PASSWORD ?? "test1234$!",
  },
  invalid: {
    email: "nonexistent@example.com",
    password: "WrongPass123!",
  },
};
