import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

/**
 * Two suites, kept apart on purpose (the CI runs each as its own job):
 *
 * - *.unit.test.ts       pure logic — formatters, domain helpers, the month hook.
 * - *.regression.test.tsx components rendered with Mantine, locking in behavior
 *                        people rely on (month navigation, category breakdown).
 *
 * `npm run test:unit` / `npm run test:regression` filter by the name in the path.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{unit,regression}.test.{ts,tsx}'],
      css: false,
    },
  }),
);
