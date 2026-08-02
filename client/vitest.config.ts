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
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
