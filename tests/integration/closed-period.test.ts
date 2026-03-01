import { describe, it, expect } from "vitest";
import { authedFetch } from "./http";

describe("Billing period enforcement (integration)", () => {
  it("rejects payment creation in a closed period (409)", async () => {
    const YEAR = 2026;
    const CLOSED_MONTH = 1;

    const billing = await authedFetch(`/api/billing?year=${YEAR}&month=${CLOSED_MONTH}`);
    expect(billing.res.status).toBe(200);
    expect(billing.json?.isClosed).toBe(true);

    const res = await authedFetch("/api/payments", {
      method: "POST",
      body: JSON.stringify({
        clientId: 1,
        amount: 123,
        method: "CASH",
        year: YEAR,
        month: CLOSED_MONTH,
      }),
    });

    expect(res.res.status).toBe(409);
  });

  it("allows payment creation in an open period (201 or 200)", async () => {
    const YEAR = 2026;
    const OPEN_MONTH = 2;

    const billing = await authedFetch(`/api/billing?year=${YEAR}&month=${OPEN_MONTH}`);
    expect(billing.res.status).toBe(200);
    expect(billing.json?.isClosed).toBe(false);

    const res = await authedFetch("/api/payments", {
      method: "POST",
      body: JSON.stringify({
        clientId: 1,
        amount: 456,
        method: "CASH",
        year: YEAR,
        month: OPEN_MONTH,
      }),
    });

    expect([200, 201]).toContain(res.res.status);
  });
});
