# 15 — Decision Log

## D-001 — V1 is invoice-first, not commerce-suite
**Status:** Locked  
**Decision:** Build only the workflow required to create and share customer invoices plus minimal supporting product/customer/history management.  
**Reason:** Small business workflow, operator age 50+, avoid unnecessary complexity.

## D-002 — PWA instead of native app
**Status:** Locked  
**Decision:** Mobile-first installable PWA.  
**Reason:** Simple distribution and updates, sufficient for the workflow.

## D-003 — React + Vite + TypeScript, not Next.js
**Status:** Locked  
**Decision:** Use React/Vite/TS.  
**Reason:** No SSR/public SEO requirement; smaller architectural surface.

## D-004 — Single Cloudflare Worker deployment
**Status:** Locked  
**Decision:** Worker serves static frontend and `/api` routes.  
**Reason:** Avoid unnecessary split between Pages and Worker for this small app.

## D-005 — Hono API
**Status:** Locked  
**Decision:** Hono for Worker routing/middleware.

## D-006 — D1 for structured data
**Status:** Locked.

## D-007 — R2 for binary assets
**Status:** Locked  
**Decision:** Product images and optional invoice archive.

## D-008 — No inventory in V1
**Status:** Locked  
**Decision:** Product master has no stock count in V1.

## D-009 — PDF, not invoice image
**Status:** Locked  
**Decision:** Deterministic PDF generated with `pdf-lib`.  
**Reason:** Lighter, sharper, more reliable, easier to share/store.

## D-010 — Native share for WhatsApp
**Status:** Locked  
**Decision:** Web Share API with PDF file, user chooses WhatsApp/chat.  
**Reason:** Browser cannot guarantee a direct attachment to a specific WhatsApp conversation.

## D-011 — No AI in transaction path
**Status:** Locked  
**Decision:** AI is not required for creating invoices, calculations, PDF, or sharing.

## D-012 — Historical snapshot model
**Status:** Locked  
**Decision:** Invoice stores customer/item/price snapshots so later master-data edits do not mutate history.

## D-013 — Authentication remains deliberately small
**Status:** V1 direction  
**Decision:** No public signup; small operator authentication with persistent secure session.  
**Note:** Exact implementation may use signed cookie/session, but must not add external identity complexity unless required.

## D-014 — Stateless signed operator session
**Status:** Chosen for Milestone 1
**Decision:** Successful unlock creates an HMAC-signed, `HttpOnly`, `Secure`, `SameSite=Lax` cookie valid for 30 days. The operator passcode and signing secret are Wrangler secrets; no authentication table is added.
**Reason:** This is the smallest server-authoritative design compatible with a single private operator and persistent app reopen. The in-memory login throttle is intentionally best-effort per Worker isolate; stronger globally durable throttling is deferred unless production risk requires it.

## D-015 — Health verifies required storage bindings
**Status:** Chosen for Milestone 0
**Decision:** `/api/v1/health` executes `SELECT 1` through D1 and a one-object R2 list probe before returning `status: ok`.
**Reason:** A successful response proves both required bindings work instead of only proving that the Worker process started.

## D-016 — Atomic D1 batch for invoice allocation
**Status:** Chosen for Milestone 4
**Decision:** Finalization increments `invoice_sequences`, inserts the invoice from that sequence row, and inserts item snapshots in one D1 batch transaction. Product values are selected again inside the batch, and the transaction aborts if its subtotal differs from server prevalidation.
**Reason:** D1 does not expose a general interactive transaction API. Coupling allocation and persistence inside one transactional batch prevents a browser-generated/racing number and avoids a price/terbilang mismatch during concurrent product edits.

## D-017 — Invoice-local compatibility selectors
**Status:** Chosen for Milestone 4
**Decision:** Until the independently owned product/customer UI lands, invoicing contains thin list/search selectors and one inline customer-create form. They only call the documented shared APIs and accept camelCase or snake_case response fields; they do not expose product/customer management.
**Reason:** This keeps the invoice slice usable standalone without duplicating another agent's screens or data contract.

## D-018 — Best-effort deterministic PDF archive
**Status:** Chosen for Milestone 5
**Decision:** The browser generates the PDF from the finalized snapshot, then attempts a server-mediated R2 archive. Archive failure never rolls back the finalized invoice; history can deterministically regenerate the file.
**Reason:** This follows the locked failure policy while preserving a shareable local result during an R2/network problem.

## D-019 — Product images use validated server-mediated uploads
**Status:** Chosen for Milestone 2
**Decision:** V1 accepts JPEG, PNG, or WebP product-image bodies up to 5 MB through the authenticated Worker. The Worker verifies the declared MIME against file signature bytes, creates an opaque R2 key under `products/{product-id}/`, and updates `image_key` only after the object upload succeeds. Replaced objects are removed best-effort after the new D1 reference is committed.
**Reason:** This keeps object ownership server-authoritative and avoids direct-upload signing complexity while allowing normal phone photos. Preserving an accepted source format avoids server-side image conversion dependencies; client-side WebP compression remains preferred.

## D-020 — Pickers own only transient picker state
**Status:** Chosen for Milestones 2–3
**Decision:** `ProductPicker` and `CustomerPicker` are reusable controlled components. Selection is returned to the embedding invoice editor through callbacks. Inline customer creation changes only picker-local form state and returns the newly persisted customer before closing; it does not navigate or own invoice draft state.
**Reason:** The invoice editor is being built separately. Keeping draft ownership in its parent is the smallest reliable way to preserve selected items and amounts while creating a customer inline.
