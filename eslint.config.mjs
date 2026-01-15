import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node, // ✅ Add Node.js globals like __dirname, require, module, etc.
      },
    },
  },
  pluginJs.configs.recommended,
];
