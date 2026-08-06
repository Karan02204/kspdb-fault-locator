import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // The codebase deliberately uses `any` for untyped API payloads and
      // React Query callbacks. Keep it as a warning so the linter can be
      // run as a gate without blocking on style.
      '@typescript-eslint/no-explicit-any': 'warn',
      // React 19's lint plugin flags the established pattern of clearing
      // derived state in an effect; it is intentional here.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
