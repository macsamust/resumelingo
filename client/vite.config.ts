import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";

/**
 * Embeds the deployed commit's short hash and build date directly into the
 * client bundle, read by Footer.tsx/AdminShell.tsx (CJ, Sep 2026: "when
 * should we start thinking about app versions?" — landed on build-derived
 * identifiers over hand-maintained version numbers, since a git hash can't
 * go stale or be forgotten the way a manual bump can). Falls back to
 * "dev"/build-time-only if git isn't available (e.g. a source-only deploy
 * environment without the .git directory) rather than failing the build.
 */
function gitShortHash(): string {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "dev";
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(gitShortHash()),
    __APP_BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    port: 5173,
    // SEC-A01 (Sep 2026): subscriber auth now rides HttpOnly cookies with
    // SameSite=Lax (see worker/src/utils/authCookies.ts). That works with
    // zero extra config in production (one origin serves both the SPA and
    // /api/*), but local dev normally runs Vite on :5173 against a
    // separate `wrangler dev` on :8787 — a genuinely cross-origin request,
    // which a Lax cookie won't ride along on. Proxying /api through Vite's
    // own dev server makes every request same-origin from the browser's
    // point of view (as far as it's concerned, everything comes from
    // :5173), so the exact same cookie behavior as production just works
    // locally too, without loosening SameSite or touching VITE_API_URL.
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
});
