import { describe, it, expect } from "vitest";
import { prisma } from "../../lib/prisma";

const BASE = process.env.AFOS_BASE_URL ?? "http://127.0.0.1:3000";

async function postJson(path: string, body: any) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { res, text, json };
}

describe("First user bootstrap", () => {
  it("makes the first registered user ADMIN", async () => {
    await prisma.user.deleteMany();

    const reg = await postJson("/api/auth/register", {
      email: "owner@firm.test",
      password: "password123",
    });

    expect(reg.res.status).toBe(201);

    const u = await prisma.user.findUnique({ where: { email: "owner@firm.test" } });
    expect(u?.role).toBe("ADMIN");
  });

  it("makes subsequent registered users ACCOUNTANT", async () => {
    await prisma.user.deleteMany();

    // first becomes ADMIN
    await postJson("/api/auth/register", {
      email: "owner2@firm.test",
      password: "password123",
    });

    // second should become ACCOUNTANT
    const reg2 = await postJson("/api/auth/register", {
      email: "staff@firm.test",
      password: "password123",
    });

    expect(reg2.res.status).toBe(201);

    const u2 = await prisma.user.findUnique({ where: { email: "staff@firm.test" } });
    expect(u2?.role).toBe("ACCOUNTANT");
  });
});
