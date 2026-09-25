import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: { '@tests': new URL('./tests', import.meta.url).pathname },
  },
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts', 'tests/contract/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'components',
          environment: 'jsdom',
          setupFiles: ['./tests/setup/jsdom.ts'],
          include: [
            'src/**/*.test.tsx',
            'registry/**/*.test.tsx',
            'tests/components/**/*.test.tsx',
          ],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: [
        'src/lib/**/*.ts',
        'src/config/**/*.ts',
        'src/hooks/**/*.ts',
        'src/components/docs/**/*.{ts,tsx}',
        'registry/new-york/**/*.tsx',
      ],
      exclude: [
        'src/components/ui/**',
        'src/lib/gruvbox-theme.ts',
        '**/*.d.ts',
        '**/index.ts',
        '**/meta.ts',
        '**/*.test.{ts,tsx}',
      ],
      thresholds: {
        'src/lib/**': {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90,
        },
        'src/config/**': {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90,
        },
        'src/components/docs/interactive-props-playground/utils.ts': {
          lines: 100,
          functions: 100,
          branches: 95,
          statements: 100,
        },
        'registry/new-york/**': {
          lines: 70,
          functions: 70,
          branches: 60,
          statements: 70,
        },
        // Set just below what the suite actually achieves, so the gate
        // catches a regression rather than merely a collapse.
        lines: 88,
        functions: 85,
        branches: 82,
        statements: 87,
      },
    },
  },
});
