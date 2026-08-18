// CommonJS syntax is required here: backend/package.json sets
// "type": "commonjs", so ESLint loads this file as CommonJS.
// (The frontend uses ESM syntax because its package is "type": "module".)
const js = require("@eslint/js");
const globals = require("globals");
const tseslint = require("typescript-eslint");
const { defineConfig, globalIgnores } = require("eslint/config");

module.exports = defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      // TypeScript sources are authored with ESM import/export syntax,
      // even though tsc emits CommonJS.
      sourceType: "module",
      globals: globals.node,
    },
  },
]);
