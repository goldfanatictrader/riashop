import { FormEvent, lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  archivePdf, cancelInvoice, createCustomer, finalizeInvoice, getInvoice, listCustomers, listInvoices, listProducts,
} from "./api";
import type { FinalizedInvoice, InvoiceCustomer, InvoiceListItem, InvoiceProduct } from "./domain";
import { calculateTotals, formatRupiah } from "./domain";

const DRAFT_KEY = "ria-noel-invoice-draft-v1";

const PdfPreview = lazy(() => import("./PdfPreview").then((module) => ({ default: module.PdfPreview })));

export type InvoiceRoute = "/invoice/new" | "/invoices" | `/invoices/${string}`;

interface DraftLine { product: InvoiceProduct; quantity: number }
interface Draft {
  customer: InvoiceCustomer | null;
  invoiceDate: string;
  discountRupiah: number;
  shippingRupiah: number;
  lines: DraftLine[];
}

function emptyDraft(): Draft {
  return { customer: null, invoiceDate: new Date().toISOString().slice(0, 10), discountRupiah: 0, shippingRupiah: 0, lines: [] };
}

function readDraft(): Draft {
  try {
    const parsed = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null") as Partial<Draft> | null;
    if (!parsed || !Array.isArray(parsed.lines)) return emptyDraft();
    return {
      customer: parsed.customer ?? null,
      invoiceDate: typeof parsed.invoiceDate === "string" ? parsed.invoiceDate : emptyDraft().invoiceDate,
      discountRupiah: Number.isSafeInteger(parsed.discountRupiah) ? parsed.discountRupiah as number : 0,
      shippingRupiah: Number.isSafeInteger(parsed.shippingRupiah) ? parsed.shippingRupiah as number : 0,
      lines: parsed.lines.filter((line): line is DraftLine => Boolean(line?.product?.id && Number(line.quantity) > 0)),
    };
  } catch {
    return emptyDraft();
  }
}

function useLoad<T>(loader: (dependency: string) => Promise<T>, dependency: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);
  useEffect(() => {
    let active = true;
    loader(dependency).then((result) => { if (active) { setData(result); setError(""); } })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Data belum dapat dimuat."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [dependency, loader, reloadCount]);
  function reload() { setLoading(true); setError(""); setReloadCount((value) => value + 1); }
  return { data, setData, error, loading, reload };
}

export function Invoicing({ route, navigate }: { route: InvoiceRoute; navigate: (route: string) => void }) {
  if (route === "/invoice/new") return <InvoiceEditor navigate={navigate} />;
  if (route === "/invoices") return <InvoiceHistory navigate={navigate} />;
  return <InvoiceDetail id={route.slice("/invoices/".length)} navigate={navigate} />;
}

function PageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="page-header">
      <button className="secondary-button compact" type="button" onClick={onBack}>‹ Kembali</button>
      <h1>{title}</h1>
    </header>
  );
}

