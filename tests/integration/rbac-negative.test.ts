import { describe, it, expect } from "vitest"

const BASE = "http://localhost:3000"

describe("RBAC Enforcement", () => {
  it("returns 403 when unauthorized user attempts to create payment", async () => {
    const res = await fetch(`${BASE}/api/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        clientId: 1,
        amount: 1000,
        method: "CASH"
      })
    })

    expect(res.status).toBe(401)
  })
})
