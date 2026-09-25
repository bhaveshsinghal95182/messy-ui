import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierRecommended,
  // pdfjs-dist is ESM-only and touches browser globals (DOMMatrix, Path2D) at
  // module scope, so importing it anywhere Next renders on the server breaks
  // the production build. src/lib/pdf/pdfjs.ts is the single choke point: it
  // loads pdfjs through a dynamic import, and every consumer sits behind
  // `dynamic(..., { ssr: false })`. Type-only imports stay allowed because they
  // are erased before they reach the bundler.
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['src/lib/pdf/pdfjs.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['pdfjs-dist', 'pdfjs-dist/*'],
              allowTypeImports: true,
              message:
                'Import pdf.js through loadPdfjs() in @/lib/pdf/pdfjs instead, so it stays out of the server bundle.',
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Generated output, not source.
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'public/r/**',
  ]),
]);

export default eslintConfig;
