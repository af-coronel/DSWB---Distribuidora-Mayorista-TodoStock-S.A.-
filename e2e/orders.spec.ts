import { test, expect } from "@playwright/test";

const ADMIN = { email: "admin@todostock.com", password: "123456" };

async function login(page) {
  await page.goto("/");
  await page.fill('input[name="email"]', ADMIN.email);
  await page.fill('input[name="password"]', ADMIN.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/api\/clients/);
}

async function seedData(page) {
  const r = page.request;

  const vendorResp = await r.post("/api/vendors", {
    form: {
      cuit: "30123456789", legal_name: "Proveedor E2E S.A.", email: "e2e@proveedor.com",
      phone: "1144445555", legal_address: "Av. E2E 123", vat_condition: "Responsable Inscripto",
      lead_time: "5", category: "Limpieza",
    },
  });
  if (!vendorResp.ok() && vendorResp.status() !== 409) {
    console.log("Error vendor:", await vendorResp.text());
  }

  const clientResp = await r.post("/api/clients", {
    form: {
      cuit: "20123456789", legal_name: "Cliente E2E S.R.L.", email: "e2e@cliente.com",
      phone: "1155556666", legal_address: "Calle E2E 456", vat_condition: "Responsable Inscripto",
      credit_limit: "100000",
    },
  });
  if (!clientResp.ok() && clientResp.status() !== 409) {
    console.log("Error client:", await clientResp.text());
  }

  const prodResp = await r.post("/api/products", {
    form: { name: "Producto E2E", vendor_cuit: "30123456789", vendor_price: "500", customer_price: "800", category: "Limpieza" },
  });
  if (!prodResp.ok() && prodResp.status() !== 409) {
    console.log("Error product:", await prodResp.text());
  }
}

test.describe("Órdenes de Compra", () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await login(page);
    await seedData(page);
    await page.close();
  });

  test("Admin crea orden de compra exitosamente", async ({ page }) => {
    await login(page);
    await page.goto("/api/orders/purchase/new");
    await expect(page.locator("h2")).toContainText("Nueva Orden de Compra");

    const select = page.locator('select[name="items[0][product_id]"]');
    await expect(select).toBeVisible();

    const optionCount = await select.locator('option:not([value=""])').count();
    test.skip(optionCount === 0, "No hay productos con stock para crear orden");

    const firstValue = await select.locator('option:not([value=""])').first().getAttribute("value");
    await select.selectOption(firstValue!);
    await page.locator('input[name="items[0][quantity]"]').fill("5");
    await page.locator('.card-body button[type="submit"]').click();
    await expect(page).toHaveURL(/\/api\/orders/);
  });
});

test.describe("Órdenes de Venta", () => {
  test("Admin crea orden de venta exitosamente", async ({ page }) => {
    await login(page);
    await page.goto("/api/orders/sale/new");
    await expect(page.locator("h2")).toContainText("Nueva Orden de Venta");

    const clientSelect = page.locator('select[name="partner_cuit"]');
    await expect(clientSelect).toBeVisible();

    const clientCount = await clientSelect.locator('option:not([value=""])').count();
    test.skip(clientCount === 0, "No hay clientes activos");

    const firstClient = await clientSelect.locator('option:not([value=""])').first().getAttribute("value");
    await clientSelect.selectOption(firstClient!);

    const productSelect = page.locator('select[name="items[0][product_id]"]');
    const productCount = await productSelect.locator('option:not([value=""])').count();
    test.skip(productCount === 0, "No hay productos con stock");

    const firstProduct = await productSelect.locator('option:not([value=""])').first().getAttribute("value");
    await productSelect.selectOption(firstProduct!);
    await page.locator('input[name="items[0][quantity]"]').fill("1");
    await page.locator('.card-body button[type="submit"]').click();
    await expect(page).toHaveURL(/\/api\/orders\//);
  });
});

test.describe("Acceso por roles", () => {
  const ROLES = [
    { role: "admin", email: "admin@todostock.com", password: "123456" },
    { role: "comercial", email: "comercial@todostock.local", password: "Comercial123!" },
    { role: "inventario", email: "inventario@todostock.local", password: "Inventario123!" },
    { role: "finanzas", email: "finanzas@todostock.local", password: "Finanzas123!" },
  ];

  for (const user of ROLES) {
    test(`${user.role} puede ver formulario de orden de compra`, async ({ page }) => {
      await page.goto("/");
      await page.fill('input[name="email"]', user.email);
      await page.fill('input[name="password"]', user.password);
      await page.click('button[type="submit"]');

      await page.goto("/api/orders/purchase/new");
      await expect(page.locator("h2")).toContainText("Nueva Orden de Compra");
    });

    test(`${user.role} puede ver formulario de orden de venta`, async ({ page }) => {
      await page.goto("/");
      await page.fill('input[name="email"]', user.email);
      await page.fill('input[name="password"]', user.password);
      await page.click('button[type="submit"]');

      await page.goto("/api/orders/sale/new");
      await expect(page.locator("h2")).toContainText("Nueva Orden de Venta");
    });
  }
});
