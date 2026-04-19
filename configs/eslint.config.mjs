import { defineConfig } from "eslint/config";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

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
        "brace-style": ["error", "stroustrup", {
            allowSingleLine: false,
        }],
    },
}]);