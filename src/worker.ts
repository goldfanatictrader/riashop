import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { customerRoutes } from "./features/customers/api/customerRoutes";
import { invoiceRoutes } from "./features/invoicing/server";
import { productRoutes } from "./features/products/api/productRoutes";

export interface Bindings {
  DB: D1Database;
  FILES: R2Bucket;
  ASSETS: Fetcher;
  OPERATOR_PASSCODE: string;
  SESSION_SECRET: string;
}

interface Variables {
  sessionExpiresAt: number;
}

const SESSION_COOKIE = "ria_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;
const loginFailures = new Map<string, { count: number; resetAt: number }>();

const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function safeEqual(left: string, right: string): Promise<boolean> {
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

async function createSession(secret: string): Promise<{ token: string; expiresAt: number }> {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const nonce = crypto.randomUUID();
  const payload = `v1.${expiresAt}.${nonce}`;
  const signature = await hmac(payload, secret);
  return { token: `${payload}.${signature}`, expiresAt };
}

async function verifySession(token: string | undefined, secret: string): Promise<number | null> {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;

  const [version, rawExpiresAt, nonce, suppliedSignature] = parts;
  const expiresAt = Number(rawExpiresAt);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return null;

  const expectedSignature = await hmac(`${version}.${rawExpiresAt}.${nonce}`, secret);
  return (await safeEqual(suppliedSignature, expectedSignature)) ? expiresAt : null;
}

function requestKey(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ?? "local";
}

function isRateLimited(key: string): boolean {
  const current = loginFailures.get(key);
  if (!current) return false;
  if (current.resetAt <= Date.now()) {
    loginFailures.delete(key);
    return false;
  }
  return current.count >= LOGIN_MAX_FAILURES;
}

function recordLoginFailure(key: string): void {
  const current = loginFailures.get(key);
  if (!current || current.resetAt <= Date.now()) {
    loginFailures.set(key, { count: 1, resetAt: Date.now() + LOGIN_WINDOW_MS });
    return;
  }
  current.count += 1;
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  return origin === new URL(request.url).origin;
}

export const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", async (c, next) => {
  await next();
  c.header("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; font-src 'self'; frame-src 'self' blob:; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
});

app.use("/api/v1/*", async (c, next) => {
  const publicPath = c.req.path === "/api/v1/health" || c.req.path === "/api/v1/auth/login";
  if (publicPath) return next();

  const expiresAt = await verifySession(getCookie(c, SESSION_COOKIE), c.env.SESSION_SECRET);
  if (!expiresAt) {
    return c.json(
      { error: { code: "UNAUTHENTICATED", message: "Sesi Anda sudah berakhir. Silakan masuk lagi." } },
      401,
    );
  }
  c.set("sessionExpiresAt", expiresAt);
  return next();
});

app.get("/api/v1/health", async (c) => {
  try {
    const result = await c.env.DB.prepare("SELECT 1 AS value").first<{ value: number }>();
    if (result?.value !== 1) throw new Error("D1 probe returned an unexpected result");
    await c.env.FILES.list({ limit: 1 });
    return c.json({ data: { status: "ok", database: "ok", storage: "ok" } });
  } catch {
    return c.json(
      { error: { code: "SERVICE_UNAVAILABLE", message: "Layanan belum siap. Silakan coba lagi." } },
      503,
    );
  }
});

app.post("/api/v1/auth/login", async (c) => {
  if (!sameOrigin(c.req.raw)) {
    return c.json({ error: { code: "FORBIDDEN", message: "Permintaan tidak diizinkan." } }, 403);
  }
  if (!c.env.OPERATOR_PASSCODE || !c.env.SESSION_SECRET || c.env.SESSION_SECRET.length < 32) {
    return c.json(
      { error: { code: "AUTH_NOT_CONFIGURED", message: "Akses masuk belum dikonfigurasi." } },
      503,
    );
  }

  const key = requestKey(c.req.raw);
  if (isRateLimited(key)) {
    return c.json(
      { error: { code: "TOO_MANY_ATTEMPTS", message: "Terlalu banyak percobaan. Tunggu 15 menit lalu coba lagi." } },
      429,
    );
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Kode akses wajib diisi." } }, 400);
  }
  const passcode = typeof body === "object" && body !== null && "passcode" in body
    ? (body as { passcode?: unknown }).passcode
    : undefined;
  if (typeof passcode !== "string" || passcode.length < 4 || passcode.length > 128) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "Masukkan kode akses yang benar." } }, 400);
  }

  if (!(await safeEqual(passcode, c.env.OPERATOR_PASSCODE))) {
    recordLoginFailure(key);
    return c.json({ error: { code: "INVALID_CREDENTIALS", message: "Kode akses belum benar. Coba lagi." } }, 401);
  }
  loginFailures.delete(key);

  const session = await createSession(c.env.SESSION_SECRET);
  setCookie(c, SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return c.json({ data: { authenticated: true, expiresAt: session.expiresAt } });
});

app.get("/api/v1/auth/session", (c) =>
  c.json({ data: { authenticated: true, expiresAt: c.get("sessionExpiresAt") } }),
);

app.post("/api/v1/auth/logout", (c) => {
  if (!sameOrigin(c.req.raw)) {
    return c.json({ error: { code: "FORBIDDEN", message: "Permintaan tidak diizinkan." } }, 403);
  }
  deleteCookie(c, SESSION_COOKIE, { path: "/", secure: true, sameSite: "Lax" });
  return c.body(null, 204);
});

app.route("/", invoiceRoutes);
app.route("/api/v1/products", productRoutes);
app.route("/api/v1/customers", customerRoutes);

app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json({ error: { code: "NOT_FOUND", message: "Alamat API tidak ditemukan." } }, 404);
  }
  return c.env.ASSETS.fetch(c.req.raw);
});

app.onError((error, c) => {
  console.error("Unhandled request error", error.name);
  return c.json({ error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan. Silakan coba lagi." } }, 500);
});

export default app;
