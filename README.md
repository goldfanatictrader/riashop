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
