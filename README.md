# Ria Noel Shop — Coding Agent Handoff

**Project:** WhatsApp-first Invoice PWA  
**Target user:** Owner/operator age 50+  
**Platform:** Mobile-first PWA  
**Deployment:** Cloudflare Workers + Static Assets  
**Frontend:** React + Vite + TypeScript  
**API:** Hono on Cloudflare Workers  
**Database:** Cloudflare D1  
**Object storage:** Cloudflare R2  
**PDF:** deterministic client-side generation with `pdf-lib`  
**Status:** V1 build handoff / source-of-truth package

## Product in one sentence
A very simple mobile PWA that lets Ria Noel Shop create a customer invoice from saved products, generate a lightweight PDF, keep invoice history, and share the PDF through the Android share sheet to WhatsApp.

## Non-negotiable principle
Do not turn this into an ERP, marketplace, accounting suite, or generic admin dashboard. V1 exists to shorten one workflow:

`WhatsApp chat → create invoice → generate PDF → share to WhatsApp`

## Source of truth order
1. `docs/01_PRD.md`
2. `docs/02_SCOPE_AND_BUSINESS_RULES.md`
3. `docs/03_USER_FLOWS.md`
4. `docs/04_UI_UX_AND_DESIGN_SYSTEM.md`
5. `docs/05_TECHNICAL_ARCHITECTURE.md`
6. `database/schema.sql`
7. `api/openapi.yaml`
8. Remaining technical and QA documents

If two documents conflict, use the earlier item in the list above and record the conflict in `docs/15_DECISION_LOG.md` before coding around it.

## Documentation index
| File | Purpose |
|---|---|
| `docs/00_INDEX.md` | Full document map and implementation order |
| `docs/01_PRD.md` | Product requirements and V1 definition |
| `docs/02_SCOPE_AND_BUSINESS_RULES.md` | Locked scope, exclusions, business rules |
| `docs/03_USER_FLOWS.md` | Exact user journeys and states |
| `docs/04_UI_UX_AND_DESIGN_SYSTEM.md` | UX rules for 50+ users, visual and asset rules |
| `docs/05_TECHNICAL_ARCHITECTURE.md` | Cloudflare architecture and runtime responsibilities |
| `docs/06_DATABASE_SPEC.md` | D1 model and data lifecycle |
| `docs/07_API_SPEC.md` | API behavior and contracts |
| `docs/08_PWA_FRONTEND_SPEC.md` | React/Vite PWA requirements |
| `docs/09_PDF_INVOICE_SPEC.md` | PDF layout, calculations, naming, sharing |
| `docs/10_R2_ASSET_STORAGE.md` | Product image and PDF object rules |
| `docs/11_SECURITY_AND_PRIVACY.md` | V1 authentication, sessions, validation |
| `docs/12_QA_AND_ACCEPTANCE.md` | Test scenarios and release gates |
| `docs/13_IMPLEMENTATION_PLAN.md` | Vertical-slice build order |
| `docs/14_CODING_AGENT_INSTRUCTIONS.md` | How the coding agent must execute and report |
| `docs/15_DECISION_LOG.md` | Locked architectural/product decisions |
| `database/schema.sql` | Initial D1 SQL schema |
| `api/openapi.yaml` | API contract starter |
| `config/wrangler.example.jsonc` | Cloudflare binding example |
| `assets/reference/` | Visual references supplied/generated during planning |

## Coding-agent execution rule
Work in vertical slices. Each milestone must finish with:
- changed files;
- commands run;
- test results;
- screenshots or clear manual verification notes for UI;
- known limitations;
- next milestone.

Do not claim a feature is complete without running the relevant checks.

## Implemented milestone

The repository currently implements Milestone 0 and Milestone 1 only:

- React, Vite, and TypeScript mobile-first frontend;
- one Hono Worker for `/api/v1/*` plus Cloudflare Static Assets;
- local/production bindings for D1 (`DB`) and R2 (`FILES`);
- initial D1 migration copied exactly from the locked `database/schema.sql`;
- operator unlock with a signed 30-day session cookie;
- protected API middleware, health probes, login/session/logout;
- Indonesian login and home UI with the three required primary actions;
- PWA manifest and starter icons.

The product, customer, and invoice flows deliberately remain for later milestones. Home actions currently explain that those flows are not available yet instead of pretending they are complete.

## Requirements

- Node.js 22 or newer
- npm
- a Cloudflare account for remote D1/R2 deployment

## Local development

Install dependencies and create local secrets:

```bash
npm install
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` with a private operator passcode and a random `SESSION_SECRET` of at least 32 characters. Then apply the locked schema and start the single Worker deployment:

```bash
npx wrangler d1 migrations apply ria-noel-shop --local
npm run dev
```

Open `http://localhost:8787`. The health endpoint is `GET /api/v1/health`; it returns `ok` only after both the D1 query and R2 probe succeed.

`npm run dev` builds the Vite assets once, then serves them and the API together through Wrangler. Re-run it after frontend source changes.

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm test
```

## Cloudflare resources and secrets

Create one D1 database and one R2 bucket if they do not already exist:

```bash
npx wrangler d1 create ria-noel-shop
npx wrangler r2 bucket create ria-noel-shop-files
```

Replace the placeholder `database_id` in `wrangler.jsonc` with the D1 ID returned by Cloudflare. Keep `config/wrangler.example.jsonc` as the binding reference.

Set both required production secrets interactively; never put their values in source control:

```bash
npx wrangler secret put OPERATOR_PASSCODE
npx wrangler secret put SESSION_SECRET
```

`OPERATOR_PASSCODE` is the unlock code used by the operator. `SESSION_SECRET` signs cookies and must be a random value of at least 32 characters. There are no required non-secret Wrangler variables in Milestone 0/1.

Apply the migration remotely before the first deployment:

```bash
npx wrangler d1 migrations apply ria-noel-shop --remote
npm run build
npx wrangler deploy
```

## Authentication behavior

There is no signup or role system. A correct unlock code produces a signed `HttpOnly`, `Secure`, `SameSite=Lax` cookie with a 30-day lifetime, so the normal browser/PWA reopen flow stays signed in. Logout expires it. Every `/api/v1/*` path except health and login passes through the session middleware; unauthenticated requests receive a JSON `401` response.
