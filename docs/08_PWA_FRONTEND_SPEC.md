# 08 — PWA Frontend Specification

## Framework
React + Vite + TypeScript.

## Routing
Recommended routes:
- `/login`
- `/`
- `/invoice/new`
- `/invoices`
- `/invoices/:id`
- `/products`
- `/products/new`
- `/products/:id/edit`
- `/settings`

Customer creation may be a sheet/modal inside invoice flow, not necessarily a standalone navigation route.

## State
Prefer simple local/component state plus a small server-state library if needed. Do not introduce Redux unless complexity actually appears.

Suggested:
- TanStack Query for API caching/retries;
- React Hook Form + Zod for forms;
- localStorage/IndexedDB only for transient invoice draft and app preferences.

## Offline policy
V1 is not an offline-first database application.

Must:
- cache app shell;
- keep the current draft locally;
- show connectivity state;
- avoid losing typed work.

May:
- cache recently viewed products/customers.

Must not:
- finalize invoice offline with a guessed invoice number.

## PWA manifest
- name: `Ria Noel Shop`
- short_name: `Ria Noel`
- display: `standalone`
- start_url: `/`
- theme/background colors from brand
- 192 and 512 icons
- maskable 512 icon

## Service worker
Cache:
- hashed JS/CSS;
- static app assets;
- small branding assets.

Do not blindly cache API writes.

## Forms
- `inputmode="numeric"` for money/quantity where appropriate;
- `inputmode="tel"` for WhatsApp;
- autofocus only when it helps, not on every page;
- preserve form when opening picker and returning.

## Product image upload
Client pipeline:
1. user selects/takes image;
2. validate type and size;
3. resize to max practical dimension;
4. convert to WebP where supported;
5. upload;
6. show progress;
7. retain old image until new upload succeeds.

## Sharing PDF
Use:
```ts
navigator.canShare?.({ files: [file] })
navigator.share({
  title: invoiceNumber,
  text: `Nota ${invoiceNumber} - Ria Noel Shop`,
  files: [file],
})
```

If file sharing is unsupported:
- provide **Simpan PDF**;
- show a clear instruction to attach it manually in WhatsApp.

Do not claim the browser can force WhatsApp or a specific chat.

## Loading states
Use skeleton/list loading only where beneficial. For save/finalize actions, use clear button progress such as:
`Membuat nota…`

## Error states
Examples:
- `Koneksi terputus. Nota belum tersimpan.`
- `Foto terlalu besar. Pilih foto lain.`
- `Nomor WhatsApp belum diisi.`

Avoid technical error strings in the UI.