function InvoiceEditor({ navigate }: { navigate: (route: string) => void }) {
  const [draft, setDraft] = useState(readDraft);
  const [customerPicker, setCustomerPicker] = useState(false);
  const [productPicker, setProductPicker] = useState(false);
  const [result, setResult] = useState<FinalizedInvoice | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); }, [draft]);
  const totals = useMemo(() => calculateTotals(draft.lines.map((line) => ({
    unitPriceRupiah: line.product.priceRupiah, quantity: line.quantity,
  })), draft.discountRupiah, draft.shippingRupiah), [draft]);

  function addProduct(product: InvoiceProduct) {
    setDraft((current) => ({
      ...current,
      lines: current.lines.some((line) => line.product.id === product.id)
        ? current.lines
        : [...current.lines, { product, quantity: 1 }],
    }));
    setProductPicker(false);
  }

  function changeQuantity(productId: string, quantity: number) {
    if (quantity <= 0) return;
    setDraft((current) => ({ ...current, lines: current.lines.map((line) => line.product.id === productId ? { ...line, quantity } : line) }));
  }

  async function submit() {
    if (!navigator.onLine) { setError("Koneksi terputus. Nota belum tersimpan; draft tetap aman di perangkat ini."); return; }
    if (!draft.customer) { setError("Pilih customer terlebih dahulu."); return; }
    if (!draft.lines.length) { setError("Pilih minimal satu barang."); return; }
    setError("");
    setSubmitting(true);
    try {
      const invoice = await finalizeInvoice({
        customerId: draft.customer.id, invoiceDate: draft.invoiceDate,
        discountRupiah: draft.discountRupiah, shippingRupiah: draft.shippingRupiah,
        items: draft.lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
      });
      setResult(invoice);
      localStorage.removeItem(DRAFT_KEY);
      setDraft(emptyDraft());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nota belum tersimpan. Silakan coba lagi.");
    } finally { setSubmitting(false); }
  }

  if (result) return <InvoiceSuccess invoice={result} navigate={navigate} />;
  if (customerPicker) return <CustomerPicker selected={draft.customer} onSelect={(customer) => {
    setDraft((current) => ({ ...current, customer })); setCustomerPicker(false);
  }} onBack={() => setCustomerPicker(false)} />;
  if (productPicker) return <ProductPicker selected={new Set(draft.lines.map((line) => line.product.id))} onSelect={addProduct} onBack={() => setProductPicker(false)} />;

  return (
    <main className="app-shell invoice-page">
      <PageHeader title="Buat Nota" onBack={() => navigate("/")} />
      <section className="form-section" aria-labelledby="customer-title">
        <h2 id="customer-title">Customer</h2>
        <button className="picker-button" type="button" onClick={() => setCustomerPicker(true)}>
          <span><strong>{draft.customer?.name ?? "Pilih customer"}</strong><small>{draft.customer?.whatsappNumber ?? "Cari atau tambah customer"}</small></span><span>›</span>
        </button>
      </section>
      <section className="form-section" aria-labelledby="items-title">
        <div className="section-heading"><h2 id="items-title">Barang</h2><button className="secondary-button" type="button" onClick={() => setProductPicker(true)}>+ Tambah Barang</button></div>
        {!draft.lines.length && <p className="empty-state">Belum ada barang. Tambahkan barang agar bisa membuat nota.</p>}
        <div className="invoice-lines">
          {draft.lines.map((line) => (
            <article className="invoice-line" key={line.product.id}>
              <div><h3>{line.product.name}</h3><p>{line.product.variant || "Tanpa varian"} · {formatRupiah(line.product.priceRupiah)}/{line.product.unitLabel}</p></div>
              <div className="line-controls">
                <div className="stepper" aria-label={`Jumlah ${line.product.name}`}>
                  <button type="button" onClick={() => changeQuantity(line.product.id, line.quantity - 1)} aria-label={`Kurangi ${line.product.name}`}>−</button>
                  <input aria-label={`Jumlah ${line.product.name}`} inputMode="decimal" type="number" min="0.01" step="1" value={line.quantity} onChange={(event) => changeQuantity(line.product.id, Number(event.target.value))} />
                  <button type="button" onClick={() => changeQuantity(line.product.id, line.quantity + 1)} aria-label={`Tambah ${line.product.name}`}>+</button>
                </div>
                <strong>{formatRupiah(line.product.priceRupiah * line.quantity)}</strong>
              </div>
              <button className="remove-button" type="button" onClick={() => setDraft((current) => ({ ...current, lines: current.lines.filter((item) => item.product.id !== line.product.id) }))}>Hapus barang</button>
            </article>
          ))}
        </div>
      </section>
      <section className="form-section two-column" aria-label="Penyesuaian total">
        <MoneyInput label="Diskon (opsional)" value={draft.discountRupiah} onChange={(value) => setDraft((current) => ({ ...current, discountRupiah: value }))} />
        <MoneyInput label="Ongkir (opsional)" value={draft.shippingRupiah} onChange={(value) => setDraft((current) => ({ ...current, shippingRupiah: value }))} />
      </section>
      <section className="invoice-summary" aria-label="Total nota">
        <p><span>Subtotal</span><strong>{formatRupiah(totals.subtotalRupiah)}</strong></p>
        {draft.discountRupiah > 0 && <p><span>Diskon</span><strong>−{formatRupiah(draft.discountRupiah)}</strong></p>}
        {draft.shippingRupiah > 0 && <p><span>Ongkir</span><strong>{formatRupiah(draft.shippingRupiah)}</strong></p>}
        <p className="grand-total"><span>Total</span><strong>{formatRupiah(totals.grandTotalRupiah)}</strong></p>
      </section>
      {error && <div className="error-panel" role="alert"><p>{error}</p><button type="button" onClick={submit}>Coba Lagi</button></div>}
      <button className="button primary sticky-action" type="button" disabled={submitting} onClick={submit}>{submitting ? "Membuat nota…" : "Buat PDF"}</button>
    </main>
  );
}

function MoneyInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const id = label.toLowerCase().replaceAll(/[^a-z]+/gu, "-");
  return <div><label htmlFor={id}>{label}</label><div className="money-input"><span>Rp</span><input id={id} inputMode="numeric" type="number" min="0" step="1000" value={value || ""} placeholder="0" onChange={(event) => onChange(Math.max(0, Math.round(Number(event.target.value) || 0)))} /></div></div>;
}

function CustomerPicker({ selected, onSelect, onBack }: { selected: InvoiceCustomer | null; onSelect: (value: InvoiceCustomer) => void; onBack: () => void }) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const customers = useLoad(listCustomers, search);
  return (
    <main className="app-shell">
      <PageHeader title="Pilih Customer" onBack={onBack} />
      <label htmlFor="customer-search">Cari customer</label><input id="customer-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nama atau nomor WhatsApp" />
      <button className="button secondary" type="button" onClick={() => setCreating((value) => !value)}>{creating ? "Tutup Form" : "+ Tambah Customer Baru"}</button>
      {creating && <InlineCustomerForm onCreated={onSelect} />}
      {customers.loading && <p role="status">Memuat customer…</p>}
      {customers.error && <ErrorRetry message={customers.error} retry={customers.reload} />}
      {!customers.loading && !customers.error && customers.data?.length === 0 && <p className="empty-state">Belum ada customer. Tambahkan customer saat membuat nota.</p>}
      <div className="selection-list">{customers.data?.map((customer) => <button className={selected?.id === customer.id ? "selected" : ""} type="button" key={customer.id} onClick={() => onSelect(customer)}><strong>{customer.name}</strong><small>{customer.whatsappNumber || "Nomor WhatsApp belum diisi"}</small></button>)}</div>
    </main>
  );
}

function InlineCustomerForm({ onCreated }: { onCreated: (customer: InvoiceCustomer) => void }) {
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!name.trim()) { setError("Nama customer wajib diisi."); return; }
    setSaving(true); setError("");
    try { onCreated(await createCustomer({ name: name.trim(), whatsappNumber: phone.trim() })); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Customer belum dapat disimpan."); }
    finally { setSaving(false); }
  }
  return <form className="inline-form" onSubmit={submit}><h2>Customer Baru</h2><label htmlFor="new-customer-name">Nama customer</label><input id="new-customer-name" value={name} onChange={(event) => setName(event.target.value)} required /><label htmlFor="new-customer-phone">Nomor WhatsApp</label><input id="new-customer-phone" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />{error && <p className="error" role="alert">{error}</p>}<button className="button primary" disabled={saving}>{saving ? "Menyimpan…" : "Simpan dan Pilih"}</button></form>;
}

function ProductPicker({ selected, onSelect, onBack }: { selected: Set<string>; onSelect: (value: InvoiceProduct) => void; onBack: () => void }) {
  const [search, setSearch] = useState("");
  const products = useLoad(listProducts, search);
  return <main className="app-shell"><PageHeader title="Pilih Barang" onBack={onBack} /><label htmlFor="product-search">Cari barang</label><input id="product-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nama, ukuran, atau kategori" />{products.loading && <p role="status">Memuat barang…</p>}{products.error && <ErrorRetry message={products.error} retry={products.reload} />}{!products.loading && !products.error && products.data?.length === 0 && <p className="empty-state">Belum ada barang. Tambahkan barang dari menu Daftar Barang.</p>}<div className="product-grid">{products.data?.map((product) => <button type="button" disabled={selected.has(product.id)} className={selected.has(product.id) ? "selected" : ""} key={product.id} onClick={() => onSelect(product)}>{product.imageUrl ? <img src={product.imageUrl} alt="" loading="lazy" decoding="async" /> : <span className="product-placeholder" aria-hidden="true">□</span>}<strong>{product.name}</strong><small>{product.variant || product.category || "Tanpa varian"}</small><b>{formatRupiah(product.priceRupiah)}/{product.unitLabel}</b><em>{selected.has(product.id) ? "Sudah dipilih" : "Pilih barang"}</em></button>)}</div></main>;
}

