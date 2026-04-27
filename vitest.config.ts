import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/index.ts',
        'src/**/types.ts',
        'examples/'
      ],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
      '@core': '/src/core',
      '@storage': '/src/storage',
      '@retrieval': '/src/retrieval',
      '@policies': '/src/policies',
      '@extraction': '/src/extraction',
      '@events': '/src/events',
      '@embedding': '/src/embedding',
      '@llm': '/src/llm',
    },
  },
});
