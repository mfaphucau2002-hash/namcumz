# UI redesign — 2026-10-02

## Implemented

- Homepage: editorial split hero, game artwork collection, divided service rows, concise order process and support CTA. Removed fabricated counters, reviews and generic repeated promotional cards.
- Top-up catalog: manually controlled artwork banner, four portrait game cards, compact login game list and live catalog loading/error states.
- Top-up detail: native package radio choices, two-column layout with sticky summary, mobile checkout bar, inline field/promo/checkout feedback and accessible FAQ buttons.
- Orders: a single-column list, aligned metadata, readable actual prices, restrained status badges, separate primary/secondary/cancel actions and compact summary.
- Shared design system: `assets/css/design-tokens.css` holds color/type/space/motion values. `ui.css` holds interaction states and app shell components. Landing and top-up layouts remain separate.
- One text font: Be Vietnam Pro. Navy/slate surfaces, 1px low-opacity borders, no decorative gradient/glow styling. Image overlays remain only for legibility.
- Restored mobile order filters; preserved search restoration/autofill guard. Existing form overlays contain keyboard focus and close on Escape. Native workflow dialog focus handling is retained.
- Eight publisher-sourced optimized artwork assets total 712,051 bytes. Sources: `UI_ASSET_SOURCES.md`.

## Verification

- `node _tools/check.cjs`: 45/45 PASS (offline syntax, rendering, escaping and workflow contract regressions).
- `node _tools/build.cjs`: 33 publishable files. `git diff --check`: PASS.
- Browser checks at actual CSS widths 375px, 768px and 1440px: homepage, top-up catalog, order list fixture and login have no document horizontal overflow (12 checks).
- At 375px: top-up detail and summary selection have no overflow; native package selection works; empty account/password/contact produces three inline errors and focuses the first field.
- Local order fixtures: search narrows the displayed list; cancelled items are separated by the existing lifecycle filter; real prices display immediately; workflow prompt is legible and contains focus.
- Fixture pages are under ignored `_backup/source_before_ui_20261002`; they use sample data without a Supabase client and are excluded from the production build.
- Public catalog reads were used for visual inspection. No real order creation, payment, cancellation, completion, credential or role changes were performed.

## Scope limits

This verifies frontend presentation and local behavior. Previously waived full backup/restore and authenticated staging workflow/RLS tests remain waived / not verified. This is not an end-to-end transaction certification or a Core Web Vitals benchmark.

## Release

Commit `6e5f552` was pushed to GitHub main. Vercel deployment `7FvEAdu2EpZ1pwSZBswnwyNjWVNN` is Ready. The production domain https://namcumz.io.vn/ was opened and visibly serves the new storefront, with no broken artwork images. Frontend redesign release is complete.
## Superdesign canvas study — 2026-10-03

- Created canvas project “NAMCUMZ Website Refresh — Current Brand” and imported homepage draft eb55c1b5-2d10-4016-bfb2-b190db2629e7 (v2). Preview: https://p.superdesign.dev/draft/eb55c1b5-2d10-4016-bfb2-b190db2629e7
- The draft uses Tailwind utility classes and the approved uploaded logo/artwork URLs. The rendered preview was inspected; the homepage artwork and styling load. This is a canvas prototype, not a change to the production site.
- Superdesign AI generation is blocked by the team's exhausted credits. No plan upgrade or purchase was made. The remaining nine flow pages have not been imported yet; do not treat the whole-site canvas design as complete.
