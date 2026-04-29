import { defineConfig } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";

export default defineConfig([js.configs.recommended,{
    languageOptions: {
        globals: {
            ...globals.browser,
        },
        ecmaVersion: "latest",
        sourceType: "module",
    },
    rules: {
        "no-tabs": ["error", {
            allowIndentationTabs: true,
        }],
        indent: ["error", "tab"],
        "linebreak-style": ["error", "unix"],
        quotes: ["error", "double"],
        semi: ["error", "always"],
        "brace-style": ["error", "stroustrup", { allowSingleLine: false }],
        "no-unused-vars": ["warn", { 
            "argsIgnorePattern": "^_",
            "varsIgnorePattern": "^_",
            "caughtErrorsIgnorePattern": "^_"
        }]
    },
}]);