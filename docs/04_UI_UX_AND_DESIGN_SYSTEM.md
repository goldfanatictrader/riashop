# 04 — UI/UX & Design System

## Design objective
The interface is for a 50+ operator using a phone while simultaneously communicating with customers on WhatsApp. Clarity beats density.

## UX principles
1. One obvious primary action per screen.
2. Large labeled buttons.
3. Minimize typing.
4. Use saved products/customers.
5. Show photos where they improve recognition.
6. Keep important totals visually dominant.
7. Avoid admin-dashboard visual language.
8. Do not hide critical actions behind icon-only controls.

## Main navigation
V1 primary navigation:
- Beranda
- Buat Nota
- Barang
- Nota Sebelumnya

Settings is secondary.

## Typography
Recommended system stack:
`Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

Minimum sizing:
- body: 16–18px;
- input: 18px;
- button: 18–20px;
- section title: 20–24px;
- page title: 24–30px;
- grand total: 24–32px.

Use font weight and spacing before adding extra colors.

## Touch targets
- absolute minimum: 48×48 CSS px;
- preferred: 52–56px high for primary controls;
- quantity stepper buttons >= 48px.

## Color direction
Use colors derived from Ria Noel Shop identity:
- Primary green: deep, readable green for actions.
- Accent orange: highlights and brand accents.
- Red: destructive/error only, except existing `NOEL SHOP` branding.
- Background: white/off-white.
- Text: very dark green/neutral charcoal.

Do not fill the application with gradients. Brand gradients are allowed only in decorative/brand surfaces.

## Suggested tokens
```css
:root {
  --color-primary: #087A45;
  --color-primary-strong: #075F38;
  --color-accent: #F59A23;
  --color-danger: #C73832;
  --color-bg: #FAFAF7;
  --color-surface: #FFFFFF;
  --color-text: #18211C;
  --color-muted: #68736C;
  --color-border: #DCE5DF;
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 18px;
  --shadow-card: 0 2px 12px rgba(0,0,0,.06);
}
```
These are implementation starting values, not permission to redesign the logo.

## Home layout
Order:
1. Small brand/header.
2. Greeting optional.
3. Large **Buat Nota** card/button.
4. Two supporting actions: **Daftar Barang**, **Nota Sebelumnya**.
5. Optional quick help.

Do not show revenue charts or KPIs.

## Product picker
- Search field at top.
- Large category chips.
- 2-column cards on typical mobile widths.
- Photo dominant.
- Name maximum 2–3 lines.
- Size/variant visible.
- Price visible.
- Entire card tappable.
- Selected state unmistakable.

## Invoice editor
Each selected item shows:
- thumbnail;
- product name;
- size/variant;
- price/unit;
- large quantity stepper;
- line total;
- remove action with text or clear trash icon plus accessible label.

The bottom total/action area may be sticky, but must not cover content.

## Forms
- Labels always visible; placeholders are not labels.
- Numeric keyboard for money and phone.
- Currency formatting as user types without destroying cursor behavior.
- Error text directly below field.
- Do not ask for fields that are not used in V1 output.

## Success state
After PDF creation, show a full state rather than a tiny toast:

`✓ Nota berhasil dibuat`

Actions:
- **Kirim via WhatsApp** — primary.
- **Lihat PDF**.
- **Kembali ke Beranda**.

## Accessibility
- WCAG AA contrast for core text/actions.
- Visible focus states.
- Semantic buttons/labels.
- Icons need accessible names.
- Respect `prefers-reduced-motion`.
- Do not convey status by color alone.

## Motion
Minimal only:
- 150–220ms transitions;
- no parallax;
- no decorative looping animation;
- no animation that delays invoice creation.

## Logo rules
Required variants:
- primary transparent;
- horizontal;
- mark/icon;
- white;
- monochrome.

Rules:
- transparent background;
- no added glow/bevel/3D;
- preserve aspect ratio;
- keep clear space;
- app icon uses mark, not the full long logo.

## Product photography rules
- master 1600×1600;
- web 800–1200px WebP;
- 1:1 ratio;
- neutral white/cream background;
- one main product;
- entire ceramic visible;
- product occupies ~70–80% frame;
- soft realistic shadow;
- no embedded price text;
- no large watermark;
- no HDR/glow;
- AI cleanup must not change the actual motif/design.

## Asset formats
- SVG: logo/icons/decorative vector.
- WebP: product photos.
- PNG: raster transparency only when SVG unavailable.
- PDF: invoice.

## Reference assets
See:
- `assets/reference/invoice-reference.jpg`
- `assets/reference/ui-flow-mockup.png`
- `assets/reference/logo-primary-transparent.png`

These are references, not pixel-perfect mandates. Usability and the written specs override decorative elements in mockups.
