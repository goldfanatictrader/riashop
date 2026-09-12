import { FormEvent, useEffect, useState } from "react";
import { CustomerScreen } from "../features/customers/CustomerScreen";
import { ProductScreen } from "../features/products/ProductScreen";

type View = "loading" | "login" | "home" | "products" | "customers";

interface ApiError {
  error?: { message?: string };
}

const actions = [
  {
    key: "invoice",
    title: "Buat Nota",
    description: "Buat nota baru untuk customer",
    icon: "▤",
    primary: true,
  },
  {
    key: "products",
    title: "Daftar Barang",
    description: "Lihat dan kelola barang",
    icon: "□",
    primary: false,
  },
  {
    key: "history",
    title: "Nota Sebelumnya",
    description: "Buka kembali nota lama",
    icon: "◷",
    primary: false,
  },
] as const;

async function getErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => ({})) as ApiError;
  return body.error?.message ?? fallback;
}

export function App() {
  const [view, setView] = useState<View>("loading");
  const [passcode, setPasscode] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/v1/auth/session", { credentials: "include" })
      .then((response) => {
        if (active) setView(response.ok ? "home" : "login");
      })
      .catch(() => {
        if (active) {
          setMessage("Koneksi bermasalah. Periksa internet lalu coba lagi.");
          setView("login");
        }
      });
    return () => { active = false; };
  }, []);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (!response.ok) {
        setMessage(await getErrorMessage(response, "Belum bisa masuk. Silakan coba lagi."));
        return;
      }
      setPasscode("");
      setView("home");
    } catch {
      setMessage("Koneksi bermasalah. Periksa internet lalu coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    setMessage("");
    try {
      const response = await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
      if (!response.ok) {
        setMessage(await getErrorMessage(response, "Belum bisa keluar. Silakan coba lagi."));
        return;
      }
      setView("login");
    } catch {
      setMessage("Koneksi bermasalah. Silakan coba lagi.");
    }
  }

  if (view === "products") return <ProductScreen onBack={() => setView("home")} />;
  if (view === "customers") return <CustomerScreen onBack={() => setView("home")} />;

  if (view === "loading") {
    return <main className="centered"><p className="status" role="status">Membuka Ria Noel Shop…</p></main>;
  }

  if (view === "login") {
    return (
      <main className="centered login-page">
        <section className="login-card" aria-labelledby="login-title">
          <Brand />
          <h1 id="login-title">Selamat datang</h1>
          <p className="lead">Masukkan kode akses untuk membuka Ria Noel Shop.</p>
          <form onSubmit={login}>
            <label htmlFor="passcode">Kode akses</label>
            <input
              id="passcode"
              name="passcode"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              minLength={4}
              maxLength={128}
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              required
            />
            {message && <p className="error" role="alert">{message}</p>}
            <button className="button primary" type="submit" disabled={submitting}>
              {submitting ? "Membuka…" : "Buka Aplikasi"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <Brand />
        <button className="text-button" type="button" onClick={logout}>Keluar</button>
      </header>
      <section aria-labelledby="home-title">
        <p className="eyebrow">Beranda</p>
        <h1 id="home-title">Selamat datang</h1>
        <p className="lead">Apa yang ingin dibuat hari ini?</p>
      </section>
      <section className="action-grid" aria-label="Menu utama">
        {actions.map((action) => (
          <button
            key={action.key}
            className={`action-card${action.primary ? " action-card-primary" : ""}`}
            type="button"
            onClick={() => action.key === "products" ? setView("products") : setMessage(`${action.title} akan tersedia pada tahap berikutnya.`)}
          >
            <span className="action-icon" aria-hidden="true">{action.icon}</span>
            <span className="action-copy">
              <strong>{action.title}</strong>
              <small>{action.description}</small>
            </span>
            <span className="action-arrow" aria-hidden="true">›</span>
          </button>
        ))}
      </section>
      <button className="customer-menu-button" type="button" onClick={() => setView("customers")}>
        <strong>Daftar Customer</strong><span>Kelola nama dan nomor WhatsApp</span>
      </button>
      {message && <p className="notice" role="status">{message}</p>}
      <p className="help">Pilih salah satu menu di atas untuk mulai bekerja.</p>
    </main>
  );
}

function Brand() {
  return (
    <div className="brand" aria-label="Ria Noel Shop">
      <span className="brand-mark" aria-hidden="true">R</span>
      <span><strong>Ria Noel</strong><small>Shop</small></span>
    </div>
  );
}