function InvoiceHistory({ navigate }: { navigate: (route: string) => void }) {
  const [search, setSearch] = useState("");
  const invoices = useLoad(listInvoices, search);
  return <main className="app-shell"><PageHeader title="Nota Sebelumnya" onBack={() => navigate("/")} /><label htmlFor="invoice-search">Cari nota</label><input id="invoice-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nomor nota atau nama customer" />{invoices.loading && <p role="status">Memuat riwayat…</p>}{invoices.error && <ErrorRetry message={invoices.error} retry={invoices.reload} />}{!invoices.loading && !invoices.error && invoices.data?.length === 0 && <p className="empty-state">Belum ada nota penjualan.</p>}<div className="history-list">{invoices.data?.map((invoice) => <InvoiceHistoryCard key={invoice.id} invoice={invoice} onClick={() => navigate(`/invoices/${invoice.id}`)} />)}</div></main>;
}

function InvoiceHistoryCard({ invoice, onClick }: { invoice: InvoiceListItem; onClick: () => void }) {
  return <button type="button" onClick={onClick}><span><strong>{invoice.invoiceNumber}</strong><small>{invoice.customerName} · {invoice.invoiceDate.split("-").reverse().join("/")}</small></span><span><b>{formatRupiah(invoice.grandTotalRupiah)}</b><small>{invoice.status === "cancelled" ? "Dibatalkan" : "Selesai"}</small></span></button>;
}

function InvoiceDetail({ id, navigate }: { id: string; navigate: (route: string) => void }) {
  const invoice = useLoad(getInvoice, id);
  const [actionError, setActionError] = useState("");
  if (invoice.loading) return <main className="app-shell"><PageHeader title="Detail Nota" onBack={() => navigate("/invoices")} /><p role="status">Memuat nota…</p></main>;
  if (invoice.error || !invoice.data) return <main className="app-shell"><PageHeader title="Detail Nota" onBack={() => navigate("/invoices")} /><ErrorRetry message={invoice.error || "Nota tidak ditemukan."} retry={invoice.reload} /></main>;
  const data = invoice.data;
  function duplicate() {
    const draft: Draft = { customer: { id: data.customer.id ?? "", name: data.customer.name, whatsappNumber: data.customer.whatsapp }, invoiceDate: new Date().toISOString().slice(0, 10), discountRupiah: data.discountRupiah, shippingRupiah: data.shippingRupiah, lines: data.items.filter((item) => item.productId).map((item) => ({ product: { id: item.productId!, name: item.productName, category: null, variant: item.variant, unitLabel: item.unitLabel, priceRupiah: item.unitPriceRupiah }, quantity: item.quantity })) };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); navigate("/invoice/new");
  }
  async function cancel() {
    if (!confirm("Batalkan nota ini? Riwayat akan tetap tersimpan.")) return;
    try { invoice.setData(await cancelInvoice(id)); } catch (caught) { setActionError(caught instanceof Error ? caught.message : "Nota belum dapat dibatalkan."); }
  }
  return <main className="app-shell"><PageHeader title={data.invoiceNumber} onBack={() => navigate("/invoices")} /><InvoiceSnapshot invoice={data} />{actionError && <p className="error" role="alert">{actionError}</p>}<PdfActions invoice={data} /><button className="button secondary" type="button" onClick={duplicate}>Duplikat Nota</button>{data.status === "finalized" && <button className="button danger" type="button" onClick={cancel}>Batalkan Nota</button>}</main>;
}

