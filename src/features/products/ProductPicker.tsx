import { useMemo, useState } from "react";
import { productImageUrl } from "./productApi";
import type { Product } from "./types";
import { useProducts } from "./useProducts";
import { EmptyState, Icon, Skeleton } from "../../app/Icons";
import { formatRupiah } from "../../shared/currency";

export function ProductPickerCard({ product, selected = false, onSelect }: {
  product: Product;
  selected?: boolean;
  onSelect: (product: Product) => void;
}) {
  const imageUrl = productImageUrl(product);
  return (
    <button
      className={`picker-card product-picker-card${selected ? " selected" : ""}`}
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(product)}
    >
      <span className="product-photo">
        {imageUrl ? <img src={imageUrl} alt="" loading="lazy" decoding="async" /> : <span aria-hidden="true">Foto belum ada</span>}
      </span>
      <strong>{product.name}</strong>
      {product.variant && <span>{product.variant}</span>}
      <b className="money-value">{formatRupiah(product.priceRupiah)}</b>
      {selected && <em><Icon name="check" /> Dipilih</em>}
    </button>
  );
}

export function ProductPicker({ selectedIds = [], onSelect }: {
  selectedIds?: string[];
  onSelect: (product: Product) => void;
}) {
  const { products, loading, error } = useProducts({ active: true });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const categories = useMemo(() => [...new Set(products.map((item) => item.category).filter(Boolean) as string[])].sort(), [products]);
  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("id-ID");
    return products.filter((item) => (!category || item.category === category)
      && (!term || `${item.name} ${item.variant ?? ""} ${item.category ?? ""}`.toLocaleLowerCase("id-ID").includes(term)));
  }, [category, products, search]);

  return (
    <section className="picker" aria-labelledby="product-picker-title">
      <h2 id="product-picker-title">Pilih Barang</h2>
      <label htmlFor="product-picker-search">Cari nama barang</label>
      <input id="product-picker-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
      {categories.length > 0 && (
        <div className="chip-row" aria-label="Filter kategori">
          <button type="button" className={!category ? "active" : ""} onClick={() => setCategory("")}>Semua</button>
          {categories.map((item) => <button type="button" className={category === item ? "active" : ""} key={item} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
      )}
      {loading && <Skeleton rows={4} />}
      {error && <p className="error" role="alert">{error}</p>}
      {!loading && !error && !visible.length && <EmptyState icon="box">Barang tidak ditemukan.</EmptyState>}
      <div className="picker-grid">
        {visible.map((product) => <ProductPickerCard key={product.id} product={product} selected={selectedIds.includes(product.id)} onSelect={onSelect} />)}
      </div>
    </section>
  );
}
