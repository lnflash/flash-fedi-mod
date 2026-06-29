import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Dedicated test config. jsdom for component tests; node-env files opt back out
// per-file with a `// @vitest-environment node` pragma if needed.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // clearMocks (not restoreMocks): reset call history between tests but KEEP
    // implementations defined in vi.mock factories (e.g. qrcode.toDataURL).
    clearMocks: true,
  },
});
