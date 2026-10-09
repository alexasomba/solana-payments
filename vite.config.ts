import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    // Vitest v4 compatibility: preserve mock call history.
    // Remove after tests no longer rely on calls from setup or earlier tests.
    // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
    // https://vitest.dev/guide/migration/#clearmocks-is-enabled-by-default
    clearMocks: false,
    environment: "node",
    globals: true,
    include: ["test/**/*.test.ts"],
  },
  pack: {
    entry: ["./src/index.ts"],
    format: ["esm"],
    platform: "node",
    dts: { build: true, incremental: false },
    clean: true,
    tsconfig: "./tsconfig.pack.json",
    deps: {
      resolveDepSubpath: true,
      neverBundle: ["@solana/kit", "@solana-program/token", "@solana-program/memo"],
    },
  },
  run: {
    tasks: {
      "repo:build": {
        command: "vp pack",
        dependsOn: ["typecheck"],
      },
    },
  },
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: ["CHANGELOG.md"],
    endOfLine: "lf",
    semi: true,
    singleQuote: false,
    tabWidth: 2,
    useTabs: false,
    trailingComma: "all",
    printWidth: 100,
    bracketSpacing: true,
    arrowParens: "always",
    insertFinalNewline: true,
    sortImports: {
      customGroups: [
        {
          elementNamePattern: ["@workspace/**"],
          groupName: "@workspace",
        },
      ],
      groups: [
        "builtin",
        "external",
        "@workspace",
        ["internal", "subpath"],
        ["parent", "sibling", "index"],
        "style",
        "unknown",
      ],
      internalPattern: ["@/", "#@/", "~/", "~~/", "#"],
      sortSideEffects: true,
    },
    sortTailwindcss: {
      stylesheet: "./packages/ui/src/styles/globals.css",
      functions: ["cn", "cva"],
    },
    sortPackageJson: true,
  },

  lint: {
    options: { typeAware: true, typeCheck: true },
    categories: {
      correctness: "error",
    },
  },
});
