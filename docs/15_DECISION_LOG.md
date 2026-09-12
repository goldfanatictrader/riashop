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
