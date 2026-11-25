import { reactLintPreset } from "@toruslabs/oxlint-config-react";
import { formatPreset } from "@toruslabs/torus-scripts/fmt";
import { libraryPreset } from "@toruslabs/torus-scripts/library";
import { defineConfig } from "vite-plus";

const library = libraryPreset({
  entry: ["src/index.ts", "src/react/wagmi/index.ts", "src/react/solana/index.ts"],
  format: ["esm", "cjs"],
});

const lint = reactLintPreset();

export default defineConfig({
  pack: {
    entry: library.pack.entry,
    dts: library.pack.dts,
    sourcemap: library.pack.sourcemap,
    format: {
      esm: { outDir: "dist/lib.esm" },
      cjs: { outDir: "dist/lib.cjs" },
    },
    outExtensions: () => ({ js: ".js", dts: ".d.ts" }),
    deps: {
      neverBundle: true,
    },
  },
  fmt: {
    ...formatPreset(),
    ignorePatterns: ["demo/**"],
  },
  lint: {
    ...lint,
    ignorePatterns: [...(lint.ignorePatterns ?? []), "**/demo/**"],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
