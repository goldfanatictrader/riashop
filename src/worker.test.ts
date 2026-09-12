import { describe, expect, it, vi } from "vitest";
import { app, type Bindings } from "./worker";

const secret = "rahasia-sesi-pengujian-minimal-32-karakter";

function bindings(overrides: Partial<Bindings> = {}): Bindings {
  const statement = {
    first: vi.fn().mockResolvedValue({ value: 1 }),
  };
  return {
    DB: { prepare: vi.fn(() => statement) } as unknown as D1Database,
    FILES: { list: vi.fn().mockResolvedValue({ objects: [], truncated: false, delimitedPrefixes: [] }) } as unknown as R2Bucket,
    ASSETS: { fetch: vi.fn().mockResolvedValue(new Response("asset")) } as unknown as Fetcher,
    OPERATOR_PASSCODE: "2468",
    SESSION_SECRET: secret,
    ...overrides,
  };
}

async function login(env: Bindings): Promise<Response> {
  return app.request(
    "https://ria.test/api/v1/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode: "2468" }),
    },
    env,
  );
}

describe("Worker M0 dan M1", () => {
  it("melakukan probe D1 dan R2 pada health check", async () => {
    const env = bindings();
    const response = await app.request("https://ria.test/api/v1/health", undefined, env);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { status: "ok", database: "ok", storage: "ok" },
    });
    expect(env.DB.prepare).toHaveBeenCalledWith("SELECT 1 AS value");
    expect(env.FILES.list).toHaveBeenCalledWith({ limit: 1 });
    expect(response.headers.get("Content-Security-Policy")).toContain("frame-src 'self' blob:");
    expect(response.headers.get("Content-Security-Policy")).toContain("worker-src 'self'");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("menolak API terlindungi tanpa sesi", async () => {
    const response = await app.request("https://ria.test/api/v1/auth/session", undefined, bindings());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "UNAUTHENTICATED" } });
  });

  it("menolak kode akses yang salah dengan pesan ramah", async () => {
    const response = await app.request(
      "https://ria.test/api/v1/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.1" },
        body: JSON.stringify({ passcode: "0000" }),
      },
      bindings(),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "INVALID_CREDENTIALS" } });
  });

  it("membuat cookie persisten dan menerima sesi yang valid", async () => {
    const env = bindings();
    const loginResponse = await login(env);
    const setCookie = loginResponse.headers.get("Set-Cookie");

    expect(loginResponse.status).toBe(200);
    expect(setCookie).toContain("ria_session=");
    expect(setCookie).toContain("Max-Age=2592000");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");

    const cookie = setCookie?.split(";", 1)[0];
    const sessionResponse = await app.request(
      "https://ria.test/api/v1/auth/session",
      { headers: { Cookie: cookie ?? "" } },
      env,
    );
    expect(sessionResponse.status).toBe(200);
    await expect(sessionResponse.json()).resolves.toMatchObject({ data: { authenticated: true } });
  });

  it("menolak cookie sesi yang diubah", async () => {
    const env = bindings();
    const loginResponse = await login(env);
    const cookie = loginResponse.headers.get("Set-Cookie")?.split(";", 1)[0] ?? "";
    const response = await app.request(
      "https://ria.test/api/v1/auth/session",
      { headers: { Cookie: `${cookie}rusak` } },
      env,
    );

    expect(response.status).toBe(401);
  });

  it("menerapkan middleware sesi ke seluruh API terlindungi", async () => {
    const env = bindings();
    const protectedPaths = [
      "/api/v1/products",
      "/api/v1/customers",
      "/api/v1/invoices",
    ];

    for (const path of protectedPaths) {
      const response = await app.request(`https://ria.test${path}`, undefined, env);
      expect(response.status, path).toBe(401);
      await expect(response.json()).resolves.toMatchObject({ error: { code: "UNAUTHENTICATED" } });
    }
  });

  it("menolak sesi yang sudah melewati masa berlaku", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-09-12T00:00:00.000Z"));
      const env = bindings();
      const loginResponse = await login(env);
      const cookie = loginResponse.headers.get("Set-Cookie")?.split(";", 1)[0] ?? "";

      vi.setSystemTime(new Date("2026-10-13T00:00:00.000Z"));
      const response = await app.request(
        "https://ria.test/api/v1/auth/session",
        { headers: { Cookie: cookie } },
        env,
      );

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({ error: { code: "UNAUTHENTICATED" } });
    } finally {
      vi.useRealTimers();
    }
  });
});
