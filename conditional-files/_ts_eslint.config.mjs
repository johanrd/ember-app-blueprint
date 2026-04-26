/**
 * Debugging:
 *   https://eslint.org/docs/latest/use/configure/debug
 *  ----------------------------------------------------
 *
 *   Print a file's calculated configuration
 *
 *     npx eslint --print-config path/to/file.js
 *
 *   Inspecting the config
 *
 *     npx eslint --inspect-config
 *
 */
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import globals from 'globals';
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';

import ts from 'typescript-eslint';

import ember from 'eslint-plugin-ember/recommended';
<% if (warpDrive) { %>import WarpDrive from 'eslint-plugin-warp-drive/recommended';
<% } %>
import eslintConfigPrettier from 'eslint-config-prettier';
import qunit from 'eslint-plugin-qunit';
import n from 'eslint-plugin-n';

import babelParserBase from '@babel/eslint-parser/experimental-worker';

// @babel/eslint-parser@7.x uses eslint-scope@5 internally, which predates
// the addGlobals() method ESLint 10 requires on every scope manager.
const babelParser = {
  meta: { name: '@babel/eslint-parser', version: '7.x' },
  parseForESLint(code, options) {
    const result = babelParserBase.parseForESLint(code, options);
    if (result.scopeManager && !result.scopeManager.addGlobals) {
      result.scopeManager.addGlobals = function (names) {
        const globalScope = this.globalScope;
        if (!globalScope) return;
        const namesSet = new Set(names);
        for (const name of names) {
          if (!globalScope.set.has(name)) {
            const variable = {
              name,
              scope: globalScope,
              identifiers: [],
              references: [],
              defs: [],
            };
            globalScope.set.set(name, variable);
            globalScope.variables.push(variable);
          }
        }
        globalScope.through = globalScope.through.filter((ref) => {
          if (!namesSet.has(ref.identifier.name)) return true;
          const variable = globalScope.set.get(ref.identifier.name);
          ref.resolved = variable;
          variable.references.push(ref);
          return false;
        });
      };
    }
    return result;
  },
};

const parserOptions = {
  esm: {
    js: {
      ecmaFeatures: { modules: true },
      ecmaVersion: 'latest',
    },
    ts: {
      projectService: true,
      tsconfigRootDir: dirname(fileURLToPath(import.meta.url)),
    },
  },
};

export default defineConfig([
  globalIgnores(['dist/', 'coverage/', '!**/.*']),
  js.configs.recommended,
  ember.configs.base,
  ember.configs.gjs,
  ember.configs.gts,
  <% if (warpDrive) { %>...WarpDrive,
  <% } %>eslintConfigPrettier,
  /**
   * https://eslint.org/docs/latest/use/configure/configuration-files#configuring-linter-options
   */
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      parser: babelParser,
    },
  },
  {
    files: ['**/*.{js,gjs}'],
    languageOptions: {
      parserOptions: parserOptions.esm.js,
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ['**/*.{ts,gts}'],
    languageOptions: {
      parser: ember.parser,
      parserOptions: parserOptions.esm.ts,
      globals: {
        ...globals.browser,
      },
    },
    extends: [...ts.configs.recommendedTypeChecked, ember.configs.gts],
  },
  {
    ...qunit.configs.recommended,
    files: ['tests/**/*-test.{js,gjs,ts,gts}'],
    plugins: {
      qunit,
    },
  },
  /**
   * CJS node files
   */
  {
    ...n.configs['flat/recommended-script'],
    files: ['**/*.cjs', 'config/**/*.js'],
    plugins: {
      n,
    },

    languageOptions: {
      sourceType: 'script',
      ecmaVersion: 'latest',
      globals: {
        ...globals.node,
      },
    },
  },
  /**
   * ESM node files
   */
  {
    ...n.configs['flat/recommended-module'],
    files: ['**/*.mjs'],
    plugins: {
      n,
    },

    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 'latest',
      parserOptions: parserOptions.esm.js,
      globals: {
        ...globals.node,
      },
    },
  },
]);
