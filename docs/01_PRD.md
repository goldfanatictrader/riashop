# 01 — Product Requirements Document

## 1. Product name
**Ria Noel Shop Invoice PWA**

## 2. Problem
Ria Noel Shop communicates with customers directly through WhatsApp. Invoices are currently created as standalone visual documents, which creates repeated manual work and leaves product/customer/invoice information scattered.

The operator is age 50+, so the product must not require spreadsheet management, technical terminology, complex navigation, or many hidden interactions.

## 3. Product objective
Create the smallest possible tool that makes this daily workflow fast and repeatable:

`customer chat → create invoice → PDF → WhatsApp share`

## 4. Primary user
- Shop owner/operator.
- Primarily mobile Android.
- Age 50+.
- Needs obvious controls, large text, low typing burden, and consistent flows.

## 5. V1 goals
- Create an invoice in under 2 minutes once products/customer already exist.
- Reuse saved products instead of retyping prices.
- Reuse saved customers instead of retyping names/phone numbers.
- Generate a lightweight, deterministic PDF.
- Share the PDF using native mobile sharing, with WhatsApp as the intended destination.
- Keep invoice history so old invoices do not need to be searched from gallery/chat.
- Work as an installable PWA.

## 6. V1 screens
1. Login / unlock.
2. Home.
3. Create Invoice.
4. Product Picker.
5. Customer Picker / Create Customer.
6. Invoice Preview.
7. Products.
8. Product Add/Edit.
9. Invoice History.
10. Invoice Detail.
11. Minimal Settings.

These are functional screens, not separate desktop-style modules.

## 7. Home screen
Primary actions:
- **Buat Nota** — largest action.
- **Daftar Barang**.
- **Nota Sebelumnya**.

Secondary access:
- settings/help icon.

Do not place analytics cards, charts, revenue dashboards, CRM metrics, or inventory KPIs on V1 home.

## 8. Create invoice
Fields/actions:
- customer selection;
- WhatsApp number shown/editable;
- add product;
- product photo, name, size, unit price;
- quantity stepper;
- unit label such as pcs/lusin/set;
- line total;
- discount, optional;
- shipping, optional;
- grand total;
- generate PDF.

Defaults:
- date = today;
- invoice number = automatic;
- prices = product master;
- quantity = 1;
- discount = 0;
- shipping = 0.

## 9. Products
Minimum fields:
- product ID;
- name;
- category;
- size/variant text;
- unit label;
- unit price;
- primary image;
- active/inactive.

V1 does not require stock management.

## 10. Customers
Minimum fields:
- name;
- WhatsApp number;
- optional address/note.

Customer creation must be possible from the invoice flow without leaving the task.

## 11. Invoice history
List shows:
- invoice number;
- date;
- customer;
- grand total;
- status: generated / cancelled.

Actions:
- open;
- regenerate PDF from stored invoice snapshot if archive is unavailable;
- share again;
- duplicate as new invoice;
- cancel, with confirmation.

Editing a finalized invoice in place is not required. Duplicate instead.

## 12. PDF output
The invoice PDF must be:
- text-based, not AI-generated;
- lightweight;
- consistent;
- readable in WhatsApp preview;
- printable;
- based on a fixed Ria Noel Shop template.

See `09_PDF_INVOICE_SPEC.md`.

## 13. WhatsApp behavior
The web platform cannot reliably attach a local PDF directly to a preselected WhatsApp chat without user interaction. V1 therefore uses the native **Web Share API** with the generated PDF file.

Expected behavior on supported Android browsers:
1. Tap **Kirim via WhatsApp**.
2. Native share sheet opens with PDF attached.
3. Operator selects WhatsApp and the target chat.

Do not fake a one-tap direct-send flow that the browser cannot guarantee.

## 14. PWA behavior
- installable to Android home screen;
- standalone display mode;
- branded icon/splash;
- app shell cached;
- network errors shown clearly;
- no requirement for full offline writes in V1.

## 15. Success criteria
- First-time operator understands the home screen without training documentation.
- Existing-customer invoice can be produced in <= 2 minutes.
- No core action depends on reading text smaller than 16px.
- No core action depends on an unlabeled icon.
- PDF opens correctly on Android and common PDF viewers.
- Re-sharing an older invoice works.

## 16. Explicit non-goals
- ERP.
- Accounting.
- Marketplace integration.
- Payment gateway.
- WhatsApp Business API automation.
- Multi-warehouse.
- Stock forecasting.
- Reseller hierarchy.
- Loyalty program.
- Advanced reporting.
- AI assistant/chatbot.
- Public e-commerce checkout.
- Multi-role enterprise RBAC.
