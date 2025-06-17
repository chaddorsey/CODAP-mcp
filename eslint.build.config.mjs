import typescriptEslint from "typescript-eslint";
import baseConfig from "./eslint.config.mjs";

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  ...baseConfig,

  {
    files: ["**/*.js", "**/*.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "import/no-unresolved": "off",
      "prefer-rest-params": "off",
      "no-console": "off",
      "no-debugger": "error",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-this-alias": "off",
      "prefer-const": "off",
      "max-len": "off"
    }
  },

  {
    files: ["*.js", "**/*.js"],
    languageOptions: {
      globals: {
        module: "readonly",
        exports: "readonly",
        require: "readonly"
      },
      sourceType: "commonjs"
    }
  }
];

