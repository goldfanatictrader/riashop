# 07 — API Specification

## Base path
`/api/v1`

## Response conventions
Success:
```json
{"data": {}}
```

List:
```json
{"data": [], "meta": {"nextCursor": null}}
```

Error:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data belum lengkap",
    "fields": {}
  }
}
```

## Auth
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/session`

V1 has no public signup.

## Products
- `GET /products?search=&category=&active=1`
- `POST /products`
- `GET /products/:id`
- `PATCH /products/:id`
- `POST /products/:id/deactivate`
- `POST /products/:id/image`

## Customers
- `GET /customers?search=&active=1`
- `POST /customers`
- `GET /customers/:id`
- `PATCH /customers/:id`
- `POST /customers/:id/deactivate`

## Invoices
- `GET /invoices?search=&status=&cursor=`
- `POST /invoices/finalize`
- `GET /invoices/:id`
- `POST /invoices/:id/cancel`
- `POST /invoices/:id/pdf` — optional archive upload/registration route
- `GET /invoices/:id/pdf` — authorized download or object stream

## Finalize invoice request
```json
{
  "customerId": "...",
  "invoiceDate": "2026-09-12",
  "discountRupiah": 0,
  "shippingRupiah": 0,
  "items": [
    {
      "productId": "...",
      "quantity": 6
    }
  ]
}
```

Server behavior:
1. validate customer if provided;
2. load each product;
3. copy snapshot fields and current price;
4. calculate totals on server;
5. atomically assign invoice number;
6. persist invoice/items;
7. return full finalized snapshot used by the browser to render PDF.

Client-supplied totals are ignored as authoritative values.

## Finalize response
```json
{
  "data": {
    "id": "...",
    "invoiceNumber": "RNS-202609-0012",
    "invoiceDate": "2026-09-12",
    "customer": {
      "name": "Ibu Hilda Kusuma Dewi",
      "whatsapp": "628123456789"
    },
    "items": [],
    "subtotalRupiah": 1080000,
    "discountRupiah": 0,
    "shippingRupiah": 0,
    "grandTotalRupiah": 1080000,
    "amountInWords": "Satu Juta Delapan Puluh Ribu Rupiah"
  }
}
```

## Object uploads
Prefer server-mediated upload for V1 simplicity. If direct signed uploads are introduced, preserve authorization and MIME/size validation.

## Validation
Worker is authoritative. Never trust:
- price;
- totals;
- invoice number;
- R2 object key;
- status transitions;
from the browser without validation.

See `../api/openapi.yaml` for starter formal contract.
