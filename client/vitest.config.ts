import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  // tsconfig keeps JSX for Next to compile, which leaves it unparseable here.
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    alias: {
      "@": `${projectRoot}src`,
      // The real package throws outside a Next build; tests get an empty module.
      "server-only": `${projectRoot}src/test/server-only-stub.ts`,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
