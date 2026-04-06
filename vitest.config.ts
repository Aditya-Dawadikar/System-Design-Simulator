import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['tests/features/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['tests/setup/unit.setup.ts'],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage/unit',
      include: ['src/simulation/**/*.ts', 'src/iac/**/*.ts'],
    },
  },
});
