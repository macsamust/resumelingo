# Brand archive — Poly the parrot

Reference-only, not served by the app (this lives outside `client/public/`,
so nothing here is reachable at a URL). Kept so past mascot exploration
isn't lost, and so "why does this look different from that" has an answer.

## `logo-history/`

The five real revisions of the current logo mark, pulled from git history
(each `client/public/brand/parrot-logo*.png` that ever existed — the
`/public` mount doesn't allow overwriting a file in place, so each update
landed as a new filename with the old one deleted separately):

- `parrot-logo.png` — the original, low-res.
- `parrot-logo-2.png` / `parrot-logo-3.png` — an incomplete in-progress
  variant (no crest, no motion lines) that was never a finished design.
- `parrot-logo-4.png` — full design at higher resolution, but its
  semi-transparent edge pixels still carried a leftover white matte
  (visible as a halo on colored backgrounds).
- `parrot-logo-7.png` — **the one actually in production today**
  (`ParrotLogo.tsx`), same artwork as `-4` with that edge-halo defect
  fixed.

## `mascot-explorations-2026-09/`

Sep 2026 — exploring giving Poly a full body/personality for larger
"avatar" moments (empty states, etc.), since the production logo is a
flat head-only mark that reads sparse at large sizes.

- `lively-logo-explorations-4up.jpg` — a 4-panel mood board (hand-drawn
  running pose, glossy 3D head, neon glow, pencil sketch). Reference
  only, not a usable asset on its own.
- `chosen-full-body-wings-spread.jpg` — **the direction that was picked**:
  front-facing, wings spread, standing on two feet, big expressive eyes.
  Processed into a transparent-background production asset at
  `client/public/brand/poly-avatar-1.png` (see `PolyAvatar.tsx`). Note
  this source has a green crest, not the brand's established teal — the
  production asset was recolored to match.
