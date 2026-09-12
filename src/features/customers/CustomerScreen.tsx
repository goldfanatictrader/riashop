import { useState } from "react";
import { deactivateCustomer } from "./customerApi";
import { InlineCustomerForm } from "./CustomerPicker";
import type { Customer } from "./types";
import { useCustomers } from "./useCustomers";
import { EmptyState, Icon, Skeleton } from "../../app/Icons";

export function CustomerScreen({ onBack }: { onBack: () => void }) {
  const [search, setSearch] = useState("");
  const { customers, loading, loadingMore, error, nextCursor, reload, loadMore } = useCustomers({ search });
  const [editing, setEditing] = useState<Customer | null | undefined>(undefined);
  const [notice, setNotice] = useState("");
  async function deactivate(customer: Customer) {
    if (!window.confirm(`Nonaktifkan ${customer.name}? Customer tidak akan muncul saat membuat nota.`)) return;
    try { await deactivateCustomer(customer.id); setNotice("Customer berhasil dinonaktifkan."); await reload(); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : "Customer belum dapat dinonaktifkan."); }
  }
  if (editing !== undefined) return <main className="feature-page"><header className="page-header"><button className="back-button icon-button" type="button" onClick={() => setEditing(undefined)}><Icon name="back" /> Batal</button></header><InlineCustomerForm initial={editing ?? undefined} onCancel={() => setEditing(undefined)} onSaved={async () => { setEditing(undefined); setNotice("Customer berhasil disimpan."); await reload(); }} /></main>;
  return <main className="feature-page"><header className="page-header"><button className="back-button icon-button" type="button" onClick={onBack}><Icon name="back" /> Kembali</button><h1>Daftar Customer</h1></header><button className="button primary icon-button" type="button" onClick={() => setEditing(null)}><Icon name="plus" /> Tambah Customer</button>{notice && <p className="notice" role="status">{notice}</p>}<label htmlFor="customer-search">Cari customer</label><input id="customer-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nama atau nomor WhatsApp" />{loading && <Skeleton rows={4} />}{error && <p className="error" role="alert">{error}</p>}{!loading && !customers.length && <EmptyState icon="customers">Belum ada customer. Tambahkan customer saat membuat nota.</EmptyState>}<div className="management-list">{customers.map((customer) => <article className={`management-card customer-card${customer.isActive ? "" : " inactive"}`} key={customer.id}><div className="customer-card-info"><h2>{customer.name}</h2><p>{customer.whatsappNumber || "Nomor WhatsApp belum diisi"}</p>{customer.address && <span>{customer.address}</span>}{!customer.isActive && <span className="status-label">Nonaktif</span>}</div><div className="card-actions"><button type="button" onClick={() => setEditing(customer)}>Edit</button>{customer.isActive && <button className="danger-button" type="button" onClick={() => void deactivate(customer)}>Nonaktifkan</button>}</div></article>)}</div>{nextCursor && <div className="list-pagination"><button className="secondary-button" type="button" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? "Memuat customer…" : "Muat lebih banyak"}</button></div>}</main>;
}
