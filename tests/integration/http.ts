const BASE = process.env.AFOS_BASE_URL ?? "http://127.0.0.1:3000";

function extractAfosSession(setCookie: string | null) {
  if (!setCookie) return null;

  // Can be single header or comma-joined; find the afos_session pair anywhere
  const m = setCookie.match(/afos_session=[^;]+/);
  return m ? m[0] : null;
}

let _cachedCookie: string | null = null;

export async function loginAsSeedAdmin() {
  const EMAIL = process.env.SEED_ADMIN_EMAIL ?? "stella.trusova@gmail.com";
  const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? ""; if (!PASSWORD) throw new Error("SEED_ADMIN_PASSWORD missing");

  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  const text = await res.text();
  const setCookie = res.headers.get("set-cookie");
  const cookie = extractAfosSession(setCookie);

  // one-time debug
  if (process.env.TEST_DEBUG === "1") {
    // eslint-disable-next-line no-console
    console.log("LOGIN_DEBUG:", {
      status: res.status,
      hasSetCookie: !!setCookie,
      setCookieSample: setCookie ? setCookie.slice(0, 120) : null,
      cookieParsed: cookie ? cookie.slice(0, 40) : null,
      email: EMAIL,
      base: BASE,
    });
  }

  return { res, text, cookie, BASE };
}

export async function authedFetch(path: string, init: RequestInit = {}) {
  if (!_cachedCookie) {
    const login = await loginAsSeedAdmin();
    _cachedCookie = login.cookie;
    if (!_cachedCookie) {
      return { res: new Response(null, { status: login.res.status || 401 }), json: null, text: login.text };
    }
  }

  const headers = new Headers(init.headers as any);
  headers.set("Cookie", _cachedCookie);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const txt = await res.text();
  let json: any = null;
  try { json = txt ? JSON.parse(txt) : null; } catch {}
  return { res, json, text: txt };
}
