import eslint from '@eslint/js'
import nextPlugin from '@next/eslint-plugin-next'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['.next/**', 'node_modules/**', 'public/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-useless-escape': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'reportUnusedDisableDirectives': 'off',
      'no-warning-comments': 'off',
    },
  },
)
