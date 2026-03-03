import { describe, it, expect } from "vitest";
import { authedFetch } from "./http";

describe("Payment Idempotency", () => {
  it("replays same Idempotency-Key without duplicating payment", async () => {
    const key = "test-idem-123";

    const payload = { clientId: 1, amount: 1000, method: "CASH" };

    const first = await authedFetch("/api/payments", {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: JSON.stringify(payload),
    });

    const second = await authedFetch("/api/payments", {
      method: "POST",
      headers: { "Idempotency-Key": key },
      body: JSON.stringify(payload),
    });

    // First creation returns 201; replay returns 200
    expect([200, 201]).toContain(first.res.status);
    expect([200, 201]).toContain(second.res.status);

    // Payment ID is nested under .payment
    const firstId = first.json?.payment?.id ?? first.json?.id;
    const secondId = second.json?.payment?.id ?? second.json?.id;
    expect(firstId).toBeTruthy();
    expect(firstId).toBe(secondId);
  });
});
