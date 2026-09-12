import { FormEvent, useState } from "react";
import { createProduct, deactivateProduct, productImageUrl, updateProduct, uploadProductImage } from "./productApi";
import type { Product } from "./types";
import { useProducts } from "./useProducts";

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export function ProductScreen({ onBack }: { onBack: () => void }) {
  const [search, setSearch] = useState("");
  const { products, loading, error, reload } = useProducts({ search });
  const [editing, setEditing] = useState<Product | null | undefined>(undefined);
  const [notice, setNotice] = useState("");

  async function deactivate(product: Product) {
    if (!window.confirm(`Nonaktifkan ${product.name}? Barang tidak akan muncul saat membuat nota.`)) return;
    try { await deactivateProduct(product.id); setNotice("Barang berhasil dinonaktifkan."); await reload(); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : "Barang belum dapat dinonaktifkan."); }
  }

  if (editing !== undefined) {
    return <ProductForm product={editing} onCancel={() => setEditing(undefined)} onSaved={async () => {
      setEditing(undefined); setNotice("Barang berhasil disimpan dan siap dipilih."); await reload();
    }} />;
  }

  return (
    <main className="feature-page">
      <header className="page-header"><button className="back-button" type="button" onClick={onBack}>‹ Kembali</button><h1>Daftar Barang</h1></header>
      <button className="button primary" type="button" onClick={() => setEditing(null)}>+ Tambah Barang</button>
      {notice && <p className="notice" role="status">{notice}</p>}
      <label htmlFor="product-search">Cari barang</label>
      <input id="product-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nama, kategori, atau ukuran" />
      {loading && <p role="status">Memuat daftar barang…</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {!loading && !products.length && <p className="empty-state">Belum ada barang. Tambahkan barang agar bisa membuat nota.</p>}
      <div className="management-list">
        {products.map((product) => (
          <article className={`management-card${product.isActive ? "" : " inactive"}`} key={product.id}>
            <div className="list-thumbnail">{productImageUrl(product) ? <img src={productImageUrl(product)!} alt="" /> : <span aria-hidden="true">Tanpa foto</span>}</div>
            <div><h2>{product.name}</h2><p>{product.variant || product.category || "Tanpa variasi"}</p><strong>{rupiah.format(product.priceRupiah)} / {product.unitLabel}</strong>{!product.isActive && <span className="status-label">Nonaktif</span>}</div>
            <div className="card-actions"><button type="button" onClick={() => setEditing(product)}>Edit</button>{product.isActive && <button className="danger-button" type="button" onClick={() => void deactivate(product)}>Nonaktifkan</button>}</div>
          </article>
        ))}
      </div>
    </main>
  );
}

function ProductForm({ product, onCancel, onSaved }: { product: Product | null; onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [variant, setVariant] = useState(product?.variant ?? "");
  const [unitLabel, setUnitLabel] = useState(product?.unitLabel ?? "pcs");
  const [price, setPrice] = useState(product ? String(product.priceRupiah) : "");
  const [image, setImage] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setMessage("");
    const priceRupiah = Number(price);
    if (!name.trim() || !Number.isSafeInteger(priceRupiah) || priceRupiah < 0) { setMessage("Isi nama dan harga barang dengan benar."); return; }
    setSaving(true);
    try {
      let saved = product
        ? await updateProduct(product.id, { name, category, variant, unitLabel, priceRupiah })
        : await createProduct({ name, category, variant, unitLabel, priceRupiah });
      if (image) saved = await uploadProductImage(saved.id, image);
      void saved;
      await onSaved();
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Barang belum dapat disimpan."); }
    finally { setSaving(false); }
  }

  return (
    <main className="feature-page"><header className="page-header"><button className="back-button" type="button" onClick={onCancel}>‹ Batal</button><h1>{product ? "Edit Barang" : "Tambah Barang"}</h1></header>
      <form className="feature-form" onSubmit={submit}>
        <label htmlFor="product-name">Nama barang *</label><input id="product-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={160} required />
        <label htmlFor="product-category">Kategori</label><input id="product-category" value={category} onChange={(event) => setCategory(event.target.value)} maxLength={100} />
        <label htmlFor="product-variant">Ukuran / variasi</label><input id="product-variant" value={variant} onChange={(event) => setVariant(event.target.value)} maxLength={120} />
        <label htmlFor="product-unit">Satuan *</label><select id="product-unit" value={unitLabel} onChange={(event) => setUnitLabel(event.target.value)}><option value="pcs">pcs</option><option value="set">set</option><option value="lusin">lusin</option><option value="box">box</option></select>
        <label htmlFor="product-price">Harga rupiah *</label><input id="product-price" type="number" inputMode="numeric" min="0" step="1" value={price} onChange={(event) => setPrice(event.target.value)} required />
        <label htmlFor="product-image">Foto barang (JPEG, PNG, atau WebP; maks. 5 MB)</label><input id="product-image" className="file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] ?? null)} />
        {message && <p className="error" role="alert">{message}</p>}
        <button className="button primary" type="submit" disabled={saving}>{saving ? "Menyimpan…" : "Simpan Barang"}</button>
      </form>
    </main>
  );
}
