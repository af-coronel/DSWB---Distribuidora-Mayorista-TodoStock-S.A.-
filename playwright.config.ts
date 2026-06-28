import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  use: {
    baseURL: "http://localhost:3000",
    headless: false,
    viewport: { width: 1280, height: 720 },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npx tsx src/server.ts",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
