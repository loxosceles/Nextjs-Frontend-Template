import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import nextPlugin from '@next/eslint-plugin-next';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.next/**',
  '**/out/**',
  '**/dist/**',
  '**/build/**',
  '**/cdk.out/**',
  '**/*.d.ts',
  '**/__bak__*/**'
];

const SHARED_RULES = {
  'eol-last': ['error', 'always'],
  'no-console': ['warn', { allow: ['error', 'warn'] }],
  'no-unused-vars': 'off'
};

export default [
  { ignores: IGNORE_PATTERNS },

  // Frontend TypeScript / TSX
  {
    files: ['frontend/**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: path.join(__dirname, 'frontend/tsconfig.json'),
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    plugins: {
      '@next/next': nextPlugin,
      '@typescript-eslint': typescriptEslint,
      import: importPlugin
    },
    settings: {
      next: { rootDir: path.join(__dirname, 'frontend') },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: path.join(__dirname, 'frontend/tsconfig.json')
        }
      }
    },
    rules: {
      ...SHARED_RULES,
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      'import/no-unresolved': 'error'
    }
  },

  // Infrastructure TypeScript
  {
    files: ['infrastructure/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: path.join(__dirname, 'infrastructure/tsconfig.json'),
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    plugins: { '@typescript-eslint': typescriptEslint },
    rules: {
      ...SHARED_RULES,
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'error'
    }
  },

  // Infrastructure CLI — allow console
  {
    files: ['infrastructure/lib/cli/bin/**/*.ts'],
    rules: { 'no-console': 'off' }
  },

  // Plain JS
  {
    files: ['**/*.js'],
    ...js.configs.recommended,
    languageOptions: { globals: { ...globals.node } },
    rules: { ...SHARED_RULES }
  }
];
