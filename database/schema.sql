PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  variant TEXT,
  unit_label TEXT NOT NULL DEFAULT 'pcs',
  price_rupiah INTEGER NOT NULL CHECK (price_rupiah >= 0),
  image_key TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_active_name
  ON products (is_active, name);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  whatsapp_number TEXT,
  address TEXT,
  note TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_active_name
  ON customers (is_active, name);
CREATE INDEX IF NOT EXISTS idx_customers_whatsapp
  ON customers (whatsapp_number);

CREATE TABLE IF NOT EXISTS invoice_sequences (
  year_month TEXT PRIMARY KEY,
  last_sequence INTEGER NOT NULL CHECK (last_sequence >= 0),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  sequence_year_month TEXT NOT NULL,
  sequence_number INTEGER NOT NULL,
  customer_id TEXT,
  customer_name_snapshot TEXT NOT NULL,
  whatsapp_snapshot TEXT,
  invoice_date TEXT NOT NULL,
  subtotal_rupiah INTEGER NOT NULL CHECK (subtotal_rupiah >= 0),
  discount_rupiah INTEGER NOT NULL DEFAULT 0 CHECK (discount_rupiah >= 0),
  shipping_rupiah INTEGER NOT NULL DEFAULT 0 CHECK (shipping_rupiah >= 0),
  grand_total_rupiah INTEGER NOT NULL CHECK (grand_total_rupiah >= 0),
  amount_in_words TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'finalized' CHECK (status IN ('finalized','cancelled')),
  pdf_r2_key TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices (invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices (customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);

CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  product_id TEXT,
  product_name_snapshot TEXT NOT NULL,
  variant_snapshot TEXT,
  unit_label_snapshot TEXT NOT NULL,
  unit_price_rupiah INTEGER NOT NULL CHECK (unit_price_rupiah >= 0),
  quantity REAL NOT NULL CHECK (quantity > 0),
  line_total_rupiah INTEGER NOT NULL CHECK (line_total_rupiah >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice
  ON invoice_items (invoice_id, sort_order);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
