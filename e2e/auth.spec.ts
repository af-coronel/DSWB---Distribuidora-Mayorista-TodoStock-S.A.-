import { test, expect } from "@playwright/test";

const USERS = [
  { role: "admin", email: "admin@todostock.com", password: "123456", landing: "/api/clients" },
  { role: "comercial", email: "comercial@todostock.local", password: "Comercial123!", landing: "/api/clients" },
  { role: "inventario", email: "inventario@todostock.local", password: "Inventario123!", landing: "/api/inventory" },
  { role: "finanzas", email: "finanzas@todostock.local", password: "Finanzas123!", landing: "/api/transactions?type=PAYMENT" },
] as const;

async function loginAs(page, email: string, password: string) {
  await page.goto("/");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
}

test.describe("Autenticación TodoStock", () => {
  for (const user of USERS) {
    test(`Login exitoso como ${user.role} redirige a ${user.landing}`, async ({ page }) => {
      await loginAs(page, user.email, user.password);
      await expect(page).toHaveURL(new RegExp(user.landing.replace("?", "\\?")));
    });
  }

  test("Login con credenciales inválidas", async ({ page }) => {
    await loginAs(page, "admin@todostock.com", "wrongpassword");
    await expect(page.locator(".alert-danger")).toContainText("Credenciales inválidas");
  });

  test("Logout y redirección al login", async ({ page }) => {
    await loginAs(page, "admin@todostock.com", "123456");
    await expect(page).toHaveURL(/\/api\/clients/);

    await page.request.post("/api/auth/logout");
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("TodoStock S.A.");

    await page.goto("/api/clients");
    await expect(page).toHaveURL(/\?sessionExpired=true/);
  });

  test("Acceso a ruta protegida sin token redirige al login", async ({ page }) => {
    await page.goto("/api/clients");
    await expect(page).toHaveURL(/\?sessionExpired=true/);
  });
});
