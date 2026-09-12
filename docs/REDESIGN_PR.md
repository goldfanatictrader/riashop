# Ria Noel Shop — Creative UI/UX Redesign

## Directions explored

### 1. Pasar Modern

- **Color:** sun-warmed cream, market-sign green, tomato red, and citrus orange.
- **Type voice:** compact, friendly display headings with plainspoken utility text.
- **Signature device:** an orange receipt tab that clips onto sections and actions.
- **Why it is not generic:** it borrows from hand-painted Indonesian shop signage rather than admin dashboards. It was not chosen because the layered signage treatment could become busy across long forms.

### 2. Ceramic Ledger — chosen

- **Color:** porcelain cream (`#FFFDF8`), bottle green (`#08734B` / `#064D35`), clay orange (`#E8891C`), and restrained shop red (`#B43E35`).
- **Type voice:** broad editorial Georgia headings paired with a highly legible local system sans for data entry and totals.
- **Signature device:** the logo's open oval becomes a light brush-sweep around key actions, selected states, success moments, and invoice rules.
- **Why it is not generic:** it combines the calm material quality of ceramics with the order of a shop ledger. Surfaces alternate between open dividers, tinted bands, and a few purposeful containers instead of card-in-card stacks.

**Why chosen:** Ceramic Ledger keeps the source brand's warmth and recognizability while reducing visual noise for a 50+ operator repeating the same phone workflow every day.

## Design system

- **Palette:** porcelain/cream backgrounds, bottle/deep green actions, clay orange emphasis, red reserved for destructive states and the `NOEL SHOP` wordmark.
- **Type scale:** 31–43px editorial page titles, 21–29px section headings, 17–18px inputs and core actions, 14–15px supporting copy.
- **Radii:** 9px utility controls, asymmetric `3px 20–34px 3px 20–34px` branded surfaces, circles for icon wells and quantity controls.
- **Spacing:** a 4px base rhythm expressed primarily as 8, 12, 16, 20, 24, 28, and 40px intervals.
- **Motion:** 160–240ms press, focus, page-entry, and dialog transitions. Quantity icons scale only as feedback; the success check draws in once. All motion collapses under `prefers-reduced-motion`.
- **Icons:** custom inline SVG only, `currentColor`, 24px optical grid, 1.9px rounded strokes, minimum 44–48px interactive targets. No icon fonts, Unicode controls, CDN, or network dependencies.

## Reference mapping

- `ui-current.jpg`: identified the generic stacked-card hierarchy and placeholder brand mark to leave behind; retained the simple primary-action order and large touch targets.
- `ui-flow-mockup.png`: carried forward its warm, WhatsApp-first energy, image-led product picking, strong sticky submit, and plain operator journey without copying its colored tile grid.
- `invoice-reference.jpg`: translated its clear customer band, table hierarchy, emphasized total, generous footer, and green/orange movement into a quieter print-safe ledger.
- `logo-primary-transparent.png`: reconstructed the open oval, green italic `R`, orange script rhythm, and red shop signature as crisp SVG geometry without the raster glow.

## Screenshots

- `docs/screenshots/redesign-login.png`
- `docs/screenshots/redesign-home.png`
- `docs/screenshots/redesign-invoice-editor.png`
- `docs/screenshots/redesign-invoice-success.png`
- `docs/screenshots/redesign-invoice-detail.png`
- `docs/screenshots/redesign-pdf-preview-dialog.png`
- `docs/screenshots/redesign-pdf-invoice.png`

## Reviewer attention

- The reconstructed mark intentionally simplifies the noisy glow and gradient effects of the raster source while preserving its open oval and green/orange/red identity.
- PDF branding is drawn from vector SVG path geometry with `pdf-lib` primitives, avoiding a blurry raster fallback.
- Browser screenshots use deterministic fixture responses at the browser network layer; no backend, API, schema, migration, CSP, or domain behavior was changed.
