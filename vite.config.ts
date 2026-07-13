import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// FediMods are static web apps served over HTTPS and loaded in the Fedi webview.
// No proxy, no server secrets — the app talks directly to Flash's GraphQL with the
// user's own auth token.
export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist", sourcemap: true },
  // host:true exposes on the LAN; allowedHosts:true lets a tunnel (cloudflared/ngrok)
  // hostname reach the dev/preview server without a "Blocked request" error.
  //
  // TESTING ONLY proxy: Flash's API uses a CORS origin allowlist, so a browser/webview
  // on a random tunnel origin is blocked. Routing /graphql through the server makes the
  // request same-origin (no CORS); the server-to-server hop isn't subject to CORS. Set
  // VITE_FLASH_API_URL=/graphql (see .env) so the app targets this proxy.
  //
  // Defaults to the TEST API: the API-key feature (FIP-07) is live on TEST first, and
  // the mod mints its key there. Override the upstream with VITE_FLASH_PROXY_TARGET.
  // For PRODUCTION the mod talks to Flash directly — its deployed origin must be added to
  // Flash's CORS allowlist (e.g. host under *.flashapp.me). This proxy does not ship in
  // the static build.
  server: { port: 3000, host: true, proxy: flashProxy() },
  preview: { port: 4173, host: true, allowedHosts: true, proxy: flashProxy() },
});

function flashProxy() {
  // Server-to-server, so no Origin header is needed (the TEST ingress accepts it —
  // proven by the flash-apikey-console Worker, which forwards nothing but the token).
  const target = process.env.VITE_FLASH_PROXY_TARGET ?? "https://api.test.flashapp.me";
  return {
    "/graphql": {
      target,
      changeOrigin: true,
      secure: true,
    },
  };
}
