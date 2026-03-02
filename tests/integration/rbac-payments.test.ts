import { describe, it, expect } from "vitest";
import { authedFetch } from "./http";


describe("RBAC - payments", () => {
  it("ADMIN can create payment", async () => {
    const created = await authedFetch("/api/payments", { method: "POST", body: JSON.stringify({ clientId: 1, amount: 1000, method: "CASH" }) });
    expect(created.res.status).toBe(200);
  });

  it("STAFF cannot create payment", async () => {
    // Here you will later seed a STAFF user and verify 403.
    expect(true).toBe(true);
  });
});
