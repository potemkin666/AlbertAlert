import globals from "globals";

export default [
  {
    ignores: ["node_modules/**", "data/brialert.sqlite", "live-alerts.json"],
  },
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser,
        L: "readonly",
      },
    },
    rules: {
      "no-undef": "error",
      "no-unreachable": "error",
      "prefer-const": ["error", { destructuring: "all" }],
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["tests/**/*.{js,mjs}"],
    rules: {
      "no-unused-vars": "off",
    },
  },
];
