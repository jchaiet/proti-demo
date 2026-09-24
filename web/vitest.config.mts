import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],

  resolve: {
    dedupe: ["react", "react-dom"],
  },

  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    clearMocks: true,
    restoreMocks: true,

    server: {
      deps: {
        inline: ["mino-ui"],
      },
    },
  },
});
