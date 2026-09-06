import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 1,

  use: {
    trace: 'retain-on-failure'
  },

  /* Run local companion server automatically if not already accessible (disabled in CI) */
  webServer: process.env.CI ? undefined : {
    command: 'docker compose up',
    cwd: __dirname,
    url: 'http://127.0.0.1:3001/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'api-testing',
      testDir: './tests/api',
      dependencies: ['api-smoke-tests'],
    },
    {
      name: 'api-smoke-tests',
      testDir: './tests/api',
      testMatch: ['smokeTest*', 'negativeTest*', 'cacheAndDb*'],
    },
    {
      name: 'example-tests',
      testDir: './tests/api',
      testMatch: 'example*',
    },
    {
      name: 'ui-tests',
      testDir: './tests/ui',
      testMatch: 'smoke*',
      use: {
        defaultBrowserType: 'chromium',
      }
    }
  ],
});
