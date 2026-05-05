import { test as base, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  throw new Error(
    "E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD missing. Run via `pnpm test:e2e` so dotenv-cli loads .env.test.local.",
  );
}

async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /iniciar sesión/i }).click();
  // After login, the app redirects to "/" which then redirects by role.
  // Admins land on /categories, others on /sales. Wait for any post-login URL.
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 10_000,
  });
}

export const test = base.extend<{ adminPage: Page }>({
  adminPage: async ({ page }, use) => {
    await loginAs(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
    await use(page);
  },
});

export { expect } from "@playwright/test";
