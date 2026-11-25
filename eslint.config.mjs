import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import { importX } from 'eslint-plugin-import-x';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import projectRules from './config/eslint-rules.mjs';

export default defineConfig([
  globalIgnores(['*.js', '*.json', '**/dist/', '**/.*', 'src/api/generated/']),
  {
    files: ['**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx,vue}'],
    extends: [
      js.configs.recommended,
      ts.configs['flat/recommended'],
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
      vue.configs['flat/recommended'],
      prettier,
    ],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { parser: tsParser, ecmaFeatures: { jsx: true } },
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({ project: fileURLToPath(new URL('./tsconfig.json', import.meta.url)) }),
      ],
      'import-x/ignore': ['node_modules', '\\.(coffee|scss|css|less|hbs|svg|json)$'],
    },
    rules: {
      ...projectRules,
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      'import-x/extensions': [
        'error',
        'ignorePackages',
        {
          js: 'never',
          jsx: 'never',
          ts: 'never',
          tsx: 'never',
        },
      ],
      'vue/comment-directive': 'error',
      'vue/jsx-uses-vars': 'error',
      'vue/custom-event-name-casing': ['error', 'camelCase'],
      'vue/multi-word-component-names': 'off',
      'vue/no-v-text': 'warn',
      'vue/padding-line-between-blocks': 'warn',
      'vue/require-default-prop': 'off',
      'vue/require-direct-export': 'warn',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    },
  },
  {
    files: ['components.d.ts'],
    // The component generator always emits a file-wide disable directive.
    linterOptions: { reportUnusedDisableDirectives: 'off' },
  },
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      'no-new-symbol': 'off',
      'getter-return': 'off',
    },
  },
]);
