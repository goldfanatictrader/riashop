import { FormEvent, useMemo, useState } from "react";
import { createCustomer, updateCustomer } from "./customerApi";
import type { Customer } from "./types";
import { useCustomers } from "./useCustomers";
import { EmptyState, Icon, Skeleton } from "../../app/Icons";

export function CustomerPicker({ selectedId, onSelect, onClose }: {
  selectedId?: string;
  onSelect: (customer: Customer) => void;
  onClose?: () => void;
}) {
  const { customers, loading, error } = useCustomers({ active: true });
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("id-ID");
    return customers.filter((item) => !term || `${item.name} ${item.whatsappNumber ?? ""}`.toLocaleLowerCase("id-ID").includes(term));
  }, [customers, search]);
  function choose(customer: Customer) { onSelect(customer); onClose?.(); }

  if (creating) return <InlineCustomerForm inlineSelection onCancel={() => setCreating(false)} onCreated={choose} />;
  return (
    <section className="picker" aria-labelledby="customer-picker-title">
      <h2 id="customer-picker-title">Pilih Customer</h2>
      <label htmlFor="customer-picker-search">Cari nama atau WhatsApp</label>
      <input id="customer-picker-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
      <button className="button primary icon-button" type="button" onClick={() => setCreating(true)}><Icon name="plus" /> Tambah Customer Baru</button>
      {loading && <Skeleton />}{error && <p className="error" role="alert">{error}</p>}
      {!loading && !error && !visible.length && <EmptyState icon="customers">Customer tidak ditemukan. Anda dapat menambahkannya di sini.</EmptyState>}
      <div className="customer-picker-list">
        {visible.map((customer) => <button className={`customer-choice${selectedId === customer.id ? " selected" : ""}`} aria-pressed={selectedId === customer.id} type="button" key={customer.id} onClick={() => choose(customer)}><strong>{customer.name}</strong><span>{customer.whatsappNumber || "Nomor WhatsApp belum diisi"}</span>{selectedId === customer.id && <b><Icon name="check" /> Dipilih</b>}</button>)}
      </div>
    </section>
  );
}

function InlineCustomerForm({ initial, onCancel, onCreated, onSaved, inlineSelection = false }: {
  initial?: Customer;
  onCancel: () => void;
  onCreated?: (customer: Customer) => void;
  onSaved?: () => void;
  inlineSelection?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [whatsappNumber, setWhatsappNumber] = useState(initial?.whatsappNumber ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const customer = initial
        ? await updateCustomer(initial.id, { name, whatsappNumber, address, note })
        : await createCustomer({ name, whatsappNumber, address, note });
      onCreated?.(customer); await onSaved?.();
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Customer belum dapat disimpan."); }
    finally { setSaving(false); }
  }
  return <section className="picker"><h2>{initial ? "Edit Customer" : "Tambah Customer"}</h2>{inlineSelection && <p className="helper-copy">Form ini terbuka di layar yang sama, sehingga isi nota tetap tersimpan.</p>}<form className="feature-form" onSubmit={submit}>
    <label htmlFor="inline-customer-name">Nama customer *</label><input id="inline-customer-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={160} required autoFocus />
    <label htmlFor="inline-customer-phone">Nomor WhatsApp</label><input id="inline-customer-phone" type="tel" inputMode="tel" value={whatsappNumber} onChange={(event) => setWhatsappNumber(event.target.value)} placeholder="Contoh: 0812 3456 7890" />
    <label htmlFor="inline-customer-address">Alamat</label><textarea id="inline-customer-address" value={address} onChange={(event) => setAddress(event.target.value)} maxLength={500} />
    <label htmlFor="inline-customer-note">Catatan</label><textarea id="inline-customer-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} />
    {message && <p className="error" role="alert">{message}</p>}<div className="form-actions"><button className="button secondary" type="button" onClick={onCancel}>Batal</button><button className="button primary" type="submit" disabled={saving}>{saving ? "Menyimpan…" : inlineSelection ? "Simpan & Pilih" : "Simpan Customer"}</button></div>
  </form></section>;
}

export { InlineCustomerForm };
