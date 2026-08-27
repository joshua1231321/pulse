import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: [".ngrok-free.dev", ".ngrok-free.app", ".ngrok.io"],
    proxy: {
      "/auth": "http://localhost:4000",
      "/api": "http://localhost:4000",
      "/ws": {
        target: "ws://localhost:4000",
        ws: true,
      },
    },
  },
  build: {
    // Keep an eye on bundle size: TanStack + recharts are the heaviest deps.
    sourcemap: false,
  },
});
