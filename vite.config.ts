import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// FediMods are static web apps served over HTTPS and loaded in the Fedi webview.
// No proxy, no server secrets — the app talks directly to Flash's GraphQL with the
// user's own auth token.
export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist", sourcemap: true },
  server: { port: 3000, host: true },
  // host:true exposes on the LAN; allowedHosts:true lets a tunnel (cloudflared/ngrok)
  // hostname reach `npm run preview` without a "Blocked request" error.
  preview: { port: 4173, host: true, allowedHosts: true },
});
