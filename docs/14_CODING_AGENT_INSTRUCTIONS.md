# 14 — Coding Agent Instructions

## Mission
Implement the Ria Noel Shop V1 exactly as the handoff describes, with minimal guessing and minimal architectural overhead.

## Rule 1 — Audit before code
Before editing:
1. inspect repository state;
2. identify current architecture and conflicts with these docs;
3. produce a short implementation plan for the current milestone;
4. only then modify code.

Do not rewrite functioning project structure without a concrete reason.

## Rule 2 — Source of truth
Use this order:
1. `01_PRD.md`
2. `02_SCOPE_AND_BUSINESS_RULES.md`
3. `03_USER_FLOWS.md`
4. `04_UI_UX_AND_DESIGN_SYSTEM.md`
5. technical specs/schema/API

If implementation requires a decision not covered here:
- choose the smallest solution compatible with V1;
- record it in `15_DECISION_LOG.md`;
- do not silently expand scope.

## Rule 3 — Vertical slices
Each task should create real end-to-end behavior.

Bad:
- create 30 abstractions before one screen works.

Good:
- product create UI → API → D1 → returned product → product list.

## Rule 4 — No fake completion
For every milestone report:
- files changed;
- commands executed;
- lint/typecheck/test results;
- manual UI verification;
- known limitations;
- next step.

Do not say `done` if checks were not run.

## Rule 5 — Preserve simplicity
Reject unnecessary additions such as:
- generic enterprise dashboard;
- multi-role RBAC;
- event bus;
- microservices;
- Redis/Celery;
- server rendering framework;
- unnecessary state management;
- AI generation for invoices;
- extra infrastructure not required by Cloudflare Worker + D1 + R2.

## Rule 6 — UX is a hard requirement
The target operator is 50+.

Before accepting a UI task, verify:
- >= 16px core text;
- >= 48px targets;
- important icons have labels;
- obvious primary action;
- no hidden gesture dependency;
- error copy is understandable Indonesian;
- invoice draft survives navigation.

## Rule 7 — Correctness
Server is authoritative for:
- prices used at finalization;
- totals;
- sequence/invoice number;
- state transition;
- R2 object ownership.

Historical invoices use snapshots.

## Rule 8 — PDF
PDF must be text/vector-driven and deterministic.
Do not screenshot DOM as the primary PDF method.
Do not call image-generation AI.

## Rule 9 — WhatsApp
Use native file sharing. Do not implement an imaginary browser capability that silently attaches a PDF to a chosen WhatsApp chat.

## Rule 10 — Definition of task format
For any backlog expansion, write tasks with:
- objective;
- files/location;
- implementation details;
- interface/contract;
- dependencies;
- acceptance checklist;
- tests.

One task should correspond to one concrete coding outcome.