function InvoiceSnapshot({ invoice }: { invoice: FinalizedInvoice }) {
  return <section className="detail-card"><p><span>Customer</span><strong>{invoice.customer.name}</strong></p><p><span>Tanggal</span><strong>{invoice.invoiceDate.split("-").reverse().join("/")}</strong></p><p><span>Status</span><strong>{invoice.status === "cancelled" ? "Dibatalkan" : "Selesai"}</strong></p><div className="detail-items">{invoice.items.map((item) => <p key={item.id}><span>{item.productName}<small>{item.quantity} {item.unitLabel} × {formatRupiah(item.unitPriceRupiah)}</small></span><strong>{formatRupiah(item.lineTotalRupiah)}</strong></p>)}</div><p className="grand-total"><span>Total</span><strong>{formatRupiah(invoice.grandTotalRupiah)}</strong></p><p className="words">{invoice.amountInWords}</p></section>;
}

function InvoiceSuccess({ invoice, navigate }: { invoice: FinalizedInvoice; navigate: (route: string) => void }) {
  return <main className="app-shell success-page"><div className="success-mark" aria-hidden="true">✓</div><h1>Nota berhasil dibuat</h1><p>{invoice.invoiceNumber}</p><InvoiceSnapshot invoice={invoice} /><PdfActions invoice={invoice} autoArchive /><button className="button secondary" type="button" onClick={() => navigate("/")}>Kembali ke Beranda</button></main>;
}

async function pdfBlob(invoice: FinalizedInvoice): Promise<Blob> {
  if (invoice.pdfR2Key) {
    const response = await fetch(`/api/v1/invoices/${encodeURIComponent(invoice.id)}/pdf`, { credentials: "include" });
    if (response.ok) return response.blob();
  }
  const { generateInvoicePdf } = await import("./pdf");
  return new Blob([await generateInvoicePdf(invoice) as BlobPart], { type: "application/pdf" });
}

function PdfActions({ invoice, autoArchive = false }: { invoice: FinalizedInvoice; autoArchive?: boolean }) {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [preview, setPreview] = useState<Blob | null>(null);
  useEffect(() => {
    if (!autoArchive || invoice.pdfR2Key || !navigator.onLine) return;
    let active = true;
    import("./pdf").then(({ generateInvoicePdf }) => generateInvoicePdf(invoice)).then((bytes) => archivePdf(invoice.id, bytes)).catch(() => {
      if (active) setMessage("PDF tersimpan di perangkat, arsip online belum tersimpan. Anda tetap dapat membagikannya.");
    });
    return () => { active = false; };
  }, [autoArchive, invoice]);
  async function share() {
    setBusy(true); setMessage("");
    try {
      const blob = await pdfBlob(invoice); const file = new File([blob], `RiaNoelShop_${invoice.invoiceNumber}.pdf`, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] }) && navigator.share) await navigator.share({ title: invoice.invoiceNumber, text: `Nota ${invoice.invoiceNumber} - Ria Noel Shop`, files: [file] });
      else { download(blob, file.name); setMessage("Perangkat ini belum mendukung berbagi file langsung. PDF sudah diunduh; lampirkan manual di WhatsApp."); }
    } catch (caught) { if ((caught as DOMException)?.name !== "AbortError") setMessage("PDF belum dapat dibagikan. Silakan coba lagi."); }
    finally { setBusy(false); }
  }
  async function showPreview() {
    setBusy(true); try { setPreview(await pdfBlob(invoice)); } catch { setMessage("PDF belum dapat dibuka. Silakan coba lagi."); } finally { setBusy(false); }
  }
  return <section className="pdf-actions" aria-label="PDF nota"><button className="button primary" disabled={busy} type="button" onClick={share}>{busy ? "Menyiapkan PDF…" : "Bagikan PDF"}</button><button className="button secondary" disabled={busy} type="button" onClick={showPreview}>Lihat PDF</button>{message && <p className="notice" role="status">{message}</p>}{preview && <div className="pdf-preview" role="dialog" aria-modal="true" aria-label={`Pratinjau ${invoice.invoiceNumber}`}><Suspense fallback={<p className="notice" role="status">Menyiapkan pratinjau…</p>}><PdfPreview blob={preview} title={invoice.invoiceNumber} /></Suspense><button className="secondary-button" type="button" autoFocus onClick={() => setPreview(null)}>Tutup Pratinjau</button></div>}</section>;
}

function download(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1_000); }

function ErrorRetry({ message, retry }: { message: string; retry: () => unknown }) { return <div className="error-panel" role="alert"><p>{message}</p><button type="button" onClick={retry}>Coba Lagi</button></div>; }
