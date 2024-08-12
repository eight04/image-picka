import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["dist-extension/*", "build", "chrome"]
  },
  js.configs.recommended,
  {
    "rules": {
      "dot-notation": 2,
      "max-statements-per-line": 2,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        // ...globals.webextensions,
      }
    },
  },
  {
    files: ["test/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.node,
      }
    }
  }
];
