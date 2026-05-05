import { test, expect } from "./fixtures";

test.describe("Sale flow (admin)", () => {
  test("login redirects out of /login", async ({ adminPage }) => {
    await expect(adminPage).not.toHaveURL(/\/login/);
  });

  test("crear venta de Mesa con un producto y pago Efectivo", async ({
    adminPage,
  }) => {
    await adminPage.goto("/sales");

    // Open the SaleForm via FAB or "Registrar Venta" header button
    const openFormBtn = adminPage
      .getByRole("button", { name: /registrar venta/i })
      .first();
    await openFormBtn.click();

    // Order type "Mesa" is the default; just fill the table number
    await adminPage.locator('input[type="number"]').first().fill("1");

    // Search a product by name. We assume a seeded product exists named "Latte"
    // (seed step required — see e2e README).
    await adminPage.getByPlaceholder(/buscar producto/i).fill("Latte");
    await adminPage.getByText(/^latte$/i).first().click();

    // Quantity defaults to 1, click Agregar
    await adminPage.getByRole("button", { name: /^agregar$/i }).click();

    // Submit
    await adminPage
      .getByRole("button", { name: /registrar venta/i })
      .last()
      .click();

    // Form closes; the new sale should appear in the list
    await expect(adminPage.getByText(/Latte/i).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("marcar venta como entregada en /pedidos", async ({ adminPage }) => {
    test.fixme(true, "TODO: depende del test anterior creando una venta");
  });

  test("editar venta con item Entregado preserva su estado (regresión bug)", async ({
    adminPage,
  }) => {
    test.fixme(
      true,
      "TODO: contrato del fix 07f4486 — items Entregado no se resetean al editar",
    );
  });

  test("eliminar venta llama RPC delete_sale_transactions", async ({
    adminPage,
  }) => {
    test.fixme(true, "TODO: validar happy path de deleteSale + audit");
  });
});
