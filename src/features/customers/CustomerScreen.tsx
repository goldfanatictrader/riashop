import { useState } from "react";
import { deactivateCustomer } from "./customerApi";
import { InlineCustomerForm } from "./CustomerPicker";
import type { Customer } from "./types";
import { useCustomers } from "./useCustomers";

export function CustomerScreen({ onBack }: { onBack: () => void }) {
  const [search, setSearch] = useState("");
  const { customers, loading, error, reload } = useCustomers({ search });
  const [editing, setEditing] = useState<Customer | null | undefined>(undefined);
  const [notice, setNotice] = useState("");
  async function deactivate(customer: Customer) {
    if (!window.confirm(`Nonaktifkan ${customer.name}? Customer tidak akan muncul saat membuat nota.`)) return;
    try { await deactivateCustomer(customer.id); setNotice("Customer berhasil dinonaktifkan."); await reload(); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : "Customer belum dapat dinonaktifkan."); }
  }
  if (editing !== undefined) return <main className="feature-page"><header className="page-header"><button className="back-button" type="button" onClick={() => setEditing(undefined)}>‹ Batal</button></header><InlineCustomerForm initial={editing ?? undefined} onCancel={() => setEditing(undefined)} onSaved={async () => { setEditing(undefined); setNotice("Customer berhasil disimpan."); await reload(); }} /></main>;
  return <main className="feature-page"><header className="page-header"><button className="back-button" type="button" onClick={onBack}>‹ Kembali</button><h1>Daftar Customer</h1></header><button className="button primary" type="button" onClick={() => setEditing(null)}>+ Tambah Customer</button>{notice && <p className="notice" role="status">{notice}</p>}<label htmlFor="customer-search">Cari customer</label><input id="customer-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nama atau nomor WhatsApp" />{loading && <p role="status">Memuat daftar customer…</p>}{error && <p className="error" role="alert">{error}</p>}{!loading && !customers.length && <p className="empty-state">Belum ada customer. Tambahkan customer saat membuat nota.</p>}<div className="management-list">{customers.map((customer) => <article className={`management-card customer-card${customer.isActive ? "" : " inactive"}`} key={customer.id}><div><h2>{customer.name}</h2><p>{customer.whatsappNumber || "Nomor WhatsApp belum diisi"}</p>{customer.address && <span>{customer.address}</span>}{!customer.isActive && <span className="status-label">Nonaktif</span>}</div><div className="card-actions"><button type="button" onClick={() => setEditing(customer)}>Edit</button>{customer.isActive && <button className="danger-button" type="button" onClick={() => void deactivate(customer)}>Nonaktifkan</button>}</div></article>)}</div></main>;
}
