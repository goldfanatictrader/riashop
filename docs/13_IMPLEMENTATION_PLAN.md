# 13 — Implementation Plan

## Working method
Build vertical slices that produce usable behavior. Do not build every database layer, then every API, then every UI separately without end-to-end verification.

## Milestone 0 — Repository foundation
Deliver:
- Vite React TS app;
- Worker/Hono entry;
- static assets deployment;
- D1 and R2 bindings;
- migrations;
- lint/typecheck/test scripts;
- environment documentation.

Acceptance:
- app loads from local Worker/dev environment;
- `/api/v1/health` responds;
- D1 query works;
- R2 binding test works.

## Milestone 1 — Authentication + shell
Deliver:
- login;
- session cookie;
- protected API middleware;
- home UI;
- PWA manifest/icons starter.

Acceptance:
- unauthenticated user cannot access app data;
- session persists after app reopen;
- home matches UX rules.

## Milestone 2 — Products vertical slice
Deliver:
- product table/API;
- list/search;
- create/edit/deactivate;
- image upload to R2;
- product picker card component.

Acceptance:
- product can be created on phone and appears in picker.

## Milestone 3 — Customers vertical slice
Deliver:
- customer table/API;
- list/search;
- create/edit/deactivate;
- inline customer creation inside invoice draft.

Acceptance:
- new customer becomes selected without losing draft.

## Milestone 4 — Invoice creation
Deliver:
- invoice editor;
- item selection;
- quantity stepper;
- discount/shipping;
- server-calculated finalization;
- atomic invoice number sequence;
- history list/detail.

Acceptance:
- reference invoice totals Rp1.080.000 correctly.

## Milestone 5 — PDF + sharing
Deliver:
- `pdf-lib` generator;
- invoice template;
- Indonesian amount-in-words;
- preview;
- native share;
- fallback download;
- optional R2 archive upload.

Acceptance:
- real Android WhatsApp share flow passes.

## Milestone 6 — PWA resilience
Deliver:
- installability;
- app-shell caching;
- draft persistence;
- connection status;
- error/retry states.

Acceptance:
- temporary network loss does not lose draft.

## Milestone 7 — QA/hardening
Deliver:
- unit/integration tests;
- accessibility pass;
- responsive pass;
- performance review;
- security headers;
- production deployment checklist.

## Do not implement before V1 acceptance
- inventory;
- analytics dashboard;
- accounting;
- direct WhatsApp Business API;
- marketplace sync;
- AI features;
- complex role system.
