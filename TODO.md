# TODO / Future Work

## React Router v6 → v7 upgrade

**Why:** `npm audit` flags `react-router`/`react-router-dom` (moderate — open
redirect via backslash in `<Link>`/`useNavigate`, GHSA-wrjc-x8rr-h8h6). The
patched version is `7.18.0` — a full major-version jump from the `^6.26.1`
currently installed, not a safe drop-in patch, so `npm audit fix` won't
apply it automatically.

**Actual risk today:** low. The bug needs an attacker-controlled path fed
into `<Link>`/`useNavigate`; every route in this app is a static,
app-defined path, not built from unsanitized user input. Real bug, low
practical exploitability here — worth fixing, not urgent.

**Scope, already researched:**
- The app only uses the plain declarative API — `<BrowserRouter>` +
  `<Routes>`/`<Route>` in `main.tsx`/`App.tsx`. No `createBrowserRouter`,
  `RouterProvider`, loaders, actions, or fetchers — so almost all of v7's
  breaking changes (which are about the data-router APIs) don't apply.
- Of the two future flags relevant to a declarative app:
  - `v7_relativeSplatPath` — only matters for nested multi-segment splat
    routes (e.g. `dashboard/*`) with relative links beneath them. This app
    has just one top-level catch-all (`<Route path="*" element={<LandingPage />} />`),
    not nested — unaffected.
  - `v7_startTransition` — only matters if `React.lazy` is used inside a
    component body. Not used anywhere in this app — unaffected.
- Recommended package change: bump `react-router-dom` `^6.26.1` → `^7.x`
  directly (keep the `react-router-dom` package name, don't switch to the
  bare `react-router` package) — v7 still ships `react-router-dom` with
  the same exports (`BrowserRouter`, `Routes`, `Route`, `Link`, `NavLink`,
  `Navigate`, `useNavigate`, `useParams`, `useSearchParams`, `useLocation`),
  so none of the 26 files currently importing from `"react-router-dom"`
  need their imports touched.

**Suggested steps:**
1. Enable both future flags on `<BrowserRouter>` in `main.tsx` while still
   on the latest 6.x — safe, reversible, surfaces any console warnings
   without changing behavior.
2. Fix anything that surfaces.
3. Bump `react-router-dom` to `^7.x`.
4. Manual click-through regression pass (no route/component test coverage
   exists yet, so this is the real check): landing/marketing pages,
   login/signup/forgot-password/reset-password, dashboard (uses
   `useSearchParams`), resume builder + edit, public resume link (all
   three visibility modes), thank-you letter, career coach, every admin
   page, protected-route redirects (logged-out → `/login`, logged-in
   hitting `/login` → dashboard), and the `*` catch-all.

**Known blocker:** couldn't be installed or verified in the Claude sandbox
used to research this (npm registry access blocked there) — needs to
happen in a real dev environment with actual manual testing before it
ships.

---

## Other known open items

- **npm audit — `esbuild`/`vite`/`vitest` chain** (moderate, all three
  packages: client/server/worker): dev/test-tooling only, never ships to
  production. Fix requires `vitest@4.1.10`, a major bump from the current
  `2.1.8` (skips 3.x entirely). Deliberately deferred — would need real
  testing of the whole test suite against v4 before taking it.
