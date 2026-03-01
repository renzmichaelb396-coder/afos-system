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

    expect(first.res.status).toBe(200);
    expect(second.res.status).toBe(200);

    expect(first.json?.id).toBeTruthy();
    expect(first.json?.id).toBe(second.json?.id);
  });
});
