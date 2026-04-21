import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "migrations/**", "generated/**"],
  },
  eslint.configs.recommended,
  {
    files: ["**/*.{mjs,cjs}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: [
      "tests/**/*.ts",
      "vitest.config.ts",
      "migrate-mongo-config.ts",
      "frontend/**/*.ts",
      "scripts/**/*.ts",
    ],
    languageOptions: {
      ...config.languageOptions,
      globals: {
        ...globals.node,
      },
    },
  })),
  ...tseslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: ["src/**/*.ts"],
  })),
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["src/**/*.endpoints.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.object.name='res'][callee.property.name='json']",
          message:
            "Do not call res.json in endpoint handlers — use the `json(status, data)` helper so responses are Zod-validated.",
        },
      ],
    },
  },
  {
    files: ["src/**/*.service.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["express", "express/*"],
              message: "Services must not use Express; return data or throw domain errors only.",
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
);
