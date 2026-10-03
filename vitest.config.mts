import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": fromRoot("./src"),
      // `server-only` is not a real package here: Next aliases it inside its
      // own bundler. Outside Next it has to resolve to something.
      "server-only": fromRoot("./src/test/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    // Env vars leak between test files otherwise — each file manages its own
    // with vi.stubEnv().
    unstubEnvs: true,
    // next-auth imports "next/server" without the extension, which Node's
    // ESM resolver rejects; inlining lets Vite resolve it instead.
    server: { deps: { inline: ["next-auth", "@auth/core"] } },
  },
});
