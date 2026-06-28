import { test, expect } from "@playwright/test";

test.describe("Autenticación TodoStock", () => {
  test("Login exitoso como admin", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1")).toContainText("TodoStock S.A.");

    await page.fill('input[name="email"]', "admin@todostock.com");
    await page.fill('input[name="password"]', "123456");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/api\/clients/);
    await expect(page.locator("body")).toContainText("Clientes");
  });

  test("Login con credenciales inválidas", async ({ page }) => {
    await page.goto("/");

    await page.fill('input[name="email"]', "admin@todostock.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    await expect(page.locator(".alert-danger")).toContainText(
      "Credenciales inválidas",
    );
  });

  test("Logout y redirección al login", async ({ page }) => {
    await page.goto("/");
    await page.fill('input[name="email"]', "admin@todostock.com");
    await page.fill('input[name="password"]', "123456");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/api\/clients/);

    await page.request.post("/api/auth/logout");
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("TodoStock S.A.");

    await page.goto("/api/clients");
    await expect(page).toHaveURL(/\?sessionExpired=true/);
  });

  test("Acceso a ruta protegida sin token redirige al login", async ({
    page,
  }) => {
    await page.goto("/api/clients");
    await expect(page).toHaveURL(/\?sessionExpired=true/);
  });
});
